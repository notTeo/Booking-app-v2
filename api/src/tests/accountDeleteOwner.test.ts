import { describe, it, expect, vi } from 'vitest';
import { serve } from './testRequest';
import { prisma } from '../utils/prisma';
import {
  addSecondOwner,
  authHeader,
  createStaffMember,
  createTenant,
  type Tenant,
} from './helpers';
import { loadApp } from './routeRegistry';

vi.mock('../services/email.service');

// Deleting an account removes the user's memberships. The only owner who can
// sign in must not be able to do that and leave a live shop nobody can manage.

const { app } = await loadApp();
const api = await serve(app);

const deleteAccount = (token: string) =>
  api.delete('/user/me').set(authHeader(token)).send({});

const exists = async (userId: string) =>
  (await prisma.user.findUnique({ where: { id: userId } })) !== null;

const expectRefused = async (t: Tenant, shopIds = [t.shop.id]) => {
  const res = await deleteAccount(t.token);
  expect(res.status, JSON.stringify(res.body)).toBe(409);
  expect(res.body.code).toBe('SOLE_OWNER_OF_SHOP');
  expect(res.body.shops.map((s: { id: string }) => s.id).sort()).toEqual(
    [...shopIds].sort(),
  );
  expect(await exists(t.user.id)).toBe(true);
  expect(
    (await prisma.userShop.findUniqueOrThrow({ where: { id: t.staff.id } }))
      .role,
  ).toBe('owner');
};

describe('DELETE /user/me as a shop owner', () => {
  it('the only owner is refused, and told which shop is in the way', async () => {
    const t = await createTenant('OnlyOwner');
    await expectRefused(t);

    const res = await deleteAccount(t.token);
    expect(res.body.shops[0]).toEqual({
      id: t.shop.id,
      name: t.shop.name,
      slug: t.shop.slug,
    });
    expect(res.body.message).toContain(t.shop.name);
  });

  it('staff in the shop do not make it safe to leave', async () => {
    const t = await createTenant('OnlyOwner');
    await createStaffMember(t);
    await expectRefused(t);
  });

  it('an owner without a login does not count as someone to hand over to', async () => {
    const t = await createTenant('GhostOwner');
    await prisma.userShop.create({
      data: { shopId: t.shop.id, name: 'Ghost', role: 'owner' },
    });
    await expectRefused(t);
  });

  it('a deactivated owner does not count either', async () => {
    const t = await createTenant('InactiveOwner');
    const second = await addSecondOwner(t);
    await prisma.userShop.update({
      where: { id: second.staff.id },
      data: { active: false },
    });
    await expectRefused(t);
  });

  it('with two shops, only the ones they solely own are listed', async () => {
    const t = await createTenant('TwoShops');
    const shared = await prisma.shop.create({
      data: { name: 'Shared', slug: `shared-${t.shop.slug}` },
    });
    await prisma.userShop.create({
      data: { userId: t.user.id, shopId: shared.id, role: 'owner', name: 'Me' },
    });
    const partner = await prisma.user.create({
      data: {
        name: 'Partner',
        email: `partner-${t.shop.slug}@example.com`,
        isVerified: true,
      },
    });
    await prisma.userShop.create({
      data: {
        userId: partner.id,
        shopId: shared.id,
        role: 'owner',
        name: 'Partner',
      },
    });

    await expectRefused(t, [t.shop.id]);
  });

  it('once another owner can sign in, the account can be deleted and the shop keeps that owner', async () => {
    const t = await createTenant('HandedOver');
    const second = await addSecondOwner(t);

    const res = await deleteAccount(t.token);

    expect(res.status).toBe(200);
    expect(await exists(t.user.id)).toBe(false);
    const owners = await prisma.userShop.findMany({
      where: { shopId: t.shop.id, role: 'owner' },
    });
    expect(owners.map((o) => o.id)).toEqual([second.staff.id]);
  });

  it('after deleting the shop, the account can be deleted', async () => {
    const t = await createTenant('ShopFirst');
    const gone = await api
      .delete(`/api/shops/${t.shop.id}`)
      .set(authHeader(t.token));
    expect(gone.status).toBeLessThan(300);

    expect((await deleteAccount(t.token)).status).toBe(200);
    expect(await exists(t.user.id)).toBe(false);
  });
});

describe('DELETE /user/me as staff', () => {
  it('is not held back by the shop, which keeps its owner', async () => {
    const t = await createTenant('StaffLeaves');
    const staff = await createStaffMember(t);

    expect((await deleteAccount(staff.token)).status).toBe(200);
    expect(await exists(staff.user.id)).toBe(false);
    expect(await exists(t.user.id)).toBe(true);
    expect(
      await prisma.shop.findUnique({ where: { id: t.shop.id } }),
    ).not.toBeNull();
  });
});
