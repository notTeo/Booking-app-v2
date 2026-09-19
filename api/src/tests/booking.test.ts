import { describe, it, expect } from 'vitest';
import { prisma } from '../utils/prisma';
import { createBookingForShop, updateBooking, getAvailableSlots } from '../services/booking.service';
import { createSchedule } from '../services/workingHours.service';

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
    data: { userId: owner.id, shopId: shop.id, role: 'owner', name: owner.name ?? 'Shop Owner' },
  });

  const service = await prisma.service.create({
    data: { shopId: shop.id, name: 'Haircut', duration: 30, price: 2000 },
  });

  return { owner, shop, staff, service };
}

// A second staff member in the same shop (distinct from the setupShop owner)
async function addStaffMember(shopId: string) {
  const id = unique();
  const user = await prisma.user.create({
    data: { name: 'Staff Member', email: `staff-${id}@example.com`, isVerified: true },
  });
  return prisma.userShop.create({
    data: { userId: user.id, shopId, role: 'staff', name: user.name ?? 'Staff Member' },
  });
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

// 2027-02-01 is a Monday — used throughout so schedules only need a 'MON' entry.
const MONDAY = '2027-02-01';

describe('getAvailableSlots', () => {
  it('falls back to the shop-wide schedule when no staff is requested', async () => {
    const { owner, shop, service } = await setupShop();

    await createSchedule(owner.id, shop.id, {
      startDate: MONDAY,
      days: [{ day: 'MON', isOpen: true, hours: [{ startTime: '09:00', endTime: '11:00' }] }],
    });

    const result = await getAvailableSlots(shop.id, MONDAY, null, service.id);

    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.slots.map((s) => s.time)).toContain('09:00');
      expect(result.slots.every((s) => s.available)).toBe(true);
    }
  });

  it("honors a staff member's own schedule over the shop-wide one", async () => {
    const { owner, shop, service } = await setupShop();
    const staffMember = await addStaffMember(shop.id);

    await createSchedule(owner.id, shop.id, {
      startDate: MONDAY,
      days: [{ day: 'MON', isOpen: true, hours: [{ startTime: '09:00', endTime: '11:00' }] }],
    });
    await createSchedule(
      owner.id,
      shop.id,
      { startDate: MONDAY, days: [{ day: 'MON', isOpen: true, hours: [{ startTime: '13:00', endTime: '14:00' }] }] },
      staffMember.id,
    );

    const result = await getAvailableSlots(shop.id, MONDAY, staffMember.id, service.id);

    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      const times = result.slots.map((s) => s.time);
      expect(times).toContain('13:00');
      expect(times).not.toContain('09:00');
    }
  });

  it('reports closed for a staff member with no schedule of their own, even though the shop is open', async () => {
    const { owner, shop, service } = await setupShop();
    const staffMember = await addStaffMember(shop.id);

    await createSchedule(owner.id, shop.id, {
      startDate: MONDAY,
      days: [{ day: 'MON', isOpen: true, hours: [{ startTime: '09:00', endTime: '11:00' }] }],
    });

    const result = await getAvailableSlots(shop.id, MONDAY, staffMember.id, service.id);

    expect(result).toEqual({ status: 'closed' });
  });

  it('reports closed when there is no schedule at all for the date', async () => {
    const { shop, service } = await setupShop();

    const result = await getAvailableSlots(shop.id, MONDAY, null, service.id);

    expect(result).toEqual({ status: 'closed' });
  });

  it('includes a booked time in the slot list as unavailable rather than omitting it', async () => {
    const { owner, shop, staff, service } = await setupShop();

    await createSchedule(owner.id, shop.id, {
      startDate: MONDAY,
      days: [{ day: 'MON', isOpen: true, hours: [{ startTime: '09:00', endTime: '11:00' }] }],
    });

    // getAvailableSlots builds candidate windows from `${date}T${time}:00` with
    // no timezone suffix, i.e. server-local time — match that here so the
    // booking actually lands on the same instant as the '10:00' slot below,
    // regardless of the host's timezone.
    await createBookingForShop(owner.id, shop.id, {
      name: 'Alice',
      phone: '1000000007',
      serviceId: service.id,
      staffId: staff.id,
      startTime: new Date(`${MONDAY}T10:00:00`).toISOString(),
    });

    const result = await getAvailableSlots(shop.id, MONDAY, null, service.id);

    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      const booked = result.slots.find((s) => s.time === '10:00');
      const free = result.slots.find((s) => s.time === '09:00');
      expect(booked?.available).toBe(false);
      expect(free?.available).toBe(true);
    }
  });
});
