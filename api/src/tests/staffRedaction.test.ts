import { describe, it, expect, vi } from 'vitest';
import { serve } from './testRequest';
import { prisma } from '../utils/prisma';
import {
  addWeeklySchedule,
  authHeader,
  createStaffMember,
  createTenant,
} from './helpers';
import { loadApp } from './routeRegistry';

vi.mock('../services/email.service');

// A staff member whose canViewCustomerDetails is false must never receive a
// customer's name, phone or email from any route, and may not edit them. The
// API is the only real boundary: the UI merely hides what the API sends.

const { app } = await loadApp();
const api = await serve(app);

const SECRET = {
  name: 'Secret Person',
  phone: '6955555555',
  email: 'secret.person@example.com',
};

async function setup() {
  const t = await createTenant('Redact');
  await addWeeklySchedule(t);
  const hidden = await createStaffMember(t, 'Hidden');
  await prisma.userShop.update({
    where: { id: hidden.staff.id },
    data: { canViewCustomerDetails: false },
  });
  const visible = await createStaffMember(t, 'Visible');
  await prisma.userShop.update({
    where: { id: visible.staff.id },
    data: { canViewCustomerDetails: true },
  });
  const customer = await prisma.customer.create({
    data: { shopId: t.shop.id, notes: 'likes tea', ...SECRET },
  });
  const start = new Date('2027-07-01T09:00:00.000Z');
  const booking = await prisma.booking.create({
    data: {
      shopId: t.shop.id,
      customerId: customer.id,
      serviceId: t.service.id,
      staffId: t.staff.id,
      startTime: start,
      endTime: new Date(start.getTime() + 30 * 60 * 1000),
    },
  });
  const base = `/api/shops/${t.shop.id}`;
  return { t, hidden, visible, customer, booking, base };
}
type Ctx = Awaited<ReturnType<typeof setup>>;

const leaks = (body: unknown) => {
  const text = JSON.stringify(body);
  return Object.values(SECRET).filter((v) => text.includes(v));
};

const asHidden = (c: Ctx) => authHeader(c.hidden.token);

// Each read or write that returns a customer, as a request against `c`.
const ROUTES: [
  string,
  (
    c: Ctx,
    h: Record<string, string>,
  ) => PromiseLike<{ status: number; body: unknown }>,
][] = [
  ['GET bookings (list)', (c, h) => api.get(`${c.base}/bookings`).set(h)],
  [
    'GET bookings/:id',
    (c, h) => api.get(`${c.base}/bookings/${c.booking.id}`).set(h),
  ],
  ['GET bookings/stats', (c, h) => api.get(`${c.base}/bookings/stats`).set(h)],
  // PATCH bookings/:id is not here: staff get 403 before any customer is
  // read (bookingUpdatePermission.test.ts), and managers always see contacts.
  [
    'PATCH bookings/:id/status',
    (c, h) =>
      api
        .patch(`${c.base}/bookings/${c.booking.id}/status`)
        .set(h)
        .send({ status: 'CONFIRMED' }),
  ],
  ['GET customers (list)', (c, h) => api.get(`${c.base}/customers`).set(h)],
  [
    'GET customers/:id',
    (c, h) => api.get(`${c.base}/customers/${c.customer.id}`).set(h),
  ],
  [
    'PATCH customers/:id (notes only)',
    (c, h) =>
      api
        .patch(`${c.base}/customers/${c.customer.id}`)
        .set(h)
        .send({ notes: 'new note' }),
  ],
  ['GET /api/shops/upcoming', (_c, h) => api.get('/api/shops/upcoming').set(h)],
  [
    'POST bookings (the customer already exists)',
    (c, h) =>
      api.post(`${c.base}/bookings`).set(h).send({
        name: 'Someone Else',
        phone: SECRET.phone,
        serviceId: c.t.service.id,
        staffId: c.t.staff.id,
        startTime: '2026-12-08T10:00:00+02:00',
      }),
  ],
];

