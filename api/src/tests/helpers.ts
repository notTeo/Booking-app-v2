import { prisma } from '../utils/prisma';
import { signAccessToken } from '../utils/jwt';
import type { BookingStatus } from '../../dist/generated/prisma';

// Every booking rule an owner/staff request may accept (mirrors the API's
// OVERRIDABLE_RULE_CODES; BOOKING_BEYOND_ADVANCE_WINDOW is never overridable).
export const ALL_OVERRIDABLE_RULES = [
  'OUTSIDE_OPENING_HOURS',
  'SHOP_CLOSED',
  'BOOKING_IN_PAST',
  'OFF_SLOT_GRID',
];

let counter = 0;
export const unique = () => `${Date.now()}-${++counter}`;

export const authHeader = (token: string) => ({
  Authorization: `Bearer ${token}`,
});

// A fully-formed tenant: verified Pro owner, shop, owner membership (who is
// also the bookable staff member), one service assigned to that staff member.
export async function createTenant(label: string) {
  const id = unique();
  const user = await prisma.user.create({
    data: {
      name: label,
      email: `${label.toLowerCase()}-${id}@example.com`,
      isVerified: true,
      isPro: true,
    },
  });
  const shop = await prisma.shop.create({
    data: { name: label, slug: `${label.toLowerCase()}-${id}` },
  });
  const staff = await prisma.userShop.create({
    data: { userId: user.id, shopId: shop.id, role: 'owner', name: label },
  });
  const service = await prisma.service.create({
    data: { shopId: shop.id, name: 'Cut', duration: 30, price: 2000 },
  });
  await prisma.staffService.create({
    data: { userShopId: staff.id, serviceId: service.id },
  });
  return { user, shop, staff, service, token: signAccessToken(user.id) };
}

export type Tenant = Awaited<ReturnType<typeof createTenant>>;

export async function createBookingRow(
  t: Tenant,
  start = '2027-07-01T09:00:00.000Z',
  status?: BookingStatus,
) {
  const customer = await prisma.customer.create({
    data: { shopId: t.shop.id, name: 'Cust', phone: unique() },
  });
  const startTime = new Date(start);
  return prisma.booking.create({
    data: {
      shopId: t.shop.id,
      customerId: customer.id,
      serviceId: t.service.id,
      staffId: t.staff.id,
      startTime,
      endTime: new Date(startTime.getTime() + 30 * 60 * 1000),
      ...(status && { status }),
    },
  });
}

// A non-owner member of the tenant's shop with their own login.
export async function createStaffMember(t: Tenant, label = 'Staffer') {
  const id = unique();
  const user = await prisma.user.create({
    data: {
      name: label,
      email: `${label.toLowerCase()}-${id}@example.com`,
      isVerified: true,
    },
  });
  const staff = await prisma.userShop.create({
    data: { userId: user.id, shopId: t.shop.id, role: 'staff', name: label },
  });
  return { user, staff, token: signAccessToken(user.id) };
}

const ALL_DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const;

// Weekly schedule with one opening window every day except `closedDays`.
// staffId null = shop-wide schedule; otherwise that staff member's own.
export async function addWeeklySchedule(
  t: Tenant,
  opts: {
    staffId?: string | null;
    open?: string;
    close?: string;
    closedDays?: (typeof ALL_DAYS)[number][];
  } = {},
) {
  const { open = '09:00', close = '13:00', closedDays = [] } = opts;
  const staffId = opts.staffId === undefined ? t.staff.id : opts.staffId;
  return prisma.shopWorkingSchedule.create({
    data: {
      shopId: t.shop.id,
      staffId,
      startDate: new Date(Date.UTC(2026, 0, 1)),
      days: {
        create: ALL_DAYS.map((day) =>
          closedDays.includes(day)
            ? { day, isOpen: false }
            : {
                day,
                isOpen: true,
                hours: { create: [{ startTime: open, endTime: close }] },
              },
        ),
      },
    },
  });
}

export async function addService(t: Tenant, duration: number, name = 'Svc') {
  const service = await prisma.service.create({
    data: { shopId: t.shop.id, name, duration, price: 1000 },
  });
  await prisma.staffService.create({
    data: { userShopId: t.staff.id, serviceId: service.id },
  });
  return service;
}

// A second owner of the tenant's shop who is not a bookable provider. Lets a
// test deactivate the tenant's own owner/provider without losing the caller
// (an inactive member has no access to the shop).
export async function addSecondOwner(t: Tenant, label = 'Second') {
  const id = unique();
  const user = await prisma.user.create({
    data: {
      name: label,
      email: `${label.toLowerCase()}-${id}@example.com`,
      isVerified: true,
    },
  });
  const staff = await prisma.userShop.create({
    data: {
      userId: user.id,
      shopId: t.shop.id,
      role: 'owner',
      name: label,
      bookableByCustomers: false,
      bookableInternally: false,
    },
  });
  return { user, staff, token: signAccessToken(user.id) };
}
