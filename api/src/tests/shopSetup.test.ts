import { describe, it, expect, vi } from 'vitest';
import { serve } from './testRequest';
import { prisma } from '../utils/prisma';
import {
  addWeeklySchedule,
  authHeader,
  createStaffMember,
  createTenant,
  type Tenant,
} from './helpers';
import { loadApp } from './routeRegistry';

vi.mock('../services/email.service');

// What an owner has set up so far, read from the shop's own data.

const { app } = await loadApp();
const api = await serve(app);

const getSetup = (t: Tenant, token = t.token) =>
  api.get(`/api/shops/${t.shop.id}/setup`).set(authHeader(token));

// createTenant adds a service; a newly created shop has none.
const emptyTenant = async () => {
  const t = await createTenant('Fresh');
  await prisma.service.deleteMany({ where: { shopId: t.shop.id } });
  return t;
};

describe('GET /api/shops/:id/setup', () => {
  it('has nothing done for a new shop', async () => {
    const t = await emptyTenant();

    const res = await getSetup(t);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      hasHours: false,
      hasServices: false,
      hasTeam: false,
      hasProducts: false,
      ownerMemberId: t.staff.id,
    });
  });

  it('counts working hours once a day is open', async () => {
    const t = await emptyTenant();
    const schedule = await addWeeklySchedule(t, {
      closedDays: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'],
    });
    expect((await getSetup(t)).body.data.hasHours).toBe(false);

    await prisma.shopWorkingDay.update({
      where: { scheduleId_day: { scheduleId: schedule.id, day: 'MON' } },
      data: { isOpen: true },
    });
    expect((await getSetup(t)).body.data.hasHours).toBe(true);
  });

  it('counts a service, a second active member and a product', async () => {
    const t = await emptyTenant();
    await prisma.service.create({
      data: { shopId: t.shop.id, name: 'Cut', duration: 30, price: 2000 },
    });
    await createStaffMember(t);
    await prisma.product.create({
      data: { shopId: t.shop.id, name: 'Wax', price: 900 },
    });

    expect((await getSetup(t)).body.data).toMatchObject({
      hasServices: true,
      hasTeam: true,
      hasProducts: true,
    });
  });

  it('does not count a deactivated member as a team', async () => {
    const t = await emptyTenant();
    const { staff } = await createStaffMember(t);
    await prisma.userShop.update({
      where: { id: staff.id },
      data: { active: false },
    });

    expect((await getSetup(t)).body.data.hasTeam).toBe(false);
  });

  it('is for the owner only', async () => {
    const t = await emptyTenant();
    const staff = await createStaffMember(t);

    expect((await getSetup(t, staff.token)).status).toBe(403);
  });
});
