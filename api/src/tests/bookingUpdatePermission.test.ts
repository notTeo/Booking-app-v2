import { describe, it, expect, vi } from 'vitest';
import app from '../app';
import { serve } from './testRequest';
import { prisma } from '../utils/prisma';
import {
  addManager,
  addWeeklySchedule,
  authHeader,
  createBookingRow,
  createStaffMember,
  createTenant,
} from './helpers';

const api = await serve(app);

vi.mock('../services/email.service');

// Rescheduling (PATCH bookings/:id) is a managing action: the owner and
// managers may move a booking, staff may not, whatever their other
// permissions. Staff still change a booking's status (a separate route).

// Frozen clock (setup.ts): 2026-12-01. Tuesday 2026-12-08, inside 09:00-13:00.
const FROM = '2026-12-08T08:00:00.000Z'; // 10:00 shop time
const TO = '2026-12-08T10:30:00+02:00';

async function setup() {
  const t = await createTenant('Resched');
  await addWeeklySchedule(t);
  const booking = await createBookingRow(t, FROM);
  const patch = (token: string, body: object) =>
    api
      .patch(`/api/shops/${t.shop.id}/bookings/${booking.id}`)
      .set(authHeader(token))
      .send(body);
  const stored = () =>
    prisma.booking.findUniqueOrThrow({ where: { id: booking.id } });
  return { t, booking, patch, stored };
}

describe('PATCH bookings/:id is for the owner and managers only', () => {
  it.each([
    ['staff', false],
    ['staff who may see customer details', true],
  ])('%s get 403 and the booking stays put', async (_l, canView) => {
    const { t, patch, stored } = await setup();
    const staff = await createStaffMember(t, 'Staffer');
    await prisma.userShop.update({
      where: { id: staff.staff.id },
      data: { canViewCustomerDetails: canView },
    });

    for (const body of [{ startTime: TO }, { notes: 'sneaky' }]) {
      const res = await patch(staff.token, body);
      expect(res.status, JSON.stringify(res.body)).toBe(403);
    }
    const row = await stored();
    expect(row.startTime.toISOString()).toBe(FROM);
    expect(row.notes).toBeNull();
  });

  it.each([
    ['the owner', async (t: Awaited<ReturnType<typeof setup>>['t']) => t.token],
    [
      'a manager',
      async (t: Awaited<ReturnType<typeof setup>>['t']) =>
        (await addManager(t)).token,
    ],
  ])('%s can reschedule', async (_l, tokenOf) => {
    const { t, patch, stored } = await setup();
    const res = await patch(await tokenOf(t), { startTime: TO });
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    // The old booking stays at its time as a canceled reference; a new one,
    // linked back to it, holds the new time.
    const old = await stored();
    expect(old.status).toBe('CANCELED');
    expect(old.startTime.toISOString()).toBe(FROM);
    const moved = await prisma.booking.findUniqueOrThrow({
      where: { id: res.body.data.id },
    });
    expect(moved.rescheduledFromId).toBe(old.id);
    expect(moved.startTime.toISOString()).toBe(new Date(TO).toISOString());
    expect(moved.status).toBe('CONFIRMED');
    expect(moved.cancelToken).not.toBe(old.cancelToken);
  });

  it('staff can still change the status', async () => {
    const { t, booking } = await setup();
    const staff = await createStaffMember(t, 'Staffer');
    const res = await api
      .patch(`/api/shops/${t.shop.id}/bookings/${booking.id}/status`)
      .set(authHeader(staff.token))
      .send({ status: 'CONFIRMED' });
    expect(res.status, JSON.stringify(res.body)).toBe(200);
  });
});
