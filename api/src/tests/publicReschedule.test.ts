import { describe, it, expect, vi } from 'vitest';
import { randomUUID } from 'crypto';
import app from '../app';
import { serve } from './testRequest';
import { prisma } from '../utils/prisma';
import {
  addWeeklySchedule,
  authHeader,
  createStaffMember,
  createTenant,
  unique,
  type Tenant,
} from './helpers';
import type { BookingStatus } from '../../dist/generated/prisma';
import {
  sendBookingRescheduledEmail,
  sendBookingRescheduledNotificationEmail,
} from '../services/email.service';

const api = await serve(app);

vi.mock('../services/email.service', () => ({
  sendBookingConfirmationEmail: vi.fn().mockResolvedValue(undefined),
  sendNewBookingNotificationEmail: vi.fn().mockResolvedValue(undefined),
  sendCancellationConfirmationEmail: vi.fn().mockResolvedValue(undefined),
  sendBookingRescheduledEmail: vi.fn().mockResolvedValue(undefined),
  sendBookingRescheduledNotificationEmail: vi.fn().mockResolvedValue(undefined),
}));

// Customers reschedule from the link in their email: the token is the only
// credential, the shop's settings decide whether and until when, and the old
// booking stays behind as a canceled reference that frees its slot.

// Frozen clock (setup.ts): 2026-12-01T09:00Z. Thursday 2026-12-10, shop open
// 09:00-13:00 Europe/Athens (UTC+2).
const DAY = '2026-12-10';
const FROM = '2026-12-10T08:00:00.000Z'; // 10:00 shop time
const TO = '2026-12-10T09:30:00.000Z'; // 11:30 shop time
const SOON = '2026-12-02T08:00:00.000Z'; // 23h from now

async function shop(settings: object = {}) {
  const t = await createTenant('PubResched');
  await addWeeklySchedule(t);
  await prisma.shop.update({ where: { id: t.shop.id }, data: settings });
  return t;
}

async function bookingWith(
  t: Tenant,
  opts: { status?: BookingStatus; start?: string; email?: string } = {},
) {
  const customer = await prisma.customer.create({
    data: {
      shopId: t.shop.id,
      name: 'Cust',
      phone: unique(),
      email: opts.email,
    },
  });
  const startTime = new Date(opts.start ?? FROM);
  const token = randomUUID();
  const booking = await prisma.booking.create({
    data: {
      shopId: t.shop.id,
      customerId: customer.id,
      serviceId: t.service.id,
      staffId: t.staff.id,
      startTime,
      endTime: new Date(startTime.getTime() + 30 * 60_000),
      cancelToken: token,
      notes: 'window seat',
      ...(opts.status && { status: opts.status }),
    },
  });
  return { booking, token };
}

const reschedule = (token: unknown, body: object = { startTime: TO }) =>
  api.post('/public/reschedule').send({ token, ...body });
const lookup = (token: unknown) => api.post('/public/booking').send({ token });
const cancel = (token: unknown) => api.post('/public/cancel').send({ token });
const row = (id: string) => prisma.booking.findUniqueOrThrow({ where: { id } });
const slotAt = async (t: Tenant, time: string, extra = '') => {
  const res = await api.get(
    `/public/${t.shop.slug}/slots?date=${DAY}&staffId=${t.staff.id}&serviceId=${t.service.id}${extra}`,
  );
  expect(res.status, JSON.stringify(res.body)).toBe(200);
  return (res.body.data.slots as { time: string; available: boolean }[]).find(
    (s) => s.time === time,
  );
};

