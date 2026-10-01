import { describe, it, expect, vi } from 'vitest';
import app from '../app';
import { serve } from './testRequest';
import { prisma } from '../utils/prisma';
import {
  addWeeklySchedule,
  authHeader,
  createStaffMember,
  createTenant,
  type Tenant,
} from './helpers';

const api = await serve(app);

vi.mock('../services/email.service');

// Frozen clock (setup.ts): 2026-12-01. Tuesday 2026-12-08 is well inside the window.
const DATE = '2026-12-08';

// A shop whose only provider is bookable internally (by the shop's own staff)
// but NOT by customers, with a 09:00–13:00 schedule.
async function internalOnlyShop() {
  const t = await createTenant('Slots');
  await prisma.userShop.update({
    where: { id: t.staff.id },
    data: { bookableByCustomers: false, bookableInternally: true },
  });
  await addWeeklySchedule(t);
  return t;
}

const publicSlots = (t: Tenant, qs: string) =>
  api.get(
    `/public/${t.shop.slug}/slots?date=${DATE}&serviceId=${t.service.id}&${qs}`,
  );
const ownerSlots = (t: Tenant, qs = '', token = t.token) =>
  api
    .get(
      `/api/shops/${t.shop.id}/bookings/slots?date=${DATE}&serviceId=${t.service.id}&${qs}`,
    )
    .set(authHeader(token));

describe('the public slots endpoint never honours `internal`', () => {
  it('unauthenticated internal=true does NOT reveal availability of a provider customers cannot book (explicit staff)', async () => {
    const t = await internalOnlyShop();
    const res = await publicSlots(t, `staffId=${t.staff.id}&internal=true`);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ status: 'closed' });
  });

  it('...nor via "no preference" (the provider works but is internal-only)', async () => {
    const t = await internalOnlyShop();
    const res = await publicSlots(t, 'internal=true');
    expect(res.body.data).toEqual({ status: 'closed' });
  });

  it('internal=true and internal=false return identical public results', async () => {
    const t = await createTenant('Slots');
    await addWeeklySchedule(t);
    const a = await publicSlots(t, `staffId=${t.staff.id}&internal=true`);
    const b = await publicSlots(t, `staffId=${t.staff.id}&internal=false`);
    const c = await publicSlots(t, `staffId=${t.staff.id}`);
    expect(a.body.data.status).toBe('ok');
    expect(a.body.data).toEqual(b.body.data);
    expect(a.body.data).toEqual(c.body.data);
  });
});

