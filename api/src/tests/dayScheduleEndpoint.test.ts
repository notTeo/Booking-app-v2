import { describe, it, expect, vi } from 'vitest';
import app from '../app';
import { serve } from './testRequest';
import { prisma } from '../utils/prisma';
import {
  addWeeklySchedule,
  authHeader,
  createStaffMember,
  createTenant,
  type Tenant,
} from './helpers';

const api = await serve(app);

vi.mock('../services/email.service');

const TUE = '2026-12-08';
const SUN = '2026-12-06';

const dayReq = (t: Tenant, date: string | undefined, token = t.token) =>
  api
    .get(
      `/api/shops/${t.shop.id}/schedules/day${date === undefined ? '' : `?date=${date}`}`,
    )
    .set(authHeader(token));

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const;
async function schedule(
  t: Tenant,
  staffId: string | null,
  ranges: Partial<Record<(typeof DAYS)[number], [string, string][]>>,
  opts: { startDate?: string; endDate?: string } = {},
) {
  return prisma.shopWorkingSchedule.create({
    data: {
      shopId: t.shop.id,
      staffId,
      startDate: new Date(`${opts.startDate ?? '2026-01-01'}T00:00:00.000Z`),
      endDate: opts.endDate ? new Date(`${opts.endDate}T00:00:00.000Z`) : null,
      days: {
        create: DAYS.map((day) => {
          const r = ranges[day];
          return r
            ? {
                day,
                isOpen: true,
                hours: {
                  create: r.map(([startTime, endTime]) => ({
                    startTime,
                    endTime,
                  })),
                },
              }
            : { day, isOpen: false };
        }),
      },
    },
  });
}

describe('GET /api/shops/:shopId/schedules/day', () => {
  it("returns each member's own opening ranges for that date", async () => {
    const t = await createTenant('Day');
    const maria = await createStaffMember(t, 'Maria');
    await addWeeklySchedule(t, { open: '09:00', close: '17:00' }); // owner
    await schedule(t, maria.staff.id, { TUE: [['10:00', '18:00']] });

    const res = await dayReq(t, TUE);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      [t.staff.id]: [{ startTime: '09:00', endTime: '17:00' }],
      [maria.staff.id]: [{ startTime: '10:00', endTime: '18:00' }],
    });
  });

  it('split shifts come back as separate ranges in time order', async () => {
    const t = await createTenant('Day');
    await schedule(t, t.staff.id, {
      TUE: [
        ['15:00', '19:00'],
        ['09:00', '12:00'],
      ],
    });
    const res = await dayReq(t, TUE);
    expect(res.body.data[t.staff.id]).toEqual([
      { startTime: '09:00', endTime: '12:00' },
      { startTime: '15:00', endTime: '19:00' },
    ]);
  });

  it('a provider with no schedule, or a day off, is null (closed)', async () => {
    const t = await createTenant('Day');
    const noSchedule = await createStaffMember(t, 'NoSched');
    const dayOff = await createStaffMember(t, 'DayOff');
    await schedule(t, dayOff.staff.id, { MON: [['09:00', '17:00']] }); // not Tuesday
    const res = await dayReq(t, TUE);
    expect(res.body.data[noSchedule.staff.id]).toBeNull();
    expect(res.body.data[dayOff.staff.id]).toBeNull();
    expect(res.body.data[t.staff.id]).toBeNull(); // owner has no schedule either
  });

  it('a closed weekday is null', async () => {
    const t = await createTenant('Day');
    await addWeeklySchedule(t, { closedDays: ['SUN'] });
    expect((await dayReq(t, SUN)).body.data[t.staff.id]).toBeNull();
    expect((await dayReq(t, TUE)).body.data[t.staff.id]).not.toBeNull();
  });

  it('respects the schedule start and end dates', async () => {
    const t = await createTenant('Day');
    await schedule(
      t,
      t.staff.id,
      { TUE: [['09:00', '17:00']] },
      { startDate: '2026-12-10' }, // starts after the requested Tuesday
    );
    expect((await dayReq(t, TUE)).body.data[t.staff.id]).toBeNull();
    expect((await dayReq(t, '2026-12-15')).body.data[t.staff.id]).toEqual([
      { startTime: '09:00', endTime: '17:00' },
    ]);
    const t2 = await createTenant('Day');
    await schedule(
      t2,
      t2.staff.id,
      { TUE: [['09:00', '17:00']] },
      { endDate: '2026-12-01' },
    );
    expect((await dayReq(t2, TUE)).body.data[t2.staff.id]).toBeNull();
  });

  it('includes inactive members and members without a login (their bookings still show on the calendar)', async () => {
    const t = await createTenant('Day');
    const inactive = await createStaffMember(t, 'Gone');
    await prisma.userShop.update({
      where: { id: inactive.staff.id },
      data: { active: false },
    });
    const noLogin = await prisma.userShop.create({
      data: { shopId: t.shop.id, role: 'staff', name: 'NoLogin' },
    });
    const res = await dayReq(t, TUE);
    expect(Object.keys(res.body.data).sort()).toEqual(
      [t.staff.id, inactive.staff.id, noLogin.id].sort(),
    );
  });

  it("never includes another shop's members", async () => {
    const A = await createTenant('Day');
    const B = await createTenant('Other');
    await addWeeklySchedule(B);
    const res = await dayReq(A, TUE);
    expect(Object.keys(res.body.data)).toEqual([A.staff.id]);
  });

  it('any member may call it; anonymous is 401; a non-member is 404', async () => {
    const t = await createTenant('Day');
    const staffer = await createStaffMember(t);
    const other = await createTenant('Other');
    expect((await dayReq(t, TUE, staffer.token)).status).toBe(200);
    expect(
      (await api.get(`/api/shops/${t.shop.id}/schedules/day?date=${TUE}`))
        .status,
    ).toBe(401);
    expect((await dayReq(t, TUE, other.token)).status).toBe(404);
  });

  it.each([undefined, '', '2026-12-8', '2026-13-01', '2026-02-30', 'tomorrow'])(
    'rejects the date %j with 400',
    async (bad) => {
      const t = await createTenant('Day');
      expect((await dayReq(t, bad)).status).toBe(400);
    },
  );
});
