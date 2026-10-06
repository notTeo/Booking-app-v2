import { randomUUID } from 'crypto';
import { describe, it, expect, vi } from 'vitest';
import { serve } from './testRequest';
import { prisma } from '../utils/prisma';
import {
  authHeader,
  createBookingRow,
  createStaffMember,
  createTenant,
  unique,
  type Tenant,
} from './helpers';
import { loadApp } from './routeRegistry';
import { setShopPlan } from '../admin/setShopPlan';
import type { ShopPlan } from '../../dist/generated/prisma';

vi.mock('../services/email.service');

// What each plan allows: Solo 1 bookable staff member and no team features,
// Team 5, Business 15. The owner from createTenant is bookable, so they take
// the first place.

const { app } = await loadApp();
const api = await serve(app);

const setPlan = (t: Tenant, plan: ShopPlan) =>
  prisma.shop.update({ where: { id: t.shop.id }, data: { plan } });

const addMember = (t: Tenant, body: Record<string, unknown> = {}) =>
  api
    .post(`/api/shops/${t.shop.id}/team`)
    .set(authHeader(t.token))
    .send({ name: 'Member', role: 'staff', sendEmail: false, ...body });

const patchMember = (t: Tenant, id: string, body: Record<string, unknown>) =>
  api
    .patch(`/api/shops/${t.shop.id}/team/${id}`)
    .set(authHeader(t.token))
    .send(body);

describe('bookable staff limit', () => {
  it.each([
    ['SOLO', 1],
    ['TEAM', 5],
    ['BUSINESS', 15],
  ] as const)('%s allows %i bookable staff', async (plan, limit) => {
    const t = await createTenant('Cap');
    await setPlan(t, plan);

    for (let n = 1; n < limit; n++) {
      expect((await addMember(t, { name: `M${n}` })).status).toBe(201);
    }
    const over = await addMember(t, { name: 'One too many' });
    expect(over.status).toBe(403);
    expect(over.body).toMatchObject({
      code: 'PLAN_STAFF_LIMIT',
      plan,
      staffLimit: limit,
    });
    expect(await prisma.userShop.count({ where: { shopId: t.shop.id } })).toBe(
      limit,
    );
  });

  it('an inactive or unbookable member does not take a place', async () => {
    const t = await createTenant('Cap');
    await setPlan(t, 'SOLO');
    await patchMember(t, t.staff.id, {
      role: 'owner',
      bookableByCustomers: false,
      bookableInternally: false,
    });

    expect((await addMember(t)).status).toBe(201);
  });

  it('refuses making a member bookable again when the places are taken', async () => {
    const t = await createTenant('Cap');
    const extra = await prisma.userShop.create({
      data: { shopId: t.shop.id, name: 'Away', role: 'staff', active: false },
    });
    await setPlan(t, 'SOLO');

    const res = await patchMember(t, extra.id, { role: 'staff', active: true });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('PLAN_STAFF_LIMIT');

    // Editing a member who already holds a place is never refused.
    const own = await patchMember(t, t.staff.id, {
      role: 'owner',
      bookableByCustomers: false,
    });
    expect(own.status).toBe(200);
  });
});