describe('GET /api/shops/:shopId/bookings/slots (authenticated owner slots)', () => {
  it('a shop member sees slots for a provider that is bookable internally only', async () => {
    const t = await internalOnlyShop();
    const res = await ownerSlots(t, `staffId=${t.staff.id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('ok');
    expect(res.body.data.slots.map((s: { time: string }) => s.time)).toEqual([
      '09:00',
      '09:30',
      '10:00',
      '10:30',
      '11:00',
      '11:30',
      '12:00',
      '12:30',
    ]);
  });

  it('any member (not only the owner) may call it', async () => {
    const t = await internalOnlyShop();
    const staffer = await createStaffMember(t);
    const res = await ownerSlots(t, `staffId=${t.staff.id}`, staffer.token);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('ok');
  });

  it('requires authentication (401)', async () => {
    const t = await internalOnlyShop();
    const res = await api.get(
      `/api/shops/${t.shop.id}/bookings/slots?date=${DATE}&serviceId=${t.service.id}`,
    );
    expect(res.status).toBe(401);
  });

  it("does not work across tenants: tenant B's member gets 404 for tenant A's shop", async () => {
    const A = await internalOnlyShop();
    const B = await createTenant('Other');
    const res = await ownerSlots(A, `staffId=${A.staff.id}`, B.token);
    expect(res.status).toBe(404);
  });

  it("is scoped to the shop: another tenant's service or staff yields closed", async () => {
    const A = await internalOnlyShop();
    const B = await createTenant('Other');
    await addWeeklySchedule(B);
    const foreignService = await api
      .get(
        `/api/shops/${A.shop.id}/bookings/slots?date=${DATE}&serviceId=${B.service.id}&staffId=${A.staff.id}`,
      )
      .set(authHeader(A.token));
    expect(foreignService.body.data).toEqual({ status: 'closed' });
    const foreignStaff = await ownerSlots(A, `staffId=${B.staff.id}`);
    expect(foreignStaff.body.data).toEqual({ status: 'closed' });
  });

  it('respects active=false and bookableInternally=false', async () => {
    const t = await internalOnlyShop();
    await prisma.userShop.update({
      where: { id: t.staff.id },
      data: { bookableInternally: false },
    });
    expect((await ownerSlots(t, `staffId=${t.staff.id}`)).body.data).toEqual({
      status: 'closed',
    });
    await prisma.userShop.update({
      where: { id: t.staff.id },
      data: { bookableInternally: true, active: false },
    });
    expect((await ownerSlots(t, `staffId=${t.staff.id}`)).body.data).toEqual({
      status: 'closed',
    });
  });

  it('marks booked slots unavailable, exactly like the public endpoint would', async () => {
    const t = await internalOnlyShop();
    await prisma.userShop.update({
      where: { id: t.staff.id },
      data: { bookableByCustomers: true },
    });
    const booked = await api
      .post(`/api/shops/${t.shop.id}/bookings`)
      .set(authHeader(t.token))
      .send({
        name: 'C',
        phone: '6900000001',
        serviceId: t.service.id,
        staffId: t.staff.id,
        startTime: `${DATE}T10:00:00+02:00`,
      });
    expect(booked.status).toBe(201);
    const owner = await ownerSlots(t, `staffId=${t.staff.id}`);
    const pub = await publicSlots(t, `staffId=${t.staff.id}`);
    expect(owner.body.data).toEqual(pub.body.data);
    const ten = owner.body.data.slots.find(
      (s: { time: string }) => s.time === '10:00',
    );
    expect(ten.available).toBe(false);
  });

  it('rejects a malformed date (400) and a missing serviceId (400)', async () => {
    const t = await internalOnlyShop();
    const bad = await api
      .get(
        `/api/shops/${t.shop.id}/bookings/slots?date=2026-12-08T00:00:00Z&serviceId=${t.service.id}`,
      )
      .set(authHeader(t.token));
    expect(bad.status).toBe(400);
    const noService = await api
      .get(`/api/shops/${t.shop.id}/bookings/slots?date=${DATE}`)
      .set(authHeader(t.token));
    expect(noService.status).toBe(400);
  });

  it('is not captured by /:bookingId (the route order is right)', async () => {
    const t = await internalOnlyShop();
    const res = await ownerSlots(t, `staffId=${t.staff.id}`);
    expect(res.body.message).not.toBe('Booking not found');
  });
});

describe('owner slots: a one-off intervalMinutes for this booking', () => {
  const slotsAt = async (t: Tenant, interval: number) => {
    const res = await ownerSlots(
      t,
      `staffId=${t.staff.id}&includeOutsideHours=true&intervalMinutes=${interval}`,
    );
    return res.body.data.slots as {
      time: string;
      offGrid?: boolean;
      outsideHours: boolean;
    }[];
  };

  it('a finer grid lists the extra starts and flags the ones off the shop grid', async () => {
    const t = await internalOnlyShop(); // shop interval 30, hours 09:00-13:00
    const inHours = (await slotsAt(t, 15)).filter((s) => !s.outsideHours);
    expect(inHours.map((s) => s.time).slice(0, 4)).toEqual([
      '09:00',
      '09:15',
      '09:30',
      '09:45',
    ]);
    const flags = Object.fromEntries(inHours.map((s) => [s.time, !!s.offGrid]));
    expect(flags['09:00']).toBe(false);
    expect(flags['09:15']).toBe(true);
    expect(flags['09:30']).toBe(false);
  });

  it('the shop interval itself flags nothing, and the shop setting is unchanged', async () => {
    const t = await internalOnlyShop();
    const inHours = (await slotsAt(t, 30)).filter((s) => !s.outsideHours);
    expect(inHours.some((s) => s.offGrid)).toBe(false);
    const shop = await prisma.shop.findUniqueOrThrow({
      where: { id: t.shop.id },
    });
    expect(shop.slotIntervalMinutes).toBe(30);
  });

  it('rejects an interval that is not one of the allowed options', async () => {
    const t = await internalOnlyShop();
    const res = await ownerSlots(
      t,
      `staffId=${t.staff.id}&includeOutsideHours=true&intervalMinutes=25`,
    );
    expect(res.status).toBe(400);
  });
});
