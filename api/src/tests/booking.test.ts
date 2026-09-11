import { describe, it, expect } from 'vitest';
import { prisma } from '../utils/prisma';
import { createBookingForShop, updateBooking } from '../services/booking.service';

let counter = 0;
function unique() {
  counter += 1;
  return `${Date.now()}-${counter}`;
}

async function setupShop() {
  const id = unique();
  const owner = await prisma.user.create({
    data: { name: 'Shop Owner', email: `owner-${id}@example.com`, isVerified: true },
  });

  const shop = await prisma.shop.create({
    data: { name: 'Test Shop', slug: `test-shop-${id}` },
  });

  const staff = await prisma.userShop.create({
    data: { userId: owner.id, shopId: shop.id, role: 'owner' },
  });

  const service = await prisma.service.create({
    data: { shopId: shop.id, name: 'Haircut', duration: 30, price: 2000 },
  });

  return { owner, shop, staff, service };
}

describe('updateBooking overlap protection (reschedule)', () => {
  it('allows rescheduling to a free slot', async () => {
    const { owner, shop, staff, service } = await setupShop();

    const booking = await createBookingForShop(owner.id, shop.id, {
      name: 'Alice',
      phone: '1000000001',
      serviceId: service.id,
      staffId: staff.id,
      startTime: '2027-01-04T10:00:00.000Z',
    });

    const updated = await updateBooking(shop.id, booking.id, {
      startTime: '2027-01-04T14:00:00.000Z',
    });

    expect(updated.startTime.toISOString()).toBe('2027-01-04T14:00:00.000Z');
  });

  it('rejects rescheduling into a slot already occupied by another booking with a 409', async () => {
    const { owner, shop, staff, service } = await setupShop();

    const bookingA = await createBookingForShop(owner.id, shop.id, {
      name: 'Alice',
      phone: '1000000002',
      serviceId: service.id,
      staffId: staff.id,
      startTime: '2027-01-05T10:00:00.000Z',
    });

    await createBookingForShop(owner.id, shop.id, {
      name: 'Bob',
      phone: '1000000003',
      serviceId: service.id,
      staffId: staff.id,
      startTime: '2027-01-05T11:00:00.000Z',
    });

    await expect(
      updateBooking(shop.id, bookingA.id, { startTime: '2027-01-05T11:00:00.000Z' }),
    ).rejects.toMatchObject({ statusCode: 409, message: 'Time slot is already booked' });
  });

  it('does not false-positive when re-saving a booking at its own current slot', async () => {
    const { owner, shop, staff, service } = await setupShop();

    const booking = await createBookingForShop(owner.id, shop.id, {
      name: 'Alice',
      phone: '1000000004',
      serviceId: service.id,
      staffId: staff.id,
      startTime: '2027-01-06T10:00:00.000Z',
    });

    const updated = await updateBooking(shop.id, booking.id, {
      startTime: '2027-01-06T10:00:00.000Z',
      notes: 'Confirmed by phone',
    });

    expect(updated.id).toBe(booking.id);
    expect(updated.notes).toBe('Confirmed by phone');
  });

  it('skips the overlap check entirely for non-scheduling edits', async () => {
    const { owner, shop, staff, service } = await setupShop();

    const bookingA = await createBookingForShop(owner.id, shop.id, {
      name: 'Alice',
      phone: '1000000005',
      serviceId: service.id,
      staffId: staff.id,
      startTime: '2027-01-07T10:00:00.000Z',
    });

    // Same staff, different (non-overlapping) time slot — should have no effect on bookingA's edit below.
    await createBookingForShop(owner.id, shop.id, {
      name: 'Bob',
      phone: '1000000006',
      serviceId: service.id,
      staffId: staff.id,
      startTime: '2027-01-07T12:00:00.000Z',
    });

    const updated = await updateBooking(shop.id, bookingA.id, { notes: 'Client requested extra time' });

    expect(updated.notes).toBe('Client requested extra time');
    expect(updated.startTime.toISOString()).toBe('2027-01-07T10:00:00.000Z');
  });
});
