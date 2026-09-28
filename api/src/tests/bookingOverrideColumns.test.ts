import { describe, it, expect } from 'vitest';
import { prisma } from '../utils/prisma';
import { createBookingRow, createTenant } from './helpers';

describe('Booking.overriddenRules / Booking.createdById (storage only)', () => {
  it('existing-style rows default to no overrides and no creator', async () => {
    const t = await createTenant('Alpha');
    const booking = await createBookingRow(t);
    expect(booking.overriddenRules).toEqual([]);
    expect(booking.createdById).toBeNull();
  });

  it('stores exactly the accepted codes and the creating user', async () => {
    const t = await createTenant('Alpha');
    const seed = await createBookingRow(t);
    const booking = await prisma.booking.create({
      data: {
        shopId: t.shop.id,
        customerId: seed.customerId,
        serviceId: t.service.id,
        staffId: t.staff.id,
        startTime: new Date('2027-07-02T17:30:00.000Z'),
        endTime: new Date('2027-07-02T18:00:00.000Z'),
        overriddenRules: ['OUTSIDE_OPENING_HOURS', 'OFF_SLOT_GRID'],
        createdById: t.user.id,
      },
    });
    const reread = await prisma.booking.findUniqueOrThrow({
      where: { id: booking.id },
    });
    expect(reread.overriddenRules).toEqual([
      'OUTSIDE_OPENING_HOURS',
      'OFF_SLOT_GRID',
    ]);
    expect(reread.createdById).toBe(t.user.id);
  });

  it('deleting the creating user keeps the booking and nulls createdById', async () => {
    const t = await createTenant('Alpha');
    const seed = await createBookingRow(t);
    const booking = await prisma.booking.create({
      data: {
        shopId: t.shop.id,
        customerId: seed.customerId,
        serviceId: t.service.id,
        staffId: t.staff.id,
        startTime: new Date('2027-07-03T09:00:00.000Z'),
        endTime: new Date('2027-07-03T09:30:00.000Z'),
        createdById: t.user.id,
      },
    });
    await prisma.userShop.update({
      where: { id: t.staff.id },
      data: { userId: null },
    });
    await prisma.user.delete({ where: { id: t.user.id } });
    const reread = await prisma.booking.findUniqueOrThrow({
      where: { id: booking.id },
    });
    expect(reread.createdById).toBeNull();
  });
});
