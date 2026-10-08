import { describe, it, expect, vi } from 'vitest';
import { serve } from './testRequest';
import { prisma } from '../utils/prisma';
import {
  addManager,
  authHeader,
  createStaffMember,
  createTenant,
  type Tenant,
} from './helpers';
import { loadApp } from './routeRegistry';
import type { ShopPlan } from '../../dist/generated/prisma';

vi.mock('../services/email.service');

// An owner may switch plan while the shop's free trial runs. A smaller plan
// switches off what it does not include, and deletes nothing.

const { app } = await loadApp();
const api = await serve(app);

const DAY = 24 * 60 * 60 * 1000;

const trialTenant = async (plan: ShopPlan = 'TEAM') => {
  const t = await createTenant('Trial');
  await prisma.shop.update({
    where: { id: t.shop.id },
    data: {
      plan,
      subscriptionStatus: 'TRIALING',
      trialEndsAt: new Date(Date.now() + 10 * DAY),
    },
  });
  return t;
};

const changePlan = (t: Tenant, plan: string, token = t.token) =>
  api
    .patch(`/api/shops/${t.shop.id}/plan`)
    .set(authHeader(token))
    .send({ plan });

// Members created one after the other, so their order by creation is known.
const addStaff = async (t: Tenant, count: number, data = {}) => {
  const base = Date.now();
  const ids: string[] = [];
  for (let n = 0; n < count; n++) {
    const member = await prisma.userShop.create({
      data: {
        shopId: t.shop.id,
        name: `Staff ${n + 1}`,
        role: 'staff',
        createdAt: new Date(base + (n + 1) * 1000),
        ...data,
      },
    });
    ids.push(member.id);
  }
  return ids;
};

const activeIds = async (t: Tenant) =>
  (
    await prisma.userShop.findMany({
      where: { shopId: t.shop.id, active: true },
      select: { id: true },
    })
  ).map((m) => m.id);

describe('PATCH /api/shops/:id/plan', () => {
  it('moves a trial shop to a larger plan', async () => {
    const t = await trialTenant('SOLO');

    const res = await changePlan(t, 'TEAM');

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      plan: 'TEAM',
      subscriptionStatus: 'TRIALING',
      staffLimit: 5,
      teamFeatures: true,
      products: true,
      role: 'owner',
    });
  });

  it('is for the owner only', async () => {
    const t = await trialTenant();
    const staff = await createStaffMember(t);

    const res = await changePlan(t, 'BUSINESS', staff.token);

    expect(res.status).toBe(403);
    const shop = await prisma.shop.findUniqueOrThrow({
      where: { id: t.shop.id },
    });
    expect(shop.plan).toBe('TEAM');
  });

  it('is refused once the shop is no longer on a trial', async () => {
    const t = await createTenant('Paid');

    const res = await changePlan(t, 'SOLO');

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('PLAN_CHANGE_UNAVAILABLE');
  });

  it('is refused once the trial has ended', async () => {
    const t = await trialTenant();
    await prisma.shop.update({
      where: { id: t.shop.id },
      data: { trialEndsAt: new Date(Date.now() - DAY) },
    });

    const res = await changePlan(t, 'SOLO');

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('PLAN_CHANGE_UNAVAILABLE');
  });

  it('rejects a plan that does not exist', async () => {
    const t = await trialTenant();

    expect((await changePlan(t, 'GOLD')).status).toBe(400);
  });

  it('on Solo keeps only the owner active and switches the products off', async () => {
    const t = await trialTenant();
    await addStaff(t, 2);
    await prisma.product.createMany({
      data: [
        { shopId: t.shop.id, name: 'Wax', price: 900, stock: 3 },
        { shopId: t.shop.id, name: 'Oil', price: 1200, stock: 1 },
      ],
    });

    const res = await changePlan(t, 'SOLO');

    expect(res.status).toBe(200);
    expect(await activeIds(t)).toEqual([t.staff.id]);
    // Nothing is deleted: the members and the products are still there.
    expect(await prisma.userShop.count({ where: { shopId: t.shop.id } })).toBe(
      3,
    );
    const products = await prisma.product.findMany({
      where: { shopId: t.shop.id },
    });
    expect(products).toHaveLength(2);
    expect(products.every((p) => !p.isActive)).toBe(true);
  });

  it('keeps the owner and the longest-standing members up to the plan limit', async () => {
    const t = await trialTenant('BUSINESS');
    const staff = await addStaff(t, 6);

    const res = await changePlan(t, 'TEAM');

    expect(res.status).toBe(200);
    expect((await activeIds(t)).sort()).toEqual(
      [t.staff.id, ...staff.slice(0, 4)].sort(),
    );
  });

  it('on Solo the owner is the one left active, bookable or not', async () => {
    const t = await trialTenant();
    await prisma.userShop.update({
      where: { id: t.staff.id },
      data: { bookableByCustomers: false, bookableInternally: false },
    });
    await addStaff(t, 1);
    await addStaff(t, 1, {
      bookableByCustomers: false,
      bookableInternally: false,
    });

    await changePlan(t, 'SOLO');

    expect(await activeIds(t)).toEqual([t.staff.id]);
  });

  it('on a plan with a team, leaves a member who takes no staff place alone', async () => {
    const t = await trialTenant('BUSINESS');
    const staff = await addStaff(t, 5);
    const [desk] = await addStaff(t, 1, {
      bookableByCustomers: false,
      bookableInternally: false,
    });

    await changePlan(t, 'TEAM');

    expect((await activeIds(t)).sort()).toEqual(
      [t.staff.id, ...staff.slice(0, 4), desk].sort(),
    );
  });

  it('cannot be done through the shop settings, by the owner or a manager', async () => {
    const t = await trialTenant();
    const manager = await addManager(t);

    for (const token of [t.token, manager.token]) {
      const res = await api
        .patch(`/api/shops/${t.shop.id}`)
        .set(authHeader(token))
        .send({
          plan: 'BUSINESS',
          subscriptionStatus: 'ACTIVE',
          trialEndsAt: null,
        });
      expect(res.status).toBeLessThan(500);
    }
    expect((await changePlan(t, 'BUSINESS', manager.token)).status).toBe(403);

    const shop = await prisma.shop.findUniqueOrThrow({
      where: { id: t.shop.id },
    });
    expect(shop).toMatchObject({
      plan: 'TEAM',
      subscriptionStatus: 'TRIALING',
    });
    expect(shop.trialEndsAt).not.toBeNull();
  });

  it('keeps products on when the new plan still has them', async () => {
    const t = await trialTenant('BUSINESS');
    await prisma.product.create({
      data: { shopId: t.shop.id, name: 'Wax', price: 900 },
    });

    await changePlan(t, 'TEAM');

    const product = await prisma.product.findFirstOrThrow({
      where: { shopId: t.shop.id },
    });
    expect(product.isActive).toBe(true);
  });
});
