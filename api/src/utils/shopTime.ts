import { DateTime } from 'luxon';
import type { DayOfWeek } from '../../dist/generated/prisma';

/**
 * All wall-clock <-> UTC conversion for bookings goes through this module,
 * always in the SHOP's IANA timezone — never the server process TZ, and never
 * by parsing "YYYY-MM-DDTHH:mm" strings with `new Date(...)`.
 *
 * Instants are stored/compared as UTC `Date`s. Calendar dates are
 * "YYYY-MM-DD" strings; opening hours are "HH:mm" wall-clock strings.
 */

export const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

const DAYS: DayOfWeek[] = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

const at = (date: string, time: string, zone: string) => {
  const dt = DateTime.fromISO(`${date}T${time}`, { zone });
  if (!dt.isValid) {
    throw new Error(`Invalid date/time/zone: ${date} ${time} ${zone}`);
  }
  return dt;
};

/**
 * Wall-clock time in `zone` -> UTC instant.
 * - Returns null if that wall-clock time does not exist (spring-forward gap).
 * - If it occurs twice (fall-back), the EARLIER instant is used.
 */
export const wallClockToUtc = (
  date: string,
  time: string,
  zone: string,
): Date | null => {
  const dt = at(date, time, zone);
  const [h, m] = time.split(':').map(Number);
  // Luxon shifts a nonexistent time forward; detect that by round-tripping.
  if (dt.hour !== h || dt.minute !== m) return null;
  return dt.toJSDate();
};

/** Like wallClockToUtc but a nonexistent time rolls forward past the gap. */
export const wallClockToUtcLenient = (
  date: string,
  time: string,
  zone: string,
): Date => at(date, time, zone).toJSDate();

/** Half-open UTC range [start, end) covering the calendar `date` in `zone`. */
export const dayBoundsUtc = (
  date: string,
  zone: string,
): { start: Date; end: Date } => {
  const start = at(date, '00:00', zone);
  return {
    start: start.toJSDate(),
    end: start.plus({ days: 1 }).startOf('day').toJSDate(),
  };
};

/** Today's calendar date ("YYYY-MM-DD") in `zone`. */
export const todayInZone = (zone: string, now: Date = new Date()): string => {
  const dt = DateTime.fromJSDate(now, { zone });
  if (!dt.isValid) throw new Error(`Invalid zone: ${zone}`);
  return dt.toISODate()!;
};

/** Weekday of a calendar date. Independent of any timezone. */
export const weekdayOf = (date: string): DayOfWeek => {
  const dt = DateTime.fromISO(date, { zone: 'utc' });
  return DAYS[dt.weekday - 1];
};

/** Calendar date as a UTC-midnight Date (how schedule start/end dates are stored). */
export const dateOnlyToUtc = (date: string): Date =>
  DateTime.fromISO(date, { zone: 'utc' }).toJSDate();

/** `date` shifted by whole calendar days (timezone-free). */
export const addDays = (date: string, days: number): string =>
  DateTime.fromISO(date, { zone: 'utc' }).plus({ days }).toISODate()!;
