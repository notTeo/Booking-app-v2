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

// A shop has exactly one owner. Nobody but the owner can touch the owner's
// membership, the owner role is never handed out through the team endpoints,
// and managers run the shop without being able to delete it. Staff can never
// change roles, their own included.

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

const ownerCount = (t: Tenant) =>
  prisma.userShop.count({ where: { shopId: t.shop.id, role: 'owner' } });

describe('the owner', () => {
  it('cannot be removed, not even by themself', async () => {
    const t = await createTenant('Sole');
    const res = await remove(t, t.staff.id);

    expect(res.status).toBe(400);
    expect(await roleOf(t.staff.id)).toBe('owner');
  });

  it('cannot demote themself, to manager or to staff', async () => {
    const t = await createTenant('Sole');
    await addManager(t);

    expect((await setRole(t, t.staff.id, 'manager')).status).toBe(400);
    expect((await setRole(t, t.staff.id, 'staff')).status).toBe(400);
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

  it('can still edit the rest of their own membership', async () => {
    const t = await createTenant('Sole');
    const res = await api
      .patch(member(t, t.staff.id))
      .set(authHeader(t.token))
      .send({ role: 'owner', bookableByCustomers: false });

    expect(res.status).toBe(200);
    expect(res.body.data.role).toBe('owner');
    expect(res.body.data.bookableByCustomers).toBe(false);
  });
});

describe('a manager', () => {
  it('cannot remove, demote, deactivate or otherwise edit the owner', async () => {
    const t = await createTenant('Managed');
    const manager = await addManager(t);

    const attempts = [
      await remove(t, t.staff.id, manager.token),
      await setRole(t, t.staff.id, 'manager', manager.token),
      await setRole(t, t.staff.id, 'staff', manager.token),
      await setRole(t, t.staff.id, 'owner', manager.token),
      await api
        .patch(member(t, t.staff.id))
        .set(authHeader(manager.token))
        .send({ role: 'owner', active: false }),
    ];

    for (const res of attempts) expect(res.status).toBe(403);
    const owner = await prisma.userShop.findUniqueOrThrow({
      where: { id: t.staff.id },
    });
    expect(owner.role).toBe('owner');
    expect(owner.active).toBe(true);
  });

  it('cannot delete the shop or transfer its ownership', async () => {
    const t = await createTenant('Managed');
    const manager = await addManager(t);
    const other = await addManager(t, 'Other');

    const del = await api
      .delete(`/api/shops/${t.shop.id}`)
      .set(authHeader(manager.token));
    expect(del.status).toBe(403);
    const transfer = await api
      .post(`${member(t, other.staff.id)}/transfer-ownership`)
      .set(authHeader(manager.token));
    expect(transfer.status).toBe(403);

    expect(
      await prisma.shop.findUnique({ where: { id: t.shop.id } }),
    ).not.toBeNull();
    expect(await roleOf(t.staff.id)).toBe('owner');
  });

  it('cannot take the shop offline or bring it back, but can save settings that leave it as is', async () => {
    const t = await createTenant('Managed');
    const manager = await addManager(t);
    const patch = (body: object, token = manager.token) =>
      api.patch(`/api/shops/${t.shop.id}`).set(authHeader(token)).send(body);
    const isActive = async () =>
      (await prisma.shop.findUniqueOrThrow({ where: { id: t.shop.id } }))
        .isActive;

    expect((await patch({ isActive: false })).status).toBe(403);
    expect(await isActive()).toBe(true);
    // The settings form sends the unchanged value along with every save.
    expect((await patch({ name: 'Still Open', isActive: true })).status).toBe(
      200,
    );

    expect((await patch({ isActive: false }, t.token)).status).toBe(200);
    expect((await patch({ isActive: true })).status).toBe(403);
    expect(await isActive()).toBe(false);
  });

  it('cannot export or erase a customer’s data', async () => {
    const t = await createTenant('Managed');
    const manager = await addManager(t);
    const customer = await prisma.customer.create({
      data: { shopId: t.shop.id, name: 'Cust', phone: '6900000001' },
    });
    const url = `/api/shops/${t.shop.id}/customers/${customer.id}`;

    expect(
      (await api.get(`${url}/export`).set(authHeader(manager.token))).status,
    ).toBe(403);
    expect((await api.delete(url).set(authHeader(manager.token))).status).toBe(
      403,
    );
    expect(
      await prisma.customer.findUnique({ where: { id: customer.id } }),
    ).not.toBeNull();
  });

  it('runs the shop: settings, and adding, promoting, demoting and removing members', async () => {
    const t = await createTenant('Managed');
    const manager = await addManager(t);
    const other = await addManager(t, 'Other');
    const staff = await createStaffMember(t, 'Climber');

    const rename = await api
      .patch(`/api/shops/${t.shop.id}`)
      .set(authHeader(manager.token))
      .send({ name: 'Renamed By Manager' });
    expect(rename.status).toBe(200);

    const added = await api
      .post(`/api/shops/${t.shop.id}/team`)
      .set(authHeader(manager.token))
      .send({ name: 'Deputy', role: 'manager', sendEmail: false });
    expect(added.status).toBe(201);
    expect(added.body.data.role).toBe('manager');

    expect(
      (await setRole(t, staff.staff.id, 'manager', manager.token)).status,
    ).toBe(200);
    expect(await roleOf(staff.staff.id)).toBe('manager');
    expect(
      (await setRole(t, other.staff.id, 'staff', manager.token)).status,
    ).toBe(200);
    expect(await roleOf(other.staff.id)).toBe('staff');
    expect((await remove(t, other.staff.id, manager.token)).status).toBe(200);
    expect(await roleOf(other.staff.id)).toBeNull();
  });
});

describe('the owner role is never handed out', () => {
  it('not when adding a member', async () => {
    const t = await createTenant('One');
    const res = await api
      .post(`/api/shops/${t.shop.id}/team`)
      .set(authHeader(t.token))
      .send({ name: 'Ghost', role: 'owner', sendEmail: false });

    expect(res.status).toBe(400);
    expect(await ownerCount(t)).toBe(1);
  });

  it('not by promoting a manager or staff, whoever asks', async () => {
    const t = await createTenant('One');
    const manager = await addManager(t);
    const staff = await createStaffMember(t);

    expect((await setRole(t, manager.staff.id, 'owner')).status).toBe(400);
    expect((await setRole(t, staff.staff.id, 'owner')).status).toBe(400);
    expect(
      (await setRole(t, staff.staff.id, 'owner', manager.token)).status,
    ).toBe(400);
    expect(await ownerCount(t)).toBe(1);
    expect(await roleOf(t.staff.id)).toBe('owner');
  });
});

describe('staff cannot change roles', () => {
  it('not their own, not anyone else’s, and cannot remove anyone', async () => {
    const t = await createTenant('Roles');
    const staff = await createStaffMember(t, 'Climber');
    const other = await createStaffMember(t, 'Other');

    const attempts = [
      await setRole(t, staff.staff.id, 'manager', staff.token),
      await setRole(t, other.staff.id, 'manager', staff.token),
      await setRole(t, t.staff.id, 'staff', staff.token),
      await remove(t, t.staff.id, staff.token),
      await remove(t, other.staff.id, staff.token),
      await api
        .post(`/api/shops/${t.shop.id}/team`)
        .set(authHeader(staff.token))
        .send({ name: 'Friend', role: 'manager', sendEmail: false }),
    ];

    for (const res of attempts) expect(res.status).toBe(403);
    expect(await roleOf(staff.staff.id)).toBe('staff');
    expect(await roleOf(other.staff.id)).toBe('staff');
    expect(await roleOf(t.staff.id)).toBe('owner');
    expect(await prisma.userShop.count({ where: { shopId: t.shop.id } })).toBe(
      3,
    );
  });
});