describe.each(ROUTES)('%s', (_label, call) => {
  it('hides name, phone and email from a staff member without permission', async () => {
    const c = await setup();
    const res = await call(c, asHidden(c));

    expect(res.status, JSON.stringify(res.body)).toBeLessThan(300);
    expect(leaks(res.body), 'leaked fields').toEqual([]);
  });

  it('still shows them to the owner and to staff with permission (the control)', async () => {
    const c = await setup();
    for (const [who, token] of [
      ['owner', c.t.token],
      ['visible staff', c.visible.token],
    ] as const) {
      const fresh = await setup();
      const res = await call(
        fresh,
        authHeader(token === c.t.token ? fresh.t.token : fresh.visible.token),
      );
      expect(res.status, `${who}: ${JSON.stringify(res.body)}`).toBeLessThan(
        300,
      );
      // Booking creation echoes only the booking; every other route echoes the customer.
      if (!_label.startsWith('POST bookings'))
        expect(leaks(res.body).length, who).toBeGreaterThan(0);
    }
  });
});

describe('redacted customers are marked, not just blanked', () => {
  it('the list and detail carry contactHidden and empty fields', async () => {
    const c = await setup();
    const list = await api.get(`${c.base}/customers`).set(asHidden(c));
    expect(list.body.data.items[0]).toMatchObject({
      name: '',
      phone: '',
      email: null,
      contactHidden: true,
    });
    const booking = await api
      .get(`${c.base}/bookings/${c.booking.id}`)
      .set(asHidden(c));
    expect(booking.body.data.customer).toMatchObject({
      contactHidden: true,
      name: '',
    });
  });
});

describe('editing contact details', () => {
  const patch = (c: Ctx, token: string, body: object) =>
    api
      .patch(`${c.base}/customers/${c.customer.id}`)
      .set(authHeader(token))
      .send(body);

  it.each([
    ['name', { name: 'Hijacked' }],
    ['phone', { phone: '6999999999' }],
    ['email', { email: 'hijack@example.com' }],
    ['all three', { name: 'H', phone: '6999999999', email: 'h@example.com' }],
  ])(
    'staff without permission cannot change %s: 403 and nothing written',
    async (_l, body) => {
      const c = await setup();
      const res = await patch(c, c.hidden.token, body);

      expect(res.status).toBe(403);
      const row = await prisma.customer.findUniqueOrThrow({
        where: { id: c.customer.id },
      });
      expect(row).toMatchObject(SECRET);
    },
  );

  it('a contact change smuggled in beside a note is still refused', async () => {
    const c = await setup();
    const res = await patch(c, c.hidden.token, { notes: 'ok', name: 'Sneaky' });

    expect(res.status).toBe(403);
    const row = await prisma.customer.findUniqueOrThrow({
      where: { id: c.customer.id },
    });
    expect(row.name).toBe(SECRET.name);
    expect(row.notes).toBe('likes tea');
  });

  it('staff without permission may still edit notes', async () => {
    const c = await setup();
    const res = await patch(c, c.hidden.token, { notes: 'allergic to nuts' });

    expect(res.status).toBe(200);
    const row = await prisma.customer.findUniqueOrThrow({
      where: { id: c.customer.id },
    });
    expect(row.notes).toBe('allergic to nuts');
    expect(row).toMatchObject(SECRET);
  });

  it.each([
    ['owner', (c: Ctx) => c.t.token],
    ['staff with permission', (c: Ctx) => c.visible.token],
  ])('%s can change contact details', async (_l, tokenOf) => {
    const c = await setup();
    const res = await patch(c, tokenOf(c), { name: 'Renamed Person' });

    expect(res.status).toBe(200);
    expect(
      (
        await prisma.customer.findUniqueOrThrow({
          where: { id: c.customer.id },
        })
      ).name,
    ).toBe('Renamed Person');
  });
});

