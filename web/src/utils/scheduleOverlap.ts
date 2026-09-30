import type { Schedule } from '../api/workingHours.api';

type DatedSchedule = Pick<Schedule, 'id' | 'isActive' | 'startDate' | 'endDate'>;

const pad = (n: number) => String(n).padStart(2, '0');

export const todayStr = (now = new Date()) =>
  `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

export type ScheduleStatus = 'current' | 'upcoming' | 'ended';

export function scheduleStatus(s: DatedSchedule, now = new Date()): ScheduleStatus {
  const today = todayStr(now);
  if (s.endDate && s.endDate.slice(0, 10) < today) return 'ended';
  if (s.startDate.slice(0, 10) > today) return 'upcoming';
  return 'current';
}

/**
 * Mirrors the API's assertNoActiveOverlap (api/src/services/workingHours.service.ts):
 * the first ACTIVE schedule the range [start, end) collides with. `end` '' = open-ended.
 * Ranges that merely touch (one ends the day the next starts) do not collide.
 */
export function findOverlap<T extends DatedSchedule>(
  schedules: T[],
  start: string,
  end: string,
  excludeId?: string,
): T | undefined {
  return schedules.find((s) => {
    if (!s.isActive || s.id === excludeId) return false;
    const sEnd = s.endDate ? s.endDate.slice(0, 10) : null;
    return (sEnd === null || start < sEnd) && (!end || s.startDate.slice(0, 10) < end);
  });
}
