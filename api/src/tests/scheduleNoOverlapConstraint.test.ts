import { describe, it, expect } from 'vitest';
import { prisma } from '../utils/prisma';
import { isExclusionViolation } from '../utils/serializable';
import { createStaffMember, createTenant } from './helpers';

// The database itself must refuse two overlapping ACTIVE schedules, even when
// the application's check is bypassed (these tests write with plain prisma
// calls, exactly as a buggy code path or a race would).

const d = (s: string) => new Date(`${s}T00:00:00.000Z`);

async function setup() {
  const t = await createTenant('SchedGuard');
  const insert = (
    startDate: string,
    endDate: string | null,
    over: { staffId?: string | null; shopId?: string; isActive?: boolean } = {},
  ) =>
    prisma.shopWorkingSchedule.create({
      data: {
        shopId: over.shopId ?? t.shop.id,
        staffId: over.staffId === undefined ? null : over.staffId,
        startDate: d(startDate),
        endDate: endDate ? d(endDate) : null,
        ...(over.isActive !== undefined && { isActive: over.isActive }),
      },
    });
  await insert('2027-02-01', '2027-04-30');
  return { t, insert };
}

describe('ShopWorkingSchedule_no_overlap exclusion constraint', () => {
  it.each([
    ['starting inside', '2027-03-01', '2027-06-01'],
    ['ending inside', '2026-12-01', '2027-03-01'],
    ['inside', '2027-03-01', '2027-03-15'],
    ['engulfing', '2026-12-01', '2027-06-01'],
    ['identical', '2027-02-01', '2027-04-30'],
    ['open-ended reaching in', '2027-03-01', null],
  ])('rejects a schedule %s', async (_l, start, end) => {
    const { insert } = await setup();
    await expect(insert(start, end)).rejects.toSatisfy(isExclusionViolation);
  });

  it('rejects anything after an active open-ended schedule', async () => {
    const t = await createTenant('SchedOpen');
    await prisma.shopWorkingSchedule.create({
      data: { shopId: t.shop.id, startDate: d('2027-01-01') },
    });
    await expect(
      prisma.shopWorkingSchedule.create({
        data: {
          shopId: t.shop.id,
          startDate: d('2028-01-01'),
          endDate: d('2028-02-01'),
        },
      }),
    ).rejects.toSatisfy(isExclusionViolation);
  });

  it('allows touching ranges (half-open)', async () => {
    const { t, insert } = await setup();
    await insert('2027-04-30', '2027-06-30');
    await insert('2026-12-01', '2027-02-01');
    expect(
      await prisma.shopWorkingSchedule.count({ where: { shopId: t.shop.id } }),
    ).toBe(3);
  });

  it('ignores inactive schedules', async () => {
    const { insert } = await setup();
    await insert('2027-03-01', '2027-03-31', { isActive: false });
  });

  it('rejects switching an inactive schedule on into an overlap', async () => {
    const { insert } = await setup();
    const off = await insert('2027-03-01', '2027-03-31', { isActive: false });
    await expect(
      prisma.shopWorkingSchedule.update({
        where: { id: off.id },
        data: { isActive: true },
      }),
    ).rejects.toSatisfy(isExclusionViolation);
  });

  it('rejects editing an active schedule into an overlap', async () => {
    const { insert } = await setup();
    const b = await insert('2027-05-01', '2027-06-30');
    await expect(
      prisma.shopWorkingSchedule.update({
        where: { id: b.id },
        data: { startDate: d('2027-04-01') },
      }),
    ).rejects.toSatisfy(isExclusionViolation);
  });

  it('keeps shop-wide and per-staff schedules in separate scopes', async () => {
    const { t, insert } = await setup();
    const other = await createStaffMember(t);
    await insert('2027-03-01', '2027-03-31', { staffId: t.staff.id }); // vs shop-wide: ok
    await insert('2027-03-01', '2027-03-31', { staffId: other.staff.id }); // vs other staff: ok
    await expect(
      insert('2027-03-15', '2027-04-15', { staffId: t.staff.id }), // same staff: rejected
    ).rejects.toSatisfy(isExclusionViolation);
  });

  it('never collides across shops', async () => {
    const { insert } = await setup();
    const other = await createTenant('SchedOther');
    await insert('2027-02-01', '2027-04-30', { shopId: other.shop.id });
  });
});
