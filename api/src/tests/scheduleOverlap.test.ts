import { describe, it, expect } from 'vitest';
import app from '../app';
import { serve } from './testRequest';
import { prisma } from '../utils/prisma';
import {
  createSchedule,
  updateSchedule,
} from '../services/workingHours.service';
import {
  authHeader,
  createStaffMember,
  createTenant,
  type Tenant,
} from './helpers';

const api = await serve(app);

// Rule under test: for each team member no two ACTIVE schedules may share a
// date — whichever path changes a schedule. Team members' schedules are the
// only working hours; the owner (t.staff) is the default member here.

const conflict = { statusCode: 409 };

async function pair(label: string) {
  const t = await createTenant(label);
  const a = await createSchedule(
    t.user.id,
    t.shop.id,
    {
      startDate: '2027-02-01',
      endDate: '2027-04-30',
    },
    t.staff.id,
  );
  return { t, a };
}

const make = (
  t: Tenant,
  dto: Parameters<typeof createSchedule>[2],
  staffId: string = t.staff.id,
) => createSchedule(t.user.id, t.shop.id, dto, staffId);

const edit = (
  t: Tenant,
  id: string,
  dto: Parameters<typeof updateSchedule>[3],
  staffId: string = t.staff.id,
) => updateSchedule(t.user.id, t.shop.id, id, dto, staffId);

