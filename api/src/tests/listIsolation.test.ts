import { describe, it, expect, vi } from 'vitest';
import { serve } from './testRequest';
import { prisma } from '../utils/prisma';
import { authHeader, createStaffMember, createTenant } from './helpers';
import { loadApp } from './routeRegistry';

vi.mock('../services/email.service');

// Two shops with overlapping data (a shared name fragment) and one-sided
// markers. Whatever a list route filters on (search, status, date, staffId),
// Shop A's callers must only ever see Shop A's rows, and the counts/totals
// must not include Shop B's.

const { app } = await loadApp();
const api = await serve(app);

const SHARED = 'Shared';

async function shopWithData(label: string, customerCount: number) {
  const t = await createTenant(label);
  const staff = await createStaffMember(t, `${label}Staff`);
  const extraService = await prisma.service.create({
    data: {
      shopId: t.shop.id,
      name: `${label}-Extra`,
      duration: 45,
      price: 3000,
    },
  });
  const customers = [];
  const bookings = [];
  for (let i = 0; i < customerCount; i++) {
    const customer = await prisma.customer.create({
      data: {
        shopId: t.shop.id,
        name: i === 0 ? `${SHARED} ${label}` : `${label}Customer${i}`,
        phone: `69${label === 'Alpha' ? '1' : '2'}00000${i}0`,
      },
    });
    const start = new Date(Date.UTC(2027, 6, 1 + i, 9, 0));
    bookings.push(
      await prisma.booking.create({
        data: {
          shopId: t.shop.id,
          customerId: customer.id,
          serviceId: t.service.id,
          staffId: t.staff.id,
          startTime: start,
          endTime: new Date(start.getTime() + 30 * 60 * 1000),
        },
      }),
    );
    customers.push(customer);
  }
  return { t, staff, extraService, customers, bookings };
}

type Data = Awaited<ReturnType<typeof shopWithData>>;

// Everything that identifies a row of this shop: ids and the visible names.
const fingerprints = (d: Data) => [
  d.t.shop.id,
  d.t.shop.name,
  d.t.staff.id,
  d.staff.staff.id,
  d.t.service.id,
  d.extraService.id,
  d.extraService.name,
  ...d.customers.flatMap((c) => [c.id, c.phone]),
  ...d.customers.map((c) => c.name).filter((n) => !n.includes(SHARED)),
  ...d.bookings.map((b) => b.id),
];

const get = (path: string, token: string) =>
  api.get(path).set(authHeader(token));

const ids = (rows: { id: string }[]) => rows.map((r) => r.id).sort();

async function setup() {
  const a = await shopWithData('Alpha', 2);
  const b = await shopWithData('Beta', 4);
  const bPrints = fingerprints(b);
  const noLeak = (res: { body: unknown }, label: string) => {
    const text = JSON.stringify(res.body);
    for (const p of bPrints)
      expect(text, `${label} leaked ${p}`).not.toContain(p);
  };
  // The owner and an active staff member both see the same shop-wide lists.
  const callers = [
    ['owner', a.t.token],
    ['staff', a.staff.token],
  ] as const;
  return { a, b, noLeak, callers };
}

describe('bookings list', () => {
  it('returns only the shop’s own bookings, whatever the filters', async () => {
    const { a, b, noLeak, callers } = await setup();
    const base = `/api/shops/${a.t.shop.id}/bookings`;

    for (const [who, token] of callers) {
      const all = await get(base, token);
      expect(all.status).toBe(200);
      expect(ids(all.body.data), who).toEqual(ids(a.bookings));
      noLeak(all, `${who} unfiltered`);

      // Filters that point at Shop B's data find nothing in Shop A.
      const byForeignStaff = await get(
        `${base}?staffId=${b.t.staff.id}`,
        token,
      );
      expect(byForeignStaff.body.data, who).toEqual([]);

      const byDate = await get(`${base}?date=2027-07-02`, token);
      expect(ids(byDate.body.data), who).toEqual([a.bookings[1].id]);
      noLeak(byDate, `${who} by date`);

      const byStatus = await get(`${base}?status=CONFIRMED`, token);
      expect(ids(byStatus.body.data), who).toEqual(ids(a.bookings));
      noLeak(byStatus, `${who} by status`);
    }
  });

  it('stats count and list only the shop’s own bookings', async () => {
    const { a, noLeak, callers } = await setup();
    for (const [who, token] of callers) {
      const res = await get(`/api/shops/${a.t.shop.id}/bookings/stats`, token);
      expect(res.status).toBe(200);
      expect(res.body.data.upcomingCount, who).toBe(a.bookings.length);
      expect(ids(res.body.data.upcoming), who).toEqual(ids(a.bookings));
      noLeak(res, `${who} stats`);
    }
  });
});