describe('team features', () => {
  // A Solo shop whose owner is not bookable, so one staff place is free.
  const soloWithRoom = async () => {
    const t = await createTenant('Solo');
    await prisma.userShop.update({
      where: { id: t.staff.id },
      data: { bookableByCustomers: false, bookableInternally: false },
    });
    await setPlan(t, 'SOLO');
    return t;
  };

  it('Solo cannot send a login invite, on create or later', async () => {
    const t = await soloWithRoom();

    const withInvite = await addMember(t, {
      email: 'new@example.com',
      sendEmail: true,
    });
    expect(withInvite.status).toBe(403);
    expect(withInvite.body.code).toBe('PLAN_FEATURE');
    expect(await prisma.userShop.count({ where: { shopId: t.shop.id } })).toBe(
      1,
    );

    const member = await addMember(t, { email: 'new@example.com' });
    expect(member.status).toBe(201);
    const invite = await api
      .post(`/api/shops/${t.shop.id}/team/${member.body.data.id}/invite`)
      .set(authHeader(t.token));
    expect(invite.status).toBe(403);
    expect(invite.body.code).toBe('PLAN_FEATURE');
  });

  it('Solo cannot have a manager', async () => {
    const t = await soloWithRoom();

    const created = await addMember(t, { role: 'manager' });
    expect(created.status).toBe(403);
    expect(created.body.code).toBe('PLAN_FEATURE');

    const member = await addMember(t);
    const promoted = await patchMember(t, member.body.data.id, {
      role: 'manager',
    });
    expect(promoted.status).toBe(403);
    expect(promoted.body.code).toBe('PLAN_FEATURE');
  });

  it('Team can invite and have managers', async () => {
    const t = await createTenant('Team');

    const invited = await addMember(t, {
      email: 'new@example.com',
      sendEmail: true,
      role: 'manager',
    });
    expect(invited.status).toBe(201);
  });
});

describe('locked shop', () => {
  const DAY = 24 * 60 * 60 * 1000;
  const lock = (t: Tenant, how: 'inactive' | 'trial-ended') =>
    prisma.shop.update({
      where: { id: t.shop.id },
      data:
        how === 'inactive'
          ? { subscriptionStatus: 'INACTIVE' }
          : {
              subscriptionStatus: 'TRIALING',
              trialEndsAt: new Date(Date.now() - DAY),
            },
    });

  it('a running trial is not locked', async () => {
    const t = await createTenant('Trial');
    await prisma.shop.update({
      where: { id: t.shop.id },
      data: {
        subscriptionStatus: 'TRIALING',
        trialEndsAt: new Date(Date.now() + DAY),
      },
    });

    const shop = await api
      .get(`/api/shops/${t.shop.id}`)
      .set(authHeader(t.token));
    expect(shop.body.data.locked).toBe(false);
    expect((await addMember(t)).status).toBe(201);
  });

  it.each(['inactive', 'trial-ended'] as const)(
    '%s: members can read but not write',
    async (how) => {
      const t = await createTenant('Locked');
      const booking = await createBookingRow(t);
      await lock(t, how);
      const base = `/api/shops/${t.shop.id}`;
      const auth = authHeader(t.token);

      const shop = await api.get(base).set(auth);
      expect(shop.status).toBe(200);
      expect(shop.body.data.locked).toBe(true);
      for (const path of ['/team', '/services', '/bookings', '/customers']) {
        expect((await api.get(base + path).set(auth)).status).toBe(200);
      }

      const writes = [
        api.patch(base).set(auth).send({ name: 'Renamed' }),
        addMember(t),
        api
          .post(`${base}/services`)
          .set(auth)
          .send({ name: 'New', duration: 30, price: 1000 }),
        api
          .patch(`${base}/bookings/${booking.id}/status`)
          .set(auth)
          .send({ status: 'COMPLETED' }),
        api
          .post(`${base}/customers`)
          .set(auth)
          .send({ name: 'New', phone: '6900000001' }),
      ];
      for (const res of await Promise.all(writes)) {
        expect(res.status).toBe(403);
        expect(res.body.code).toBe('SHOP_LOCKED');
      }
      expect(
        (await prisma.shop.findUniqueOrThrow({ where: { id: t.shop.id } }))
          .name,
      ).toBe('Locked');
    },
  );

  it('customers can still be deleted, and the owner can delete the shop', async () => {
    const t = await createTenant('Locked');
    const customer = await prisma.customer.create({
      data: { shopId: t.shop.id, name: 'Gone', phone: unique() },
    });
    await lock(t, 'inactive');
    const base = `/api/shops/${t.shop.id}`;

    const removed = await api
      .delete(`${base}/customers/${customer.id}`)
      .set(authHeader(t.token));
    expect(removed.status).toBeLessThan(300);

    const deleted = await api.delete(base).set(authHeader(t.token));
    expect(deleted.status).toBeLessThan(300);
  });

  it('does not tell a non-member that the shop is locked', async () => {
    const t = await createTenant('Locked');
    const other = await createTenant('Other');
    await lock(t, 'inactive');

    const res = await api
      .post(`/api/shops/${t.shop.id}/services`)
      .set(authHeader(other.token))
      .send({ name: 'New', duration: 30, price: 1000 });
    expect(res.status).toBe(404);
  });

  it('staff of a locked shop are read-only too', async () => {
    const t = await createTenant('Locked');
    const staff = await createStaffMember(t);
    const booking = await createBookingRow(t);
    await lock(t, 'trial-ended');

    const res = await api
      .patch(`/api/shops/${t.shop.id}/bookings/${booking.id}/status`)
      .set(authHeader(staff.token))
      .send({ status: 'COMPLETED' });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('SHOP_LOCKED');
  });

  it('the public page shows but takes no new bookings; cancel links still work', async () => {
    const t = await createTenant('Locked');
    const cancelToken = randomUUID();
    const booking = await createBookingRow(t);
    await prisma.booking.update({
      where: { id: booking.id },
      data: { cancelToken },
    });
    await lock(t, 'inactive');

    const page = await api.get(`/public/${t.shop.slug}`);
    expect(page.status).toBe(200);
    expect(page.body.data.acceptingBookings).toBe(false);

    const book = await api.post(`/public/${t.shop.slug}/book`).send({
      name: 'Nikos',
      phone: '6900001000',
      serviceId: t.service.id,
      staffId: t.staff.id,
      startTime: '2027-07-02T09:00:00.000Z',
    });
    expect(book.status).toBe(403);
    expect(book.body.code).toBe('SHOP_LOCKED');
    expect(await prisma.booking.count({ where: { shopId: t.shop.id } })).toBe(
      1,
    );

    const cancel = await api
      .post('/public/cancel')
      .send({ token: cancelToken });
    expect(cancel.status).toBe(200);
  });

  it('the public page never shows the plan', async () => {
    const t = await createTenant('Open');

    const page = await api.get(`/public/${t.shop.slug}`);
    expect(page.body.data.acceptingBookings).toBe(true);
    expect(page.body.data).not.toHaveProperty('plan');
    expect(page.body.data).not.toHaveProperty('subscriptionStatus');
    expect(page.body.data).not.toHaveProperty('trialEndsAt');
  });
});

