import { describe, it, expect } from 'vitest';
import { prisma } from '../utils/prisma';
import {
  createBookingForShop,
  updateBooking,
  getAvailableSlots,
} from '../services/booking.service';
import { createSchedule } from '../services/workingHours.service';

import { ALL_OVERRIDABLE_RULES } from './helpers';

let counter = 0;
function unique() {
  counter += 1;
  return `${Date.now()}-${counter}`;
}

async function setupShop() {
  const id = unique();
  const owner = await prisma.user.create({
    data: {
      name: 'Shop Owner',
      email: `owner-${id}@example.com`,
      isVerified: true,
    },
  });

  const shop = await prisma.shop.create({
    // Wide window: these tests use fixed far-future dates, and the advance
    // window is (deliberately) not overridable.
    data: { name: 'Test Shop', slug: `test-shop-${id}`, maxAdvanceDays: 730 },
  });

  const staff = await prisma.userShop.create({
    data: {
      userId: owner.id,
      shopId: shop.id,
      role: 'owner',
      name: owner.name ?? 'Shop Owner',
    },
  });

  const service = await prisma.service.create({
    data: { shopId: shop.id, name: 'Haircut', duration: 30, price: 2000 },
  });

  // The "no staff preference" flow only considers staff assigned to the service.
  await prisma.staffService.create({
    data: { userShopId: staff.id, serviceId: service.id },
  });

  return { owner, shop, staff, service };
}

// A second staff member in the same shop (distinct from the setupShop owner)
async function addStaffMember(shopId: string) {
  const id = unique();
  const user = await prisma.user.create({
    data: {
      name: 'Staff Member',
      email: `staff-${id}@example.com`,
      isVerified: true,
    },
  });
  return prisma.userShop.create({
    data: {
      userId: user.id,
      shopId,
      role: 'staff',
      name: user.name ?? 'Staff Member',
    },
  });
}

describe('updateBooking overlap protection (reschedule)', () => {
  it('allows rescheduling to a free slot', async () => {
    const { owner, shop, staff, service } = await setupShop();

    const booking = await createBookingForShop(owner.id, shop.id, {
      overrideRules: ALL_OVERRIDABLE_RULES,
      name: 'Alice',
      phone: '1000000001',
      serviceId: service.id,
      staffId: staff.id,
      startTime: '2027-01-04T10:00:00.000Z',
    });

    const { booking: updated } = await updateBooking(
      owner.id,
      shop.id,
      booking.id,
      {
        overrideRules: ALL_OVERRIDABLE_RULES,
        startTime: '2027-01-04T14:00:00.000Z',
      },
    );

    expect(updated.startTime.toISOString()).toBe('2027-01-04T14:00:00.000Z');
    // A reschedule is a new booking; the old one stays as a reference.
    expect(updated.id).not.toBe(booking.id);
    expect(updated.rescheduledFrom?.id).toBe(booking.id);
  });

  it('rejects rescheduling into a slot already occupied by another booking with a 409', async () => {
    const { owner, shop, staff, service } = await setupShop();

    const bookingA = await createBookingForShop(owner.id, shop.id, {
      overrideRules: ALL_OVERRIDABLE_RULES,
      name: 'Alice',
      phone: '1000000002',
      serviceId: service.id,
      staffId: staff.id,
      startTime: '2027-01-05T10:00:00.000Z',
    });

    await createBookingForShop(owner.id, shop.id, {
      overrideRules: ALL_OVERRIDABLE_RULES,
      name: 'Bob',
      phone: '1000000003',
      serviceId: service.id,
      staffId: staff.id,
      startTime: '2027-01-05T11:00:00.000Z',
    });

    await expect(
      updateBooking(owner.id, shop.id, bookingA.id, {
        overrideRules: ALL_OVERRIDABLE_RULES,
        startTime: '2027-01-05T11:00:00.000Z',
      }),
    ).rejects.toMatchObject({
      statusCode: 409,
      message: 'Time slot is already booked',
    });
  });

  it('does not false-positive when re-saving a booking at its own current slot', async () => {
    const { owner, shop, staff, service } = await setupShop();

    const booking = await createBookingForShop(owner.id, shop.id, {
      overrideRules: ALL_OVERRIDABLE_RULES,
      name: 'Alice',
      phone: '1000000004',
      serviceId: service.id,
      staffId: staff.id,
      startTime: '2027-01-06T10:00:00.000Z',
    });

    const { booking: updated } = await updateBooking(
      owner.id,
      shop.id,
      booking.id,
      {
        overrideRules: ALL_OVERRIDABLE_RULES,
        startTime: '2027-01-06T10:00:00.000Z',
        notes: 'Confirmed by phone',
      },
    );

    expect(updated.id).toBe(booking.id);
    expect(updated.notes).toBe('Confirmed by phone');
  });

  it('skips the overlap check entirely for non-scheduling edits', async () => {
    const { owner, shop, staff, service } = await setupShop();

    const bookingA = await createBookingForShop(owner.id, shop.id, {
      overrideRules: ALL_OVERRIDABLE_RULES,
      name: 'Alice',
      phone: '1000000005',
      serviceId: service.id,
      staffId: staff.id,
      startTime: '2027-01-07T10:00:00.000Z',
    });

    // Same staff, different (non-overlapping) time slot — should have no effect on bookingA's edit below.
    await createBookingForShop(owner.id, shop.id, {
      overrideRules: ALL_OVERRIDABLE_RULES,
      name: 'Bob',
      phone: '1000000006',
      serviceId: service.id,
      staffId: staff.id,
      startTime: '2027-01-07T12:00:00.000Z',
    });

    const { booking: updated } = await updateBooking(
      owner.id,
      shop.id,
      bookingA.id,
      { notes: 'Client requested extra time' },
    );

    expect(updated.notes).toBe('Client requested extra time');
    expect(updated.startTime.toISOString()).toBe('2027-01-07T10:00:00.000Z');
  });
});