describe('POST /public/reschedule', () => {
  it('creates a new linked booking and leaves the old one as a canceled reference', async () => {
    const t = await shop();
    await prisma.userShop.update({
      where: { id: t.staff.id },
      data: { email: 'owner@example.com' },
    });
    const { booking, token } = await bookingWith(t, { email: 'c@example.com' });

    const res = await reschedule(token);
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect(res.body.data.startTime).toBe(TO);
    // Anonymous caller: the new link only ever travels by email.
    expect(JSON.stringify(res.body)).not.toContain('cancelToken');

    const old = await row(booking.id);
    expect(old.status).toBe('CANCELED');
    expect(old.startTime.toISOString()).toBe(FROM);

    const moved = await row(res.body.data.id);
    expect(moved.rescheduledFromId).toBe(booking.id);
    expect(moved.status).toBe('CONFIRMED');
    expect(moved.customerId).toBe(booking.customerId);
    expect(moved.serviceId).toBe(booking.serviceId);
    expect(moved.notes).toBe('window seat');
    expect(moved.endTime.toISOString()).toBe('2026-12-10T10:00:00.000Z');
    expect(moved.cancelToken).toBeTruthy();
    expect(moved.cancelToken).not.toBe(token);

    await vi.waitFor(() => {
      expect(sendBookingRescheduledEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'c@example.com',
          cancelToken: moved.cancelToken,
          startTime: moved.startTime,
          previousStartTime: old.startTime,
        }),
      );
      expect(sendBookingRescheduledNotificationEmail).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'owner@example.com' }),
      );
    });
  });

  it('frees the old time: it shows as available and can be booked again', async () => {
    const t = await shop();
    const { token } = await bookingWith(t);
    expect((await slotAt(t, '10:00'))?.available).toBe(false);

    expect((await reschedule(token)).status).toBe(200);
    expect((await slotAt(t, '10:00'))?.available).toBe(true);
    expect((await slotAt(t, '11:30'))?.available).toBe(false);

    const again = await api.post(`/public/${t.shop.slug}/book`).send({
      name: 'Someone Else',
      phone: '6900000001',
      serviceId: t.service.id,
      staffId: t.staff.id,
      startTime: FROM,
    });
    expect(again.status, JSON.stringify(again.body)).toBe(201);
  });

  it('can move to another team member customers may book', async () => {
    const t = await shop();
    const other = await createStaffMember(t, 'Other');
    await addWeeklySchedule(t, { staffId: other.staff.id });
    const { token } = await bookingWith(t);

    const res = await reschedule(token, {
      startTime: FROM,
      staffId: other.staff.id,
    });
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect((await row(res.body.data.id)).staffId).toBe(other.staff.id);
  });

  it('refuses a team member customers may not book', async () => {
    const t = await shop();
    const other = await createStaffMember(t, 'Hidden');
    await addWeeklySchedule(t, { staffId: other.staff.id });
    await prisma.userShop.update({
      where: { id: other.staff.id },
      data: { bookableByCustomers: false },
    });
    const { booking, token } = await bookingWith(t);

    const res = await reschedule(token, {
      startTime: TO,
      staffId: other.staff.id,
    });
    expect(res.status).toBe(400);
    expect((await row(booking.id)).status).toBe('CONFIRMED');
  });

  it('is refused when the shop turned the feature off', async () => {
    const t = await shop({ customerRescheduleEnabled: false });
    const { booking, token } = await bookingWith(t);
    const res = await reschedule(token);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('RESCHEDULE_DISABLED');
    expect((await row(booking.id)).status).toBe('CONFIRMED');
  });

  it('locks inside the shop cutoff, and a cutoff of 0 allows it until the start', async () => {
    const locked = await shop({ rescheduleCutoffHours: 24 });
    const a = await bookingWith(locked, { start: SOON });
    const res = await reschedule(a.token);
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('RESCHEDULE_WINDOW_CLOSED');
    expect((await row(a.booking.id)).status).toBe('CONFIRMED');

    const open = await shop({ rescheduleCutoffHours: 0 });
    const b = await bookingWith(open, { start: SOON });
    expect((await reschedule(b.token)).status).toBe(200);
  });

  it.each([
    ['COMPLETED', 'BOOKING_COMPLETED'],
    ['CANCELED', 'BOOKING_ALREADY_CANCELED'],
    ['NO_SHOW', 'BOOKING_NO_SHOW'],
  ] as const)('refuses a %s booking', async (status, code) => {
    const t = await shop();
    const { token } = await bookingWith(t, { status });
    const res = await reschedule(token);
    expect(res.status).toBe(409);
    expect(res.body.code).toBe(code);
    expect(await prisma.booking.count({ where: { shopId: t.shop.id } })).toBe(
      1,
    );
  });

  it('refuses a taken slot and leaves the booking where it was', async () => {
    const t = await shop();
    await bookingWith(t, { start: TO });
    const { booking, token } = await bookingWith(t);
    const res = await reschedule(token);
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('SLOT_TAKEN');
    expect((await row(booking.id)).status).toBe('CONFIRMED');
  });

  it('applies the public booking rules with no override', async () => {
    const t = await shop();
    const { booking, token } = await bookingWith(t);
    const res = await reschedule(token, {
      startTime: '2026-12-10T05:00:00.000Z', // 07:00, before opening
      overrideRules: ['OUTSIDE_OPENING_HOURS'],
    });
    expect(res.status).toBe(422);
    expect((await row(booking.id)).status).toBe('CONFIRMED');
  });

  it('refuses a request that changes nothing', async () => {
    const t = await shop();
    const { token } = await bookingWith(t);
    const res = await reschedule(token, { startTime: FROM });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('BOOKING_UNCHANGED');
  });

  it('the old link stops working once the booking has moved', async () => {
    const t = await shop();
    const { token } = await bookingWith(t);
    expect((await reschedule(token)).status).toBe(200);

    for (const res of [
      await reschedule(token, { startTime: '2026-12-10T10:00:00.000Z' }),
      await cancel(token),
    ]) {
      expect(res.status).toBe(409);
      expect(res.body.code).toBe('BOOKING_RESCHEDULED');
    }
    // Still exactly one live booking for the customer.
    expect(
      await prisma.booking.count({
        where: { shopId: t.shop.id, status: 'CONFIRMED' },
      }),
    ).toBe(1);
  });

  it('rejects unknown and malformed tokens', async () => {
    expect((await reschedule(randomUUID())).status).toBe(404);
    const bad = await reschedule('nope');
    expect(bad.status).toBe(400);
    expect(bad.body.code).toBe('INVALID_RESCHEDULE_REQUEST');
  });
});

