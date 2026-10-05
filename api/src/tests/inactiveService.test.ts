import { describe, it, expect, vi } from 'vitest';
import { randomUUID } from 'crypto';
import app from '../app';
import { serve } from './testRequest';
import { prisma } from '../utils/prisma';
import {
  addService,
  addWeeklySchedule,
  ALL_OVERRIDABLE_RULES,
  authHeader,
  createBookingRow,
  createTenant,
  type Tenant,
} from './helpers';

vi.mock('../services/email.service');

const api = await serve(app);

// Frozen clock (setup.ts): 2026-12-01. Tuesday 2026-12-08 is inside the window.
const DATE = '2026-12-08';
const START = '2026-12-08T10:00:00.000Z';

const deactivate = (serviceId: string) =>
  prisma.service.update({
    where: { id: serviceId },
    data: { isActive: false },
  });

async function shopWithInactiveService() {
  const t = await createTenant('Inactive');
  await addWeeklySchedule(t);
  await deactivate(t.service.id);
  return t;
}

const ownerSlots = (t: Tenant, serviceId: string, qs = '') =>
  api
    .get(
      `/api/shops/${t.shop.id}/bookings/slots?date=${DATE}&serviceId=${serviceId}&staffId=${t.staff.id}${qs}`,
    )
    .set(authHeader(t.token));

describe('an inactive service cannot take NEW bookings', () => {
  it('public create -> 404', async () => {
    const t = await shopWithInactiveService();
    const res = await api.post(`/public/${t.shop.slug}/book`).send({
      name: 'Cust',
      phone: '6900000001',
      serviceId: t.service.id,
      staffId: t.staff.id,
      startTime: START,
    });
    expect(res.status).toBe(404);
    expect(await prisma.booking.count({ where: { shopId: t.shop.id } })).toBe(
      0,
    );
  });

  it('owner create -> 404', async () => {
    const t = await shopWithInactiveService();
    const res = await api
      .post(`/api/shops/${t.shop.id}/bookings`)
      .set(authHeader(t.token))
      .send({
        name: 'Cust',
        phone: '6900000001',
        serviceId: t.service.id,
        staffId: t.staff.id,
        startTime: START,
        overrideRules: ALL_OVERRIDABLE_RULES,
      });
    expect(res.status).toBe(404);
    expect(await prisma.booking.count({ where: { shopId: t.shop.id } })).toBe(
      0,
    );
  });

  it('public slots and owner slots (no booking) are closed', async () => {
    const t = await shopWithInactiveService();
    const pub = await api.get(
      `/public/${t.shop.slug}/slots?date=${DATE}&serviceId=${t.service.id}&staffId=${t.staff.id}`,
    );
    expect(pub.body.data).toEqual({ status: 'closed' });
    expect((await ownerSlots(t, t.service.id)).body.data.status).toBe('closed');
  });

  it('an active service is unaffected', async () => {
    const t = await shopWithInactiveService();
    const active = await addService(t, 30, 'Active');
    expect((await ownerSlots(t, active.id)).body.data.status).toBe('ok');
  });
});

describe('existing bookings on an inactive service stay manageable', () => {
  const patch = (t: Tenant, id: string, body: object) =>
    api
      .patch(`/api/shops/${t.shop.id}/bookings/${id}`)
      .set(authHeader(t.token))
      .send(body);

  it('owner slots for rescheduling (forBookingId) work for its own service only', async () => {
    const t = await shopWithInactiveService();
    const booking = await createBookingRow(t, START);
    const own = await ownerSlots(
      t,
      t.service.id,
      `&forBookingId=${booking.id}`,
    );
    expect(own.body.data.status).toBe('ok');

    // The booking id does not unlock any other inactive service.
    const other = await addService(t, 30, 'Other');
    await deactivate(other.id);
    const res = await ownerSlots(t, other.id, `&forBookingId=${booking.id}`);
    expect(res.body.data.status).toBe('closed');

    // …and another shop's booking id unlocks nothing.
    const t2 = await createTenant('Elsewhere');
    const foreign = await createBookingRow(t2, START);
    const res2 = await ownerSlots(
      t,
      t.service.id,
      `&forBookingId=${foreign.id}`,
    );
    expect(res2.body.data.status).toBe('closed');
  });

  it('reschedule (same serviceId, with or without resending it) works', async () => {
    const t = await shopWithInactiveService();
    const booking = await createBookingRow(t, START);
    const moved = '2026-12-08T11:00:00.000Z';

    const a = await patch(t, booking.id, {
      startTime: moved,
      overrideRules: ALL_OVERRIDABLE_RULES,
    });
    expect(a.status, JSON.stringify(a.body)).toBe(200);
    // Each reschedule replaces the booking, so the second one moves the first
    // one's result.
    const b = await patch(t, a.body.data.id, {
      serviceId: t.service.id,
      startTime: '2026-12-08T12:00:00.000Z',
      overrideRules: ALL_OVERRIDABLE_RULES,
    });
    expect(b.status, JSON.stringify(b.body)).toBe(200);
    expect(
      (
        await prisma.booking.findUniqueOrThrow({
          where: { id: b.body.data.id },
        })
      ).startTime.toISOString(),
    ).toBe('2026-12-08T12:00:00.000Z');
  });

  it('status changes work', async () => {
    const t = await shopWithInactiveService();
    const booking = await createBookingRow(t, START);
    const res = await api
      .patch(`/api/shops/${t.shop.id}/bookings/${booking.id}/status`)
      .set(authHeader(t.token))
      .send({ status: 'COMPLETED' });
    expect(res.status, JSON.stringify(res.body)).toBe(200);
  });

  it('switching a booking TO an inactive service is rejected, booking unchanged', async () => {
    const t = await createTenant('Switch');
    await addWeeklySchedule(t);
    const booking = await createBookingRow(t, START);
    const inactive = await addService(t, 60, 'Gone');
    await deactivate(inactive.id);

    const res = await patch(t, booking.id, {
      serviceId: inactive.id,
      overrideRules: ALL_OVERRIDABLE_RULES,
    });
    expect(res.status).toBe(404);
    expect(
      (await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } }))
        .serviceId,
    ).toBe(t.service.id);
  });

  it("the customer's cancel link still works", async () => {
    const t = await shopWithInactiveService();
    const booking = await createBookingRow(t, START);
    const cancelToken = randomUUID();
    await prisma.booking.update({
      where: { id: booking.id },
      data: { cancelToken },
    });
    const res = await api.post('/public/cancel').send({ token: cancelToken });
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect(
      (await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } }))
        .status,
    ).toBe('CANCELED');
  });
});
