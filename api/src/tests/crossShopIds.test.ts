import { describe, it, expect, vi } from 'vitest';
import { serve } from './testRequest';
import { prisma } from '../utils/prisma';
import { authHeader, createStaffMember } from './helpers';
import { loadApp } from './routeRegistry';
import {
  SHOP_SCOPED,
  fill,
  world,
  type Fixture,
  type World,
} from './shopScopedRoutes';

vi.mock('../services/email.service');

// Shop A's people use Shop A's :shopId (so shop access itself passes) but name
// a resource that belongs to Shop B. Every such route must answer 404 and leave
// Shop B untouched, and must not echo anything of Shop B back. The inverse of
// membershipActive.test.ts, which varies who the caller is; this varies which
// resource the id points at.

const { app } = await loadApp();
const api = await serve(app);

// Which part of Shop B's world to swap in. `customerId` rides on the booking
// row, so the booking swap covers customer routes too.
const SWAPS: Record<string, (a: World, b: World) => World> = {
  member: (a, b) => ({ ...a, member: b.member }),
  service: (a, b) => ({ ...a, t: { ...a.t, service: b.t.service } }),
  booking: (a, b) => ({ ...a, booking: b.booking }),
  schedule: (a, b) => ({ ...a, schedule: b.schedule }),
  product: (a, b) => ({ ...a, product: b.product }),
  // Only the line: Shop A's booking with Shop B's reserved product.
  lineOnly: (a, b) => ({ ...a, line: b.line }),
  // A schedule together with its own member: the member/schedule consistency
  // check passes, so only the shop check stands between A and B's schedule.
  memberAndSchedule: (a, b) => ({
    ...a,
    member: b.member,
    schedule: b.schedule,
  }),
};

const PARAM_SWAP: Record<string, keyof typeof SWAPS> = {
  memberId: 'member',
  userShopId: 'member',
  serviceId: 'service',
  bookingId: 'booking',
  customerId: 'booking',
  scheduleId: 'schedule',
  productId: 'product',
  lineId: 'lineOnly',
};

// Everything that could change if a request leaked through to Shop B.
const snapshot = async (w: World) => {
  const shopId = w.t.shop.id;
  return {
    shop: await prisma.shop.findUnique({ where: { id: shopId } }),
    booking: await prisma.booking.findUnique({ where: { id: w.booking.id } }),
    customer: await prisma.customer.findUnique({
      where: { id: w.booking.customerId },
    }),
    member: await prisma.userShop.findUnique({
      where: { id: w.member.staff.id },
    }),
    service: await prisma.service.findUnique({ where: { id: w.t.service.id } }),
    product: await prisma.product.findUnique({ where: { id: w.product.id } }),
    line: await prisma.bookingProduct.findUnique({ where: { id: w.line.id } }),
    schedule: await prisma.shopWorkingSchedule.findUnique({
      where: { id: w.schedule.id },
      include: { days: { include: { hours: true } } },
    }),
    staffServices: await prisma.staffService.findMany({
      where: { service: { shopId } },
      orderBy: { id: 'asc' },
    }),
    invites: await prisma.shopInvite.count({ where: { shopId } }),
    counts: {
      members: await prisma.userShop.count({ where: { shopId } }),
      services: await prisma.service.count({ where: { shopId } }),
      products: await prisma.product.count({ where: { shopId } }),
      bookings: await prisma.booking.count({ where: { shopId } }),
      customers: await prisma.customer.count({ where: { shopId } }),
      schedules: await prisma.shopWorkingSchedule.count({ where: { shopId } }),
    },
  };
};

const send = (
  method: string,
  fx: Fixture,
  path: string,
  swapped: World,
  token: string,
) => {
  const req = (
    api as unknown as Record<string, (url: string) => import('supertest').Test>
  )
    [method.toLowerCase()](fill(path, swapped))
    .set(authHeader(token));
  return fx.body ? req.send(fx.body(swapped)) : req;
};

// Routes that name a sub-resource in the path, plus the one whose body does.
const targets = Object.entries(SHOP_SCOPED).filter(
  ([key]) =>
    /:(memberId|userShopId|serviceId|bookingId|customerId|scheduleId|productId|lineId)\b/.test(
      key,
    ) || key === 'POST /api/shops/:shopId/services/:serviceId/staff',
);

describe.each(targets)('%s', (routeKey, fx) => {
  const [method, path] = routeKey.split(' ');
  const swaps = [
    ...new Set(
      [...path.matchAll(/:(\w+)/g)]
        .map((m) => PARAM_SWAP[m[1]])
        .filter(Boolean)
        .concat(
          path.includes(':memberId') && path.includes(':scheduleId')
            ? ['memberAndSchedule']
            : [],
        )
        // The staff-assignment route also takes the member in its body.
        .concat(
          routeKey.endsWith('/services/:serviceId/staff') ? ['member'] : [],
        ),
    ),
  ];

  it(`404s and leaves the other shop untouched when the id is Shop B's (${swaps.join(', ')})`, async () => {
    const a = await world();
    const b = await world();
    const staffA = await createStaffMember(a.t, 'ActiveStaffA');
    const before = await snapshot(b);
    const bIds = [
      b.booking.id,
      b.booking.customerId,
      b.member.staff.id,
      b.schedule.id,
      b.t.service.id,
      b.product.id,
      b.line.id,
    ];

    // Owner always; an active staff member too where staff may call the route.
    const callers = [['owner', a.t.token] as const].concat(
      fx.minRole ? [] : [['staff', staffA.token] as const],
    );

    for (const swap of swaps) {
      const swapped = SWAPS[swap](a, b);
      for (const [who, token] of callers) {
        const label = `${who} of A, ${swap} from B`;
        const res = await send(method, fx, path, swapped, token);
        expect(res.status, `${label}: ${JSON.stringify(res.body)}`).toBe(404);
        for (const id of bIds)
          expect(JSON.stringify(res.body), label).not.toContain(id);
      }
    }

    expect(await snapshot(b)).toEqual(before);
  });
});