describe('create', () => {
  it.each([
    ['starts inside', '2027-03-01', '2027-06-01'],
    ['ends inside', '2026-12-01', '2027-03-01'],
    ['sits fully inside', '2027-03-01', '2027-03-15'],
    ['fully contains', '2026-12-01', '2027-06-01'],
    ['identical range', '2027-02-01', '2027-04-30'],
  ])(
    'rejects a schedule that %s an active one',
    async (_n, startDate, endDate) => {
      const { t } = await pair('create-overlap');
      await expect(make(t, { startDate, endDate })).rejects.toMatchObject(
        conflict,
      );
    },
  );

  it('rejects an open-ended schedule that reaches into an active one', async () => {
    const { t } = await pair('create-open');
    await expect(make(t, { startDate: '2027-03-01' })).rejects.toMatchObject(
      conflict,
    );
  });

  it('rejects anything new while an active open-ended schedule exists, and names it', async () => {
    const t = await createTenant('create-blocked');
    await make(t, { startDate: '2027-01-01' });
    await expect(
      make(t, { startDate: '2027-06-01', endDate: '2027-07-01' }),
    ).rejects.toMatchObject({
      ...conflict,
      message: expect.stringContaining('2027-01-01 has no end date'),
    });
  });

  it('names the schedule it collides with', async () => {
    const { t } = await pair('create-names');
    await expect(
      make(t, { startDate: '2027-03-01', endDate: '2027-05-01' }),
    ).rejects.toMatchObject({
      ...conflict,
      message: expect.stringContaining('2027-02-01 to 2027-04-30'),
    });
  });

  it.each([
    ['before', '2026-11-01', '2027-01-31'],
    ['after', '2027-05-15', '2027-06-30'],
    ['touching the end', '2027-04-30', '2027-06-30'],
    ['touching the start', '2026-12-01', '2027-02-01'],
  ])(
    'allows a schedule that is %s an active one',
    async (_n, startDate, endDate) => {
      const { t } = await pair('create-ok');
      await expect(make(t, { startDate, endDate })).resolves.toBeTruthy();
    },
  );

  it('allows an overlapping schedule when it is created inactive', async () => {
    const { t } = await pair('create-inactive');
    await expect(
      make(t, {
        startDate: '2027-03-01',
        endDate: '2027-03-31',
        isActive: false,
      }),
    ).resolves.toBeTruthy();
  });

  it('ignores inactive schedules when checking', async () => {
    const t = await createTenant('create-ignore-inactive');
    await make(t, { startDate: '2027-01-01', isActive: false }); // open-ended but off
    await expect(make(t, { startDate: '2027-03-01' })).resolves.toBeTruthy();
  });

  it('rejects an end date before the start date', async () => {
    const t = await createTenant('create-range');
    await expect(
      make(t, { startDate: '2027-05-01', endDate: '2027-04-01' }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});

describe('edit dates of an active schedule', () => {
  async function two(label: string) {
    const t = await createTenant(label);
    const a = await make(t, { startDate: '2027-01-01', endDate: '2027-03-31' });
    const b = await make(t, { startDate: '2027-04-01', endDate: '2027-06-30' });
    return { t, a, b };
  }

  it('rejects extending the end into another schedule', async () => {
    const { t, a } = await two('edit-extend');
    await expect(
      edit(t, a.id, { endDate: '2027-05-01' }),
    ).rejects.toMatchObject(conflict);
  });

  it('rejects moving the start back into another schedule', async () => {
    const { t, b } = await two('edit-start');
    await expect(
      edit(t, b.id, { startDate: '2027-03-15' }),
    ).rejects.toMatchObject(conflict);
  });

  it('rejects clearing the end date when a later schedule exists', async () => {
    const { t, a } = await two('edit-clear');
    await expect(
      edit(t, a.id, { endDate: null as unknown as undefined }),
    ).rejects.toMatchObject(conflict);
  });

  it('allows shrinking a schedule', async () => {
    const { t, a } = await two('edit-shrink');
    await expect(
      edit(t, a.id, { endDate: '2027-02-28' }),
    ).resolves.toBeTruthy();
  });

  it('allows saving unchanged dates (e.g. when only the days were edited)', async () => {
    const { t, a } = await two('edit-same');
    await expect(
      edit(t, a.id, { startDate: '2027-01-01', endDate: '2027-03-31' }),
    ).resolves.toBeTruthy();
  });

  it('rejects an end date before the start date', async () => {
    const { t, a } = await two('edit-range');
    await expect(
      edit(t, a.id, { endDate: '2026-12-01' }),
    ).rejects.toMatchObject({
      statusCode: 400,
    });
  });
});

describe('turning schedules on and off', () => {
  it('rejects turning on a schedule that overlaps an active one', async () => {
    const { t, a } = await pair('toggle-on-bad');
    const off = await make(t, {
      startDate: '2027-03-01',
      endDate: '2027-03-31',
      isActive: false,
    });
    await expect(edit(t, off.id, { isActive: true })).rejects.toMatchObject(
      conflict,
    );
    expect(a.isActive).toBe(true);
  });

  it('allows turning on a schedule that does not overlap', async () => {
    const { t } = await pair('toggle-on-ok');
    const off = await make(t, {
      startDate: '2027-06-01',
      endDate: '2027-06-30',
      isActive: false,
    });
    await expect(edit(t, off.id, { isActive: true })).resolves.toBeTruthy();
  });

  it('always allows turning a schedule off', async () => {
    const { t, a } = await pair('toggle-off');
    await expect(edit(t, a.id, { isActive: false })).resolves.toMatchObject({
      isActive: false,
    });
  });

  it('lets an inactive schedule be edited into an overlap, but not turned on', async () => {
    const { t } = await pair('inactive-edit');
    const off = await make(t, {
      startDate: '2027-06-01',
      endDate: '2027-06-30',
      isActive: false,
    });
    const moved = await edit(t, off.id, {
      startDate: '2027-03-01',
      endDate: '2027-03-31',
    });
    expect(moved.isActive).toBe(false);
    await expect(edit(t, off.id, { isActive: true })).rejects.toMatchObject(
      conflict,
    );
  });

  it('allows switching one off and creating a replacement over the same dates', async () => {
    const { t, a } = await pair('swap');
    await edit(t, a.id, { isActive: false });
    await expect(
      make(t, { startDate: '2027-02-01', endDate: '2027-04-30' }),
    ).resolves.toBeTruthy();
  });
});

describe('scopes', () => {
  it("a staff member's own schedules may not overlap each other", async () => {
    const t = await createTenant('scope-staff-own');
    await make(
      t,
      { startDate: '2027-02-01', endDate: '2027-04-30' },
      t.staff.id,
    );
    await expect(
      make(t, { startDate: '2027-03-01', endDate: '2027-05-01' }, t.staff.id),
    ).rejects.toMatchObject(conflict);
  });

  it('different staff members may have the same dates', async () => {
    const t = await createTenant('scope-two-staff');
    const other = await createStaffMember(t);
    await make(
      t,
      { startDate: '2027-02-01', endDate: '2027-04-30' },
      t.staff.id,
    );
    await expect(
      make(
        t,
        { startDate: '2027-02-01', endDate: '2027-04-30' },
        other.staff.id,
      ),
    ).resolves.toBeTruthy();
  });

  it('different shops never affect each other', async () => {
    await pair('scope-shop-a');
    const other = await createTenant('scope-shop-b');
    await expect(
      make(other, { startDate: '2027-02-01', endDate: '2027-04-30' }),
    ).resolves.toBeTruthy();
  });
});

describe('team-member schedule routes', () => {
  it('POST overlap on a staff member returns 409, other staff unaffected', async () => {
    const t = await createTenant('http-team');
    const other = await createStaffMember(t);
    const base = `/api/shops/${t.shop.id}/team`;
    const post = (memberId: string, body: object) =>
      api
        .post(`${base}/${memberId}/schedules`)
        .set(authHeader(t.token))
        .send(body);

    expect(
      (
        await post(t.staff.id, {
          startDate: '2027-02-01',
          endDate: '2027-04-30',
        })
      ).status,
    ).toBe(201);
    const clash = await post(t.staff.id, {
      startDate: '2027-03-01',
      endDate: '2027-05-01',
    });
    expect(clash.status).toBe(409);
    expect(clash.body.message).toContain('2027-02-01 to 2027-04-30');
    expect(
      (
        await post(other.staff.id, {
          startDate: '2027-03-01',
          endDate: '2027-05-01',
        })
      ).status,
    ).toBe(201);
  });
});

describe('days routes cannot change overlap state', () => {
  it('PUT days keeps dates and active flag untouched', async () => {
    const { t, a } = await pair('http-days');
    const res = await api
      .put(`/api/shops/${t.shop.id}/team/${t.staff.id}/schedules/${a.id}/days`)
      .set(authHeader(t.token))
      .send({
        days: [
          {
            day: 'MON',
            isOpen: true,
            hours: [{ startTime: '09:00', endTime: '17:00' }],
          },
        ],
      });
    expect(res.status).toBe(200);
    const after = await prisma.shopWorkingSchedule.findUnique({
      where: { id: a.id },
    });
    expect(after?.isActive).toBe(true);
    expect(after?.startDate.toISOString().slice(0, 10)).toBe('2027-02-01');
    expect(after?.endDate?.toISOString().slice(0, 10)).toBe('2027-04-30');
  });
});

describe('HTTP routes (validators + error body)', () => {
  const url = (t: Tenant, id = '') =>
    `/api/shops/${t.shop.id}/team/${t.staff.id}/schedules${id ? `/${id}` : ''}`;

  it('PATCH accepts endDate: null to clear the end date', async () => {
    const t = await createTenant('http-null');
    const a = await make(t, { startDate: '2027-01-01', endDate: '2027-03-31' });
    const res = await api
      .patch(url(t, a.id))
      .set(authHeader(t.token))
      .send({ startDate: '2027-01-01', endDate: null });
    expect(res.status).toBe(200);
    expect(res.body.data.endDate).toBeNull();
  });

  it('PATCH still rejects a malformed endDate', async () => {
    const t = await createTenant('http-bad-date');
    const a = await make(t, { startDate: '2027-01-01', endDate: '2027-03-31' });
    const res = await api
      .patch(url(t, a.id))
      .set(authHeader(t.token))
      .send({ endDate: 'not-a-date' });
    expect(res.status).toBe(400);
  });

  it('POST overlap returns 409 with a readable message field', async () => {
    const { t } = await pair('http-create');
    const res = await api
      .post(url(t))
      .set(authHeader(t.token))
      .send({ startDate: '2027-03-01', endDate: '2027-05-01' });
    expect(res.status).toBe(409);
    expect(res.body.message).toContain('2027-02-01 to 2027-04-30');
  });

  it('PATCH into an overlap returns 409 with a readable message field', async () => {
    const t = await createTenant('http-patch');
    await make(t, { startDate: '2027-01-01', endDate: '2027-03-31' });
    const b = await make(t, { startDate: '2027-04-01', endDate: '2027-06-30' });
    const res = await api
      .patch(url(t, b.id))
      .set(authHeader(t.token))
      .send({ startDate: '2027-03-01', endDate: '2027-06-30' });
    expect(res.status).toBe(409);
    expect(res.body.message).toContain('overlap');
  });
});

// Two requests racing can both pass the application check; the database
// exclusion constraint (ShopWorkingSchedule_no_overlap) makes exactly one win.
describe('concurrency', () => {
  it('two parallel creates over the same dates: exactly one succeeds, the other gets the friendly 409', async () => {
    const t = await createTenant('race');
    const results = await Promise.allSettled([
      make(t, { startDate: '2027-02-01', endDate: '2027-04-30' }),
      make(t, { startDate: '2027-02-01', endDate: '2027-04-30' }),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const rejected = results.find(
      (r) => r.status === 'rejected',
    ) as PromiseRejectedResult;
    expect(rejected.reason).toMatchObject({
      statusCode: 409,
      message: expect.stringContaining('overlap'),
    });
  });

  it('two parallel activations of overlapping inactive schedules: at most one succeeds', async () => {
    const t = await createTenant('race-toggle');
    const a = await make(t, {
      startDate: '2027-02-01',
      endDate: '2027-04-30',
      isActive: false,
    });
    const b = await make(t, {
      startDate: '2027-03-01',
      endDate: '2027-05-30',
      isActive: false,
    });
    const results = await Promise.allSettled([
      edit(t, a.id, { isActive: true }),
      edit(t, b.id, { isActive: true }),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
  });
});