// 2027-02-01 is a Monday — used throughout so schedules only need a 'MON' entry.
const MONDAY = '2027-02-01';

describe('getAvailableSlots', () => {
  it('uses the team hours when no staff is requested', async () => {
    const { owner, shop, staff, service } = await setupShop();

    await createSchedule(
      owner.id,
      shop.id,
      {
        startDate: MONDAY,
        days: [
          {
            day: 'MON',
            isOpen: true,
            hours: [{ startTime: '09:00', endTime: '11:00' }],
          },
        ],
      },
      staff.id,
    );

    const result = await getAvailableSlots(shop.id, MONDAY, null, service.id);

    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.slots.map((s) => s.time)).toContain('09:00');
      expect(result.slots.every((s) => s.available)).toBe(true);
    }
  });

  it("honors a staff member's own schedule, not a colleague's", async () => {
    const { owner, shop, staff, service } = await setupShop();
    const staffMember = await addStaffMember(shop.id);
    // Customers are only offered a member for a service that member does.
    await prisma.staffService.create({
      data: { userShopId: staffMember.id, serviceId: service.id },
    });

    await createSchedule(
      owner.id,
      shop.id,
      {
        startDate: MONDAY,
        days: [
          {
            day: 'MON',
            isOpen: true,
            hours: [{ startTime: '09:00', endTime: '11:00' }],
          },
        ],
      },
      staff.id,
    );
    await createSchedule(
      owner.id,
      shop.id,
      {
        startDate: MONDAY,
        days: [
          {
            day: 'MON',
            isOpen: true,
            hours: [{ startTime: '13:00', endTime: '14:00' }],
          },
        ],
      },
      staffMember.id,
    );

    const result = await getAvailableSlots(
      shop.id,
      MONDAY,
      staffMember.id,
      service.id,
    );

    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      const times = result.slots.map((s) => s.time);
      expect(times).toContain('13:00');
      expect(times).not.toContain('09:00');
    }
  });

  it('reports closed for a staff member with no schedule of their own, even though a colleague is working', async () => {
    const { owner, shop, staff, service } = await setupShop();
    const staffMember = await addStaffMember(shop.id);

    await createSchedule(
      owner.id,
      shop.id,
      {
        startDate: MONDAY,
        days: [
          {
            day: 'MON',
            isOpen: true,
            hours: [{ startTime: '09:00', endTime: '11:00' }],
          },
        ],
      },
      staff.id,
    );

    const result = await getAvailableSlots(
      shop.id,
      MONDAY,
      staffMember.id,
      service.id,
    );

    expect(result).toEqual({ status: 'closed' });
  });

  it('reports closed when there is no schedule at all for the date', async () => {
    const { shop, service } = await setupShop();

    const result = await getAvailableSlots(shop.id, MONDAY, null, service.id);

    expect(result).toEqual({ status: 'closed' });
  });

  it('includes a booked time in the slot list as unavailable rather than omitting it', async () => {
    const { owner, shop, staff, service } = await setupShop();

    await createSchedule(
      owner.id,
      shop.id,
      {
        startDate: MONDAY,
        days: [
          {
            day: 'MON',
            isOpen: true,
            hours: [{ startTime: '09:00', endTime: '11:00' }],
          },
        ],
      },
      staff.id,
    );

    // 10:00 Athens wall-clock on 2027-02-01 (EET, +02:00), as an explicit
    // instant so the test doesn't depend on the process timezone.
    await createBookingForShop(owner.id, shop.id, {
      overrideRules: ALL_OVERRIDABLE_RULES,
      name: 'Alice',
      phone: '1000000007',
      serviceId: service.id,
      staffId: staff.id,
      startTime: '2027-02-01T10:00:00+02:00',
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
