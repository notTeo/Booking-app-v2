import { describe, it, expect } from 'vitest';
import { findOverlap, scheduleStatus } from './scheduleOverlap';

const sch = (id: string, start: string, end: string | null, isActive = true) => ({
  id,
  isActive,
  startDate: `${start}T00:00:00.000Z`,
  endDate: end ? `${end}T00:00:00.000Z` : null,
});

const existing = [sch('a', '2027-02-01', '2027-04-30')];

describe('findOverlap', () => {
  it.each([
    ['starts inside', '2027-03-01', '2027-06-01'],
    ['ends inside', '2026-12-01', '2027-03-01'],
    ['sits inside', '2027-03-01', '2027-03-15'],
    ['contains', '2026-12-01', '2027-06-01'],
    ['identical', '2027-02-01', '2027-04-30'],
    ['open-ended reaching in', '2027-03-01', ''],
  ])('detects a range that %s', (_n, start, end) => {
    expect(findOverlap(existing, start, end)?.id).toBe('a');
  });

  it.each([
    ['before', '2026-11-01', '2027-01-31'],
    ['after', '2027-05-15', '2027-06-30'],
    ['touching the end', '2027-04-30', '2027-06-30'],
    ['touching the start', '2026-12-01', '2027-02-01'],
    ['open-ended after', '2027-06-01', ''],
  ])('allows a range %s', (_n, start, end) => {
    expect(findOverlap(existing, start, end)).toBeUndefined();
  });

  it('ignores inactive schedules', () => {
    expect(findOverlap([sch('a', '2027-02-01', null, false)], '2027-03-01', '')).toBeUndefined();
  });

  it('excludes the schedule being edited', () => {
    expect(findOverlap(existing, '2027-03-01', '2027-03-31', 'a')).toBeUndefined();
  });

  it('an open-ended active schedule blocks everything after its start', () => {
    const open = [sch('o', '2027-01-01', null)];
    expect(findOverlap(open, '2028-01-01', '2028-02-01')?.id).toBe('o');
    expect(findOverlap(open, '2026-01-01', '2026-06-01')).toBeUndefined();
  });
});

describe('scheduleStatus', () => {
  const now = new Date(2026, 8, 30, 12); // 30 Sep 2026, local
  it('current when today is inside the range or open-ended', () => {
    expect(scheduleStatus(sch('x', '2026-01-01', '2026-12-31'), now)).toBe('current');
    expect(scheduleStatus(sch('x', '2026-01-01', null), now)).toBe('current');
    expect(scheduleStatus(sch('x', '2026-09-30', '2026-09-30'), now)).toBe('current');
  });
  it('upcoming when it starts after today', () => {
    expect(scheduleStatus(sch('x', '2026-10-01', null), now)).toBe('upcoming');
  });
  it('ended when it finished before today', () => {
    expect(scheduleStatus(sch('x', '2026-01-01', '2026-09-29'), now)).toBe('ended');
  });
});