describe('customers list', () => {
  it('lists only the shop’s customers, with an honest total', async () => {
    const { a, noLeak, callers } = await setup();
    const base = `/api/shops/${a.t.shop.id}/customers`;
    for (const [who, token] of callers) {
      const res = await get(base, token);
      expect(res.status).toBe(200);
      expect(ids(res.body.data.items), who).toEqual(ids(a.customers));
      expect(res.body.data.total, who).toBe(a.customers.length);
      noLeak(res, who);
    }
  });

  it('search never reaches into another shop, by name or by phone', async () => {
    const { a, b, noLeak, callers } = await setup();
    const base = `/api/shops/${a.t.shop.id}/customers`;
    const search = (term: string, token: string) =>
      get(`${base}?search=${encodeURIComponent(term)}`, token);

    for (const [who, token] of callers) {
      // A term that matches a customer in both shops returns only Shop A's.
      const shared = await search(SHARED, token);
      expect(ids(shared.body.data.items), who).toEqual([a.customers[0].id]);
      expect(shared.body.data.total, who).toBe(1);
      noLeak(shared, `${who} shared term`);

      // Terms that only match Shop B's customers find nothing.
      for (const term of [
        b.customers[1].name,
        b.customers[1].phone,
        b.customers[1].phone.slice(0, 6),
        'BetaCustomer',
      ]) {
        const res = await search(term, token);
        expect(res.status, `${who} ${term}`).toBe(200);
        expect(res.body.data.items, `${who} ${term}`).toEqual([]);
        expect(res.body.data.total, `${who} ${term}`).toBe(0);
      }
    }
  });

  it('pagination totals do not include the other shop', async () => {
    const { a, callers } = await setup();
    const [, token] = callers[0];
    const res = await get(
      `/api/shops/${a.t.shop.id}/customers?limit=1&page=2`,
      token,
    );
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.total).toBe(a.customers.length);
  });
});

describe('services, team and shops lists', () => {
  it('services: only the shop’s own', async () => {
    const { a, noLeak, callers } = await setup();
    for (const [who, token] of callers) {
      const res = await get(`/api/shops/${a.t.shop.id}/services`, token);
      expect(res.status).toBe(200);
      expect(ids(res.body.data), who).toEqual(
        ids([a.t.service, a.extraService]),
      );
      noLeak(res, who);
    }
  });

  it('team: only the shop’s own members', async () => {
    const { a, noLeak, callers } = await setup();
    for (const [who, token] of callers) {
      const res = await get(`/api/shops/${a.t.shop.id}/team`, token);
      expect(res.status).toBe(200);
      expect(ids(res.body.data), who).toEqual(ids([a.t.staff, a.staff.staff]));
      noLeak(res, who);
    }
  });

  it('a member’s service list holds only that shop’s services', async () => {
    const { a, noLeak, callers } = await setup();
    // Give Shop A's staff member both of A's services.
    await prisma.staffService.createMany({
      data: [a.t.service, a.extraService].map((s) => ({
        userShopId: a.staff.staff.id,
        serviceId: s.id,
      })),
    });
    for (const [who, token] of callers) {
      const res = await get(
        `/api/shops/${a.t.shop.id}/team/${a.staff.staff.id}/services`,
        token,
      );
      expect(res.status).toBe(200);
      const text = JSON.stringify(res.body);
      expect(text, who).toContain(a.t.service.id);
      expect(text, who).toContain(a.extraService.id);
      noLeak(res, who);
    }
  });

  it('GET /api/shops lists only the caller’s own shops', async () => {
    const { a, b, noLeak, callers } = await setup();
    for (const [who, token] of callers) {
      const res = await get('/api/shops', token);
      expect(res.status).toBe(200);
      const text = JSON.stringify(res.body);
      expect(text, who).toContain(a.t.shop.id);
      expect(text, who).not.toContain(b.t.shop.id);
      noLeak(res, who);
    }
  });
});

// Sanity: the harness itself must be able to see a leak.
describe('the leak detector', () => {
  it('fails on a response that contains the other shop’s data', async () => {
    const { b, noLeak } = await setup();
    expect(() =>
      noLeak({ body: { items: [{ id: b.customers[0].id }] } }, 'planted'),
    ).toThrow();
  });
});
