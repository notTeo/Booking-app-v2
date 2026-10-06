import { describe, it, expect, vi } from 'vitest';
import { serve } from './testRequest';
import { prisma } from '../utils/prisma';
import { authHeader, createTenant, type Tenant } from './helpers';
import { loadApp } from './routeRegistry';
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
