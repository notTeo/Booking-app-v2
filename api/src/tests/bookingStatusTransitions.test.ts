import { describe, it, expect, vi } from 'vitest';
import { serve } from './testRequest';
import { prisma } from '../utils/prisma';
import { authHeader, createBookingRow, createTenant } from './helpers';
import { loadApp } from './routeRegistry';

vi.mock('../services/email.service');

// Booking status has NO transition rules: an owner or staff member may move a
// booking from any status to any other (e.g. COMPLETED back to PENDING). This
// is intentional for now, so the front desk can undo a mis-click; see
// docs/decisions/booking-status-transitions.md. The one constraint is the
// slot: moving from CANCELED/NO_SHOW back to a status that holds the provider's
// time re-checks for an overlap (overlapIntegrity.test.ts covers that fully).
//
// This file documents the behaviour. If transition rules are introduced, it is
// the test that should change.

const { app } = await loadApp();
const api = await serve(app);

const STATUSES = [
  'PENDING',
  'CONFIRMED',
  'COMPLETED',
  'CANCELED',
  'NO_SHOW',
] as const;
type Status = (typeof STATUSES)[number];

const pairs = STATUSES.flatMap((from) =>
  STATUSES.map((to) => [from, to] as const),
);

describe('booking status: any status may follow any other', () => {
  it.each(pairs)('%s -> %s is accepted', async (from, to) => {
    const t = await createTenant('Transitions');
    const booking = await createBookingRow(t, '2027-07-01T09:00:00.000Z', from);

    const res = await api
      .patch(`/api/shops/${t.shop.id}/bookings/${booking.id}/status`)
      .set(authHeader(t.token))
      .send({ status: to });

    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect(res.body.data.status).toBe(to);
    expect(
      (await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } }))
        .status,
    ).toBe(to);
  });

  it('only real statuses are accepted', async () => {
    const t = await createTenant('Transitions');
    const booking = await createBookingRow(t);
    for (const status of ['DONE', 'confirmed', '', null, 7]) {
      const res = await api
        .patch(`/api/shops/${t.shop.id}/bookings/${booking.id}/status`)
        .set(authHeader(t.token))
        .send({ status });
      expect(res.status, String(status)).toBe(400);
    }
    expect(
      (await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } }))
        .status,
    ).toBe('CONFIRMED');
  });

  it.each([
    ['CANCELED', 'CONFIRMED'],
    ['NO_SHOW', 'COMPLETED'],
  ] as [Status, Status][])(
    'the exception: %s -> %s is refused when the slot was taken meanwhile',
    async (from, to) => {
      const t = await createTenant('Transitions');
      const freed = await createBookingRow(t, '2027-07-01T09:00:00.000Z', from);
      await createBookingRow(t, '2027-07-01T09:00:00.000Z');

      const res = await api
        .patch(`/api/shops/${t.shop.id}/bookings/${freed.id}/status`)
        .set(authHeader(t.token))
        .send({ status: to });

      expect(res.status).toBe(409);
      expect(res.body.code).toBe('SLOT_TAKEN');
      expect(
        (await prisma.booking.findUniqueOrThrow({ where: { id: freed.id } }))
          .status,
      ).toBe(from);
    },
  );
});
