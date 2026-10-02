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

// A shop must always keep at least one owner who can actually sign in and
// manage it. Staff can never change roles, their own included.

const { app } = await loadApp();
const api = await serve(app);

const member = (t: Tenant, memberId: string) =>
  `/api/shops/${t.shop.id}/team/${memberId}`;
const setRole = (t: Tenant, memberId: string, role: string, token = t.token) =>
  api.patch(member(t, memberId)).set(authHeader(token)).send({ role });
const remove = (t: Tenant, memberId: string, token = t.token) =>
  api.delete(member(t, memberId)).set(authHeader(token));

const roleOf = async (memberId: string) =>
  (await prisma.userShop.findUnique({ where: { id: memberId } }))?.role ?? null;

describe('the only owner', () => {
  it('cannot be removed', async () => {
    const t = await createTenant('Sole');
    const res = await remove(t, t.staff.id);

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Cannot remove the only owner');
    expect(await roleOf(t.staff.id)).toBe('owner');
  });

  it('cannot demote themself', async () => {
    const t = await createTenant('Sole');
    const res = await setRole(t, t.staff.id, 'staff');

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Cannot demote the only owner');
    expect(await roleOf(t.staff.id)).toBe('owner');
  });

  it('cannot be set inactive', async () => {
    const t = await createTenant('Sole');
    const res = await api
      .patch(member(t, t.staff.id))
      .set(authHeader(t.token))
      .send({ role: 'owner', active: false });

    expect(res.status).toBe(400);
    expect(
      (await prisma.userShop.findUniqueOrThrow({ where: { id: t.staff.id } }))
        .active,
    ).toBe(true);
  });

  it('still cannot leave while the other members are only staff', async () => {
    const t = await createTenant('Sole');
    await createStaffMember(t);

    expect((await remove(t, t.staff.id)).status).toBe(400);
    expect((await setRole(t, t.staff.id, 'staff')).status).toBe(400);
    expect(await roleOf(t.staff.id)).toBe('owner');
  });
});

describe('with two owners', () => {
  it('one may step down; the one left is then protected', async () => {
    const t = await createTenant('Two');
    const second = await addSecondOwner(t);

    expect((await setRole(t, t.staff.id, 'staff')).status).toBe(200);
    expect(await roleOf(t.staff.id)).toBe('staff');

    // The remaining owner cannot follow.
    expect(
      (await setRole(t, second.staff.id, 'staff', second.token)).status,
    ).toBe(400);
    expect((await remove(t, second.staff.id, second.token)).status).toBe(400);
    expect(await roleOf(second.staff.id)).toBe('owner');
  });

  it('one may remove the other; the one left is then protected', async () => {
    const t = await createTenant('Two');
    const second = await addSecondOwner(t);

    expect((await remove(t, second.staff.id)).status).toBe(200);
    expect(await roleOf(second.staff.id)).toBeNull();
    expect((await remove(t, t.staff.id)).status).toBe(400);
    expect(await roleOf(t.staff.id)).toBe('owner');
  });

  it('one may demote the other; the one left is then protected', async () => {
    const t = await createTenant('Two');
    const second = await addSecondOwner(t);

    expect((await setRole(t, second.staff.id, 'staff')).status).toBe(200);
    expect(await roleOf(second.staff.id)).toBe('staff');
    expect((await setRole(t, t.staff.id, 'staff')).status).toBe(400);
  });
});

describe('an owner nobody can sign in as does not count', () => {
  // A team member with the owner role but no login (added from the team page,
  // invite not sent or not yet accepted) cannot manage the shop.
  const ghostOwner = async (t: Tenant) => {
    const res = await api
      .post(`/api/shops/${t.shop.id}/team`)
      .set(authHeader(t.token))
      .send({ name: 'Ghost', role: 'owner', sendEmail: false });
    expect(res.status).toBe(201);
    expect(res.body.data.userId).toBeNull();
  };

  it('the real owner cannot demote themself and leave only the login-less one', async () => {
    const t = await createTenant('Ghosted');
    await ghostOwner(t);

    expect((await setRole(t, t.staff.id, 'staff')).status).toBe(400);
    expect(await roleOf(t.staff.id)).toBe('owner');
  });

  it('the real owner cannot remove themself and leave only the login-less one', async () => {
    const t = await createTenant('Ghosted');
    await ghostOwner(t);

    expect((await remove(t, t.staff.id)).status).toBe(400);
    expect(await roleOf(t.staff.id)).toBe('owner');
  });
});

describe('a deactivated owner does not count either', () => {
  it('the active owner cannot demote or remove themself', async () => {
    const t = await createTenant('Inactive');
    const second = await addSecondOwner(t);
    await prisma.userShop.update({
      where: { id: second.staff.id },
      data: { active: false },
    });

    expect((await setRole(t, t.staff.id, 'staff')).status).toBe(400);
    expect((await remove(t, t.staff.id)).status).toBe(400);
    expect(await roleOf(t.staff.id)).toBe('owner');
  });
});

describe('staff cannot change roles', () => {
  it('not their own, not anyone else’s, and cannot remove anyone', async () => {
    const t = await createTenant('Roles');
    const staff = await createStaffMember(t, 'Climber');
    const other = await createStaffMember(t, 'Other');

    const attempts = [
      await setRole(t, staff.staff.id, 'owner', staff.token),
      await setRole(t, other.staff.id, 'owner', staff.token),
      await setRole(t, t.staff.id, 'staff', staff.token),
      await remove(t, t.staff.id, staff.token),
      await remove(t, other.staff.id, staff.token),
      await api
        .post(`/api/shops/${t.shop.id}/team`)
        .set(authHeader(staff.token))
        .send({ name: 'Friend', role: 'owner', sendEmail: false }),
    ];

    for (const res of attempts) expect(res.status).toBe(403);
    expect(await roleOf(staff.staff.id)).toBe('staff');
    expect(await roleOf(other.staff.id)).toBe('staff');
    expect(await roleOf(t.staff.id)).toBe('owner');
    expect(await prisma.userShop.count({ where: { shopId: t.shop.id } })).toBe(
      3,
    );
  });

  it('a promoted member really is an owner afterwards, and only the owner could do it', async () => {
    const t = await createTenant('Roles');
    const staff = await createStaffMember(t, 'Promoted');

    expect((await setRole(t, staff.staff.id, 'owner')).status).toBe(200);
    const ownerOnly = await api
      .patch(`/api/shops/${t.shop.id}`)
      .set(authHeader(staff.token))
      .send({ name: 'Renamed By New Owner' });
    expect(ownerOnly.status).toBe(200);
  });
});
