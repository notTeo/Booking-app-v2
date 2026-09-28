import { DateTime } from 'luxon';

/**
 * Every booking date/time on the client is interpreted and displayed in the
 * SHOP's IANA timezone — never the browser's. Mirrors api/src/utils/shopTime.ts
 * (same library, same DST rules) so client and server agree on every instant.
 *
 * Instants travel as ISO-8601 UTC strings; calendar dates as "YYYY-MM-DD";
 * slot labels as "HH:mm" wall-clock in the shop zone.
 */

const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;

const offsetMinutesAt = (ms: number, zone: string): number =>
  DateTime.fromMillis(ms, { zone }).offset;

/** Wall-clock (date + "HH:mm") in `zone` -> UTC ISO string.
 *
 * Resolved WITHOUT consulting the current time (Luxon's own handling of an
 * ambiguous time is biased by the offset in effect "now"): every offset the
 * zone uses within a day either side is tried and the earliest valid instant
 * wins, so a time that occurs twice (DST fall-back) maps to the earlier one —
 * identical to api/src/utils/shopTime.ts. A nonexistent time (spring-forward
 * gap) rolls forward past the gap. */
export const wallClockToISO = (
  date: string,
  time: string,
  zone: string,
): string => {
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

  const ms = valid.length > 0 ? valid[0] : naiveMs - before * MINUTE_MS;
  return new Date(ms).toISOString();
};

/** Today's calendar date ("YYYY-MM-DD") in `zone`. */
export const todayInZone = (zone: string, now: Date = new Date()): string =>
  DateTime.fromJSDate(now, { zone }).toISODate()!;

/** Calendar date ("YYYY-MM-DD") of an instant, in `zone`. */
export const dateInZone = (iso: string, zone: string): string =>
  DateTime.fromISO(iso, { zone }).toISODate()!;

/** `date` shifted by whole calendar days (timezone-free). */
export const shiftDate = (date: string, days: number): string =>
  DateTime.fromISO(date, { zone: 'utc' }).plus({ days }).toISODate()!;

/** Minutes since local midnight of an instant, in `zone`. */
export const minutesOfDayInZone = (iso: string, zone: string): number => {
  const dt = DateTime.fromISO(iso, { zone });
  return dt.hour * 60 + dt.minute;
};

/** Locale-formatted time of an instant, in `zone`. */
export const formatTimeInZone = (iso: string, zone: string): string =>
  DateTime.fromISO(iso, { zone }).toLocaleString(DateTime.TIME_SIMPLE);

/** Locale-formatted date + time of an instant, in `zone`. */
export const formatDateTimeInZone = (iso: string, zone: string): string =>
  DateTime.fromISO(iso, { zone }).toLocaleString({
    dateStyle: 'medium',
    timeStyle: 'short',
  });
