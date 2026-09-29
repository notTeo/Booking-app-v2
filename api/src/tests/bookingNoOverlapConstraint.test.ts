import { describe, it, expect } from 'vitest';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import {
  isExclusionViolation,
  serializableTransaction,
} from '../utils/serializable';
import { createBookingRow, createTenant } from './helpers';
import type { BookingStatus } from '../../dist/generated/prisma';

// The database itself must refuse overlapping slot-holding bookings for one
// provider, even when the application's own overlap check is bypassed (these
// tests write with plain prisma calls, exactly as a buggy code path would).

const MIN = 60_000;
const START = new Date('2027-07-01T09:00:00.000Z');

async function setup() {
  const t = await createTenant('Guard');
  const first = await createBookingRow(t, START.toISOString());
  const insert = (
    startOffsetMin: number,
    lengthMin = 30,
    over: { staffId?: string; status?: BookingStatus } = {},
  ) =>
    prisma.booking.create({
      data: {
        shopId: t.shop.id,
        customerId: first.customerId,
        serviceId: t.service.id,
        staffId: over.staffId ?? t.staff.id,
        startTime: new Date(START.getTime() + startOffsetMin * MIN),
        endTime: new Date(START.getTime() + (startOffsetMin + lengthMin) * MIN),
        ...(over.status && { status: over.status }),
      },
    });
  return { t, first, insert };
}

describe('Booking_no_overlap exclusion constraint', () => {
  it.each([
    ['starting inside the existing one', 10, 30],
    ['identical times', 0, 30],
    ['engulfing the existing one', -10, 60],
    ['ending inside the existing one', -20, 30],
  ])('rejects an overlap: %s', async (_l, offset, len) => {
    const { insert } = await setup();
    await expect(insert(offset, len)).rejects.toSatisfy(isExclusionViolation);
  });

  it('allows back-to-back bookings (ranges are half-open)', async () => {
    const { t, insert } = await setup();
    await insert(30); // starts exactly when the first ends
    await insert(-30); // ends exactly when the first starts
    expect(await prisma.booking.count({ where: { shopId: t.shop.id } })).toBe(
      3,
    );
  });

  it('does not care about other providers', async () => {
    const { t, insert } = await setup();
    const other = await prisma.userShop.create({
      data: { shopId: t.shop.id, role: 'staff', name: 'Other' },
    });
    await insert(0, 30, { staffId: other.id });
  });

  it.each(['CANCELED', 'NO_SHOW'] as const)(
    'a %s booking does not hold the slot',
    async (status) => {
      const { first, insert } = await setup();
      await prisma.booking.update({
        where: { id: first.id },
        data: { status },
      });
      await insert(0); // same time as the freed booking
    },
  );

  it.each(['PENDING', 'CONFIRMED', 'COMPLETED'] as const)(
    'a %s booking holds the slot',
    async (status) => {
      const { first, insert } = await setup();
      await prisma.booking.update({
        where: { id: first.id },
        data: { status },
      });
      await expect(insert(5)).rejects.toSatisfy(isExclusionViolation);
    },
  );

  it('refuses re-activating a freed booking onto a slot someone else took', async () => {
    const { first, insert } = await setup();
    await prisma.booking.update({
      where: { id: first.id },
      data: { status: 'CANCELED' },
    });
    await insert(0); // someone rebooks the freed slot
    await expect(
      prisma.booking.update({
        where: { id: first.id },
        data: { status: 'CONFIRMED' },
      }),
    ).rejects.toSatisfy(isExclusionViolation);
  });

  it('refuses moving a booking onto an occupied slot', async () => {
    const { first, insert } = await setup();
    const later = await insert(60);
    await expect(
      prisma.booking.update({
        where: { id: later.id },
        data: {
          startTime: first.startTime,
          endTime: first.endTime,
        },
      }),
    ).rejects.toSatisfy(isExclusionViolation);
  });
});

describe('isExclusionViolation', () => {
  it('recognises the adapter shape and the plain code, and nothing else', () => {
    expect(isExclusionViolation({ cause: { originalCode: '23P01' } })).toBe(
      true,
    );
    expect(isExclusionViolation({ code: '23P01' })).toBe(true);
    expect(isExclusionViolation({ cause: { originalCode: '40001' } })).toBe(
      false,
    );
    expect(isExclusionViolation(new Error('boom'))).toBe(false);
    expect(isExclusionViolation(null)).toBe(false);
  });
});

describe('serializableTransaction', () => {
  it('turns the constraint firing into the same 409 SLOT_TAKEN the app check gives', async () => {
    const { insert } = await setup();

    const err = await serializableTransaction(async () => insert(10)).catch(
      (e) => e,
    );

    expect(err).toBeInstanceOf(AppError);
    expect(err).toMatchObject({ statusCode: 409, code: 'SLOT_TAKEN' });
  });
});
