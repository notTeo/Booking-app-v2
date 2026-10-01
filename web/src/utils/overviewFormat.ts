import { DateTime } from 'luxon';
import type { OverviewBucket, OverviewRange } from '../api/overview.api';
import type { Language } from '../locales/translations';

export type GreetingPeriod = 'morning' | 'afternoon' | 'evening';

/** Time of day in the SHOP's timezone (night hours count as evening). */
export const greetingPeriod = (zone: string, now: Date = new Date()): GreetingPeriod => {
  const hour = DateTime.fromJSDate(now, { zone }).hour;
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  return 'evening';
};

/** The users table stores one full name; the greeting uses its first word. */
export const firstName = (fullName: string): string => fullName.trim().split(/\s+/)[0] ?? '';

const day = (date: string, language: Language) =>
  DateTime.fromISO(date, { zone: 'utc' }).setLocale(language);

/** Full label, e.g. "Mon 5 Oct" or "5 Oct – 11 Oct" (weekly buckets). */
export const bucketLabel = (b: OverviewBucket, range: OverviewRange, language: Language): string =>
  range === 'quarter'
    ? `${day(b.start, language).toFormat('d LLL')} – ${day(b.end, language).toFormat('d LLL')}`
    : day(b.start, language).toFormat('ccc d LLL');

/** Short x-axis tick. */
export const axisLabel = (b: OverviewBucket, range: OverviewRange, language: Language): string => {
  const d = day(b.start, language);
  if (range === 'week') return d.toFormat('ccc');
  if (range === 'month') return d.toFormat('d');
  return d.toFormat('d LLL');
};

/** Every Nth bar (counting back from the latest) gets a tick so labels fit at 360px. */
const AXIS_STEP: Record<OverviewRange, number> = { week: 1, month: 5, quarter: 3 };

export const showsAxisLabel = (index: number, total: number, range: OverviewRange): boolean =>
  (total - 1 - index) % AXIS_STEP[range] === 0;

/** The bucket that contains today (shop-local). */
export const isCurrentBucket = (b: OverviewBucket, today: string): boolean =>
  b.start <= today && today <= b.end;

/** "Thu 1 Oct, 10:30" in the shop's timezone. */
export const formatWhen = (iso: string, zone: string, language: Language): string =>
  DateTime.fromISO(iso, { zone }).setLocale(language).toFormat('ccc d LLL, HH:mm');

export const percentOf = (count: number, total: number): number =>
  total === 0 ? 0 : Math.round((count / total) * 100);