describe('POST /public/cancel honours the shop cutoff', () => {
  it('locks inside the cutoff and allows it with a cutoff of 0', async () => {
    const locked = await shop({ cancelCutoffHours: 24 });
    const a = await bookingWith(locked, { start: SOON });
    const res = await cancel(a.token);
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('CANCEL_WINDOW_CLOSED');
    expect((await row(a.booking.id)).status).toBe('CONFIRMED');

    const open = await shop({ cancelCutoffHours: 0 });
    const b = await bookingWith(open, { start: SOON });
    expect((await cancel(b.token)).status).toBe(200);
  });
});

describe('POST /public/booking', () => {
  it('describes the booking and what the customer may still do', async () => {
    const t = await shop({ cancelCutoffHours: 2, rescheduleCutoffHours: 24 });
    const { booking, token } = await bookingWith(t, { start: SOON });
    const res = await lookup(token);
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect(res.body.data).toMatchObject({
      id: booking.id,
      status: 'CONFIRMED',
      shop: { slug: t.shop.slug, timezone: t.shop.timezone },
      service: { id: t.service.id },
      staff: { id: t.staff.id },
      rescheduledTo: null,
      cancel: { allowed: true, reason: null, cutoffHours: 2 },
      reschedule: {
        allowed: false,
        reason: 'RESCHEDULE_WINDOW_CLOSED',
        cutoffHours: 24,
      },
    });
    expect(JSON.stringify(res.body)).not.toContain(token);
  });

  it('says where a rescheduled booking went', async () => {
    const t = await shop();
    const { token } = await bookingWith(t);
    await reschedule(token);
    const res = await lookup(token);
    expect(res.body.data.rescheduledTo).toEqual({ startTime: TO });
    expect(res.body.data.cancel.reason).toBe('BOOKING_RESCHEDULED');
    expect(res.body.data.reschedule.reason).toBe('BOOKING_RESCHEDULED');
  });

  it('rejects unknown and malformed tokens', async () => {
    expect((await lookup(randomUUID())).status).toBe(404);
    expect((await lookup('nope')).status).toBe(400);
  });
});

