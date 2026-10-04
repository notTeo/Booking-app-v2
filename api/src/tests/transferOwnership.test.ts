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

vi.mock('../services/email.service');

// The owner hands the shop to a manager: the two swap roles in one step, so
// the shop never has zero or two owners.

const { app } = await loadApp();
const api = await serve(app);

const transfer = (t: Tenant, memberId: string, token = t.token) =>
  api
    .post(`/api/shops/${t.shop.id}/team/${memberId}/transfer-ownership`)
    .set(authHeader(token));

const roles = async (t: Tenant) =>
  Object.fromEntries(
    (await prisma.userShop.findMany({ where: { shopId: t.shop.id } })).map(
      (m) => [m.id, m.role],
    ),
  );

describe('POST /api/shops/:shopId/team/:memberId/transfer-ownership', () => {
  it('the manager becomes the owner and the old owner becomes a manager', async () => {
    const t = await createTenant('Handover');
    const manager = await addManager(t);

    const res = await transfer(t, manager.staff.id);

    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect(res.body.data.role).toBe('owner');
    expect(await roles(t)).toEqual({
      [t.staff.id]: 'manager',
      [manager.staff.id]: 'owner',
    });
  });

  it('the new owner can delete the shop; the old one no longer can', async () => {
    const t = await createTenant('Handover');
    const manager = await addManager(t);
    await transfer(t, manager.staff.id);

    const byOld = await api
      .delete(`/api/shops/${t.shop.id}`)
      .set(authHeader(t.token));
    expect(byOld.status).toBe(403);
    const byNew = await api
      .delete(`/api/shops/${t.shop.id}`)
      .set(authHeader(manager.token));
    expect(byNew.status).toBeLessThan(300);
  });

  it('afterwards the old owner can be removed, or delete their account', async () => {
    const t = await createTenant('Handover');
    const manager = await addManager(t);
    await transfer(t, manager.staff.id);

    const gone = await api.delete('/user/me').set(authHeader(t.token)).send({});
    expect(gone.status, JSON.stringify(gone.body)).toBe(200);
    expect(await roles(t)).toEqual({ [manager.staff.id]: 'owner' });
  });

  it('only the owner can transfer', async () => {
    const t = await createTenant('Handover');
    const manager = await addManager(t);
    const other = await addManager(t, 'Other');
    const staff = await createStaffMember(t);

    expect((await transfer(t, other.staff.id, manager.token)).status).toBe(403);
    expect((await transfer(t, manager.staff.id, manager.token)).status).toBe(
      403,
    );
    expect((await transfer(t, manager.staff.id, staff.token)).status).toBe(403);
    expect((await roles(t))[t.staff.id]).toBe('owner');
  });

  it('refuses a target who is staff, inactive, without a login, or the owner', async () => {
    const t = await createTenant('Handover');
    const staff = await createStaffMember(t);
    const inactive = await addManager(t, 'Inactive');
    await prisma.userShop.update({
      where: { id: inactive.staff.id },
      data: { active: false },
    });
    const ghost = await prisma.userShop.create({
      data: { shopId: t.shop.id, name: 'Ghost', role: 'manager' },
    });

    for (const id of [staff.staff.id, inactive.staff.id, ghost.id, t.staff.id])
      expect((await transfer(t, id)).status, id).toBe(400);
    expect((await roles(t))[t.staff.id]).toBe('owner');
  });

  it('404s for a member of another shop', async () => {
    const t = await createTenant('Handover');
    const other = await createTenant('Elsewhere');
    const theirs = await addManager(other);

    expect((await transfer(t, theirs.staff.id)).status).toBe(404);
    expect((await roles(other))[other.staff.id]).toBe('owner');
  });
});