describe('setShopPlan (admin)', () => {
  it('activates a plan and ends a trial', async () => {
    const t = await createTenant('Admin');
    await prisma.shop.update({
      where: { id: t.shop.id },
      data: { subscriptionStatus: 'TRIALING', trialEndsAt: new Date(0) },
    });

    const r = await setShopPlan({ slug: t.shop.slug, plan: 'SOLO' });
    expect(r.shop).toMatchObject({
      plan: 'SOLO',
      subscriptionStatus: 'ACTIVE',
    });
  });

  it('refuses a plan with fewer places than the shop has bookable staff', async () => {
    const t = await createTenant('Admin');
    await addMember(t);

    await expect(
      setShopPlan({ slug: t.shop.slug, plan: 'SOLO' }),
    ).rejects.toThrow(/2 bookable staff but SOLO allows 1/);
    expect(
      (await prisma.shop.findUniqueOrThrow({ where: { id: t.shop.id } })).plan,
    ).toBe('TEAM');
  });

  it('starts a new trial of the given length, and can deactivate', async () => {
    const t = await createTenant('Admin');

    const trial = await setShopPlan({
      slug: t.shop.slug,
      status: 'TRIALING',
      trialDays: 14,
    });
    const days = (trial.shop.trialEndsAt!.getTime() - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(13.9);
    expect(days).toBeLessThanOrEqual(14);
    expect(trial.shop.plan).toBe('TEAM');

    const off = await setShopPlan({ slug: t.shop.slug, status: 'INACTIVE' });
    expect(off.shop.subscriptionStatus).toBe('INACTIVE');
  });

  it('rejects an unknown shop', async () => {
    await expect(setShopPlan({ slug: 'nope', plan: 'TEAM' })).rejects.toThrow(
      /No shop with slug/,
    );
  });
});