describe('GET /public/:slug/slots with a rescheduleToken', () => {
  it("does not let the customer's own booking block its slot", async () => {
    const t = await shop();
    const { token } = await bookingWith(t);
    expect((await slotAt(t, '10:00'))?.available).toBe(false);
    expect(
      (await slotAt(t, '10:00', `&rescheduleToken=${token}`))?.available,
    ).toBe(true);
  });

  it("ignores another shop's token", async () => {
    const t = await shop();
    const other = await shop();
    await bookingWith(t);
    const foreign = await bookingWith(other);
    expect(
      (await slotAt(t, '10:00', `&rescheduleToken=${foreign.token}`))
        ?.available,
    ).toBe(false);
  });
});

describe('the old half of a reschedule on the owner side', () => {
  const patchStatus = (t: Tenant, id: string, status: string) =>
    api
      .patch(`/api/shops/${t.shop.id}/bookings/${id}/status`)
      .set(authHeader(t.token))
      .send({ status });

  it('cannot be re-opened, and both halves list their link', async () => {
    const t = await shop();
    const { booking, token } = await bookingWith(t);
    const moved = (await reschedule(token)).body.data.id as string;

    const res = await patchStatus(t, booking.id, 'CONFIRMED');
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('BOOKING_RESCHEDULED');
    // The new booking is an ordinary one.
    expect((await patchStatus(t, moved, 'COMPLETED')).status).toBe(200);

    const list = await api
      .get(`/api/shops/${t.shop.id}/bookings?date=${DAY}`)
      .set(authHeader(t.token));
    const byId = Object.fromEntries(
      (list.body.data as { id: string }[]).map((b) => [b.id, b]),
    );
    expect(byId[booking.id]).toMatchObject({
      status: 'CANCELED',
      rescheduledTo: { id: moved, startTime: TO },
    });
    expect(byId[moved]).toMatchObject({
      rescheduledFrom: { id: booking.id, startTime: FROM },
    });
  });

  it.each(['COMPLETED', 'CANCELED', 'NO_SHOW'] as const)(
    'an owner cannot reschedule a %s booking either',
    async (status) => {
      const t = await shop();
      const { booking } = await bookingWith(t, { status });
      const res = await api
        .patch(`/api/shops/${t.shop.id}/bookings/${booking.id}`)
        .set(authHeader(t.token))
        .send({ startTime: TO });
      expect(res.status).toBe(409);
      expect(res.body.code).toBe('BOOKING_NOT_RESCHEDULABLE');
      expect((await row(booking.id)).startTime.toISOString()).toBe(FROM);
    },
  );

  it('an owner is not bound by the customer cutoff', async () => {
    const t = await shop({ rescheduleCutoffHours: 168 });
    const { booking } = await bookingWith(t, { start: SOON });
    const res = await api
      .patch(`/api/shops/${t.shop.id}/bookings/${booking.id}`)
      .set(authHeader(t.token))
      .send({ startTime: '2026-12-02T09:00:00.000Z' });
    expect(res.status, JSON.stringify(res.body)).toBe(200);
  });
});

describe('shop settings for customer changes', () => {
  const patchShop = (t: Tenant, body: object) =>
    api.patch(`/api/shops/${t.shop.id}`).set(authHeader(t.token)).send(body);

  it('default to rescheduling on with one hour of notice', async () => {
    const t = await createTenant('Defaults');
    expect(t.shop).toMatchObject({
      customerRescheduleEnabled: true,
      cancelCutoffHours: 1,
      rescheduleCutoffHours: 1,
    });
  });

  it('are saved by the owner', async () => {
    const t = await createTenant('Policy');
    const res = await patchShop(t, {
      customerRescheduleEnabled: false,
      cancelCutoffHours: 0,
      rescheduleCutoffHours: 48,
    });
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect(
      await prisma.shop.findUniqueOrThrow({ where: { id: t.shop.id } }),
    ).toMatchObject({
      customerRescheduleEnabled: false,
      cancelCutoffHours: 0,
      rescheduleCutoffHours: 48,
    });
  });

  it.each([
    { cancelCutoffHours: -1 },
    { cancelCutoffHours: 169 },
    { rescheduleCutoffHours: 1.5 },
    { customerRescheduleEnabled: 'maybe' },
  ])('reject %o', async (body) => {
    const t = await createTenant('PolicyBad');
    expect((await patchShop(t, body)).status).toBe(400);
  });
});
