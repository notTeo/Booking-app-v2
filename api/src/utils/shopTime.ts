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

const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;

const offsetMinutesAt = (ms: number, zone: string): number =>
  DateTime.fromMillis(ms, { zone }).offset;

/**
 * Resolve a wall-clock time in `zone` WITHOUT consulting the current time.
 * (Luxon's own resolution of an ambiguous time is biased by the offset in
 * effect "now", which would make the answer depend on the season the code
 * happens to run in.)
 *
 * Every offset the zone uses within a day either side is tried; a candidate
 * instant is valid if the zone really has that offset at that instant.
 * - `instant`: the earliest valid instant (fall-back repeats -> earlier one),
 *   or null when the wall-clock time does not exist (spring-forward gap).
 * - `lenient`: `instant`, or for a gap time the instant just past the gap.
 */
const resolveWallClock = (
  date: string,
  time: string,
  zone: string,
): { instant: Date | null; lenient: Date } => {
  const naive = DateTime.fromISO(`${date}T${time}`, { zone: 'utc' });
  if (!naive.isValid || !DateTime.fromMillis(0, { zone }).isValid) {
    throw new Error(`Invalid date/time/zone: ${date} ${time} ${zone}`);
  }
  const naiveMs = naive.toMillis();
  const before = offsetMinutesAt(naiveMs - DAY_MS, zone);
  const after = offsetMinutesAt(naiveMs + DAY_MS, zone);

  const valid = [...new Set([before, after])]
    .map((offset) => ({ offset, ms: naiveMs - offset * MINUTE_MS }))
    .filter(({ offset, ms }) => offsetMinutesAt(ms, zone) === offset)
    .map(({ ms }) => ms)
    .sort((x, y) => x - y);

  if (valid.length > 0) {
    const instant = new Date(valid[0]);
    return { instant, lenient: instant };
  }
  return { instant: null, lenient: new Date(naiveMs - before * MINUTE_MS) };
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
): Date | null => resolveWallClock(date, time, zone).instant;

/** Like wallClockToUtc but a nonexistent time rolls forward past the gap. */
export const wallClockToUtcLenient = (
  date: string,
  time: string,
  zone: string,
): Date => resolveWallClock(date, time, zone).lenient;

/** Half-open UTC range [start, end) covering the calendar `date` in `zone`. */
export const dayBoundsUtc = (
  date: string,
  zone: string,
): { start: Date; end: Date } => {
  return {
    start: wallClockToUtcLenient(date, '00:00', zone),
    end: wallClockToUtcLenient(addDays(date, 1), '00:00', zone),
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

/** Calendar date ("YYYY-MM-DD") of an instant, in `zone`. */
export const dateInZone = (instant: Date, zone: string): string => {
  const dt = DateTime.fromJSDate(instant, { zone });
  if (!dt.isValid) throw new Error(`Invalid zone: ${zone}`);
  return dt.toISODate()!;
};
