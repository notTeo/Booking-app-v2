import { DateTime } from 'luxon';

/**
 * Every booking date/time on the client is interpreted and displayed in the
 * SHOP's IANA timezone — never the browser's. Mirrors api/src/utils/shopTime.ts
 * (same library, same DST rules) so client and server agree on every instant.
 *
 * Instants travel as ISO-8601 UTC strings; calendar dates as "YYYY-MM-DD";
 * slot labels as "HH:mm" wall-clock in the shop zone.
 */

/** Wall-clock (date + "HH:mm") in `zone` -> UTC ISO string.
 * A time that occurs twice (DST fall-back) maps to the earlier instant. */
export const wallClockToISO = (
  date: string,
  time: string,
  zone: string,
): string => {
  const dt = DateTime.fromISO(`${date}T${time}`, { zone });
  if (!dt.isValid) throw new Error(`Invalid date/time/zone: ${date} ${time} ${zone}`);
  return dt.toUTC().toISO()!;
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