describe('customer search by someone who cannot see names or phones', () => {
  const search = (c: Ctx, token: string, term: string) =>
    api
      .get(`${c.base}/customers?search=${encodeURIComponent(term)}`)
      .set(authHeader(token));

  // A hit would confirm the term, so a phone or name could be recovered one
  // character at a time. Matching and non-matching terms must look the same.
  it.each([
    SECRET.phone,
    SECRET.phone.slice(0, 4),
    SECRET.name,
    'Secret',
    'no-such-customer',
  ])('"%s" finds nothing', async (term) => {
    const c = await setup();
    const res = await search(c, c.hidden.token, term);

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ items: [], total: 0 });
  });

  it('the unfiltered list still shows their (redacted) customers', async () => {
    const c = await setup();
    const res = await api.get(`${c.base}/customers`).set(asHidden(c));

    expect(res.body.data.total).toBe(1);
    expect(leaks(res.body)).toEqual([]);
  });

  it.each([
    ['owner', (c: Ctx) => c.t.token],
    ['staff with permission', (c: Ctx) => c.visible.token],
  ])('%s can still search by phone and by name', async (_l, tokenOf) => {
    const c = await setup();
    for (const term of [SECRET.phone.slice(0, 4), 'Secret']) {
      const res = await search(c, tokenOf(c), term);
      expect(res.body.data.total, term).toBe(1);
      expect(res.body.data.items[0].phone, term).toBe(SECRET.phone);
    }
  });
});

describe('booking for a customer who already exists', () => {
  const book = (c: Ctx, token: string) =>
    api.post(`${c.base}/bookings`).set(authHeader(token)).send({
      name: 'Someone Else',
      phone: SECRET.phone,
      email: 'someone.else@example.com',
      serviceId: c.t.service.id,
      staffId: c.t.staff.id,
      startTime: '2026-12-08T10:00:00+02:00',
    });
  const stored = (c: Ctx) =>
    prisma.customer.findUniqueOrThrow({ where: { id: c.customer.id } });

  it('staff without permission: booked, customer unchanged, response redacted', async () => {
    const c = await setup();
    const res = await book(c, c.hidden.token);

    expect(res.status).toBe(201);
    expect(await stored(c)).toMatchObject(SECRET);
    expect(res.body.data.customerId).toBe(c.customer.id);
    expect(res.body.data.customer).toMatchObject({
      name: '',
      phone: '',
      email: null,
      contactHidden: true,
    });
    expect(JSON.stringify(res.body)).not.toContain(SECRET.email);
    expect(JSON.stringify(res.body)).not.toContain('someone.else@example.com');
  });

  it.each([
    ['owner', (c: Ctx) => c.t.token],
    ['staff with permission', (c: Ctx) => c.visible.token],
  ])(
    '%s may still correct the name and email on the way',
    async (_l, tokenOf) => {
      const c = await setup();
      const res = await book(c, tokenOf(c));

      expect(res.status).toBe(201);
      expect(await stored(c)).toMatchObject({
        name: 'Someone Else',
        phone: SECRET.phone,
        email: 'someone.else@example.com',
      });
      expect(res.body.data.customer.contactHidden).toBe(false);
    },
  );

  it('the confirmation email still goes to the real customer when the response is redacted', async () => {
    const email = await import('../services/email.service');
    const c = await setup();
    vi.mocked(email.sendBookingConfirmationEmail).mockClear();
    await book(c, c.hidden.token);

    expect(email.sendBookingConfirmationEmail).toHaveBeenCalledTimes(1);
    expect(
      vi.mocked(email.sendBookingConfirmationEmail).mock.calls[0][0],
    ).toMatchObject({ email: SECRET.email, customerName: SECRET.name });
  });
});

describe('a shop tells the caller whether they may see customer details', () => {
  it('true for the owner and permitted staff, false otherwise', async () => {
    const c = await setup();
    for (const [token, expected] of [
      [c.t.token, true],
      [c.visible.token, true],
      [c.hidden.token, false],
    ] as const) {
      const one = await api.get(c.base).set(authHeader(token));
      expect(one.body.data.canViewCustomerDetails).toBe(expected);
      const list = await api.get('/api/shops').set(authHeader(token));
      expect(list.body.data[0].canViewCustomerDetails).toBe(expected);
    }
  });
});
