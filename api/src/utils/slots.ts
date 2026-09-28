import { wallClockToUtc, wallClockToUtcLenient } from './shopTime';

export const SLOT_STEP_MINUTES = 30;

export interface SlotCandidate {
  time: string; // "HH:mm" wall-clock label in the shop timezone
  start: Date; // UTC instant
  end: Date; // UTC instant, start + real elapsed service duration
}

const toMins = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

const toHHMM = (mins: number) =>
  `${Math.floor(mins / 60)
    .toString()
    .padStart(2, '0')}:${(mins % 60).toString().padStart(2, '0')}`;

/**
 * Bookable start times for one calendar day, given its opening ranges
 * (wall-clock "HH:mm" in `zone`) and the service duration.
 *
 * - The grid is anchored at each range's opening time, every 30 minutes.
 * - A start that falls in a DST gap (nonexistent wall-clock time) is skipped.
 * - Each wall-clock label appears at most once; if a label is ambiguous
 *   (DST fall-back) it maps to its earlier instant.
 * - A slot fits if its REAL end instant is not after the range's closing
 *   instant, so DST days are measured in elapsed time, not label arithmetic.
 */
export const buildSlotCandidates = (
  date: string,
  zone: string,
  ranges: { startTime: string; endTime: string }[],
  durationMinutes: number,
): SlotCandidate[] => {
  const seen = new Set<string>();
  const out: SlotCandidate[] = [];

  for (const range of ranges) {
    const open = toMins(range.startTime);
    const close = toMins(range.endTime);
    const closeInstant = wallClockToUtcLenient(date, toHHMM(close), zone);

    for (let m = open; m < close; m += SLOT_STEP_MINUTES) {
      const time = toHHMM(m);
      if (seen.has(time)) continue;
      const start = wallClockToUtc(date, time, zone);
      if (!start) continue; // inside a DST gap
      const end = new Date(start.getTime() + durationMinutes * 60_000);
      if (end > closeInstant) continue;
      seen.add(time);
      out.push({ time, start, end });
    }
  }

  return out.sort((a, b) => a.start.getTime() - b.start.getTime());
};

// ── Out-of-hours grid (authenticated owner/staff view only) ──────────────────

export const OUTSIDE_STEP_MINUTES = 15;
// How far outside the day's opening hours the grid reaches (start times).
export const OUTSIDE_CAP_BEFORE_MINUTES = 3 * 60;
export const OUTSIDE_CAP_AFTER_MINUTES = 4 * 60;
// Used when the shop has no regular hours for that weekday at all.
export const DEFAULT_CLOSED_DAY_HOURS = {
  startTime: '08:00',
  endTime: '22:00',
};

export type OutsideReason =
  | 'BEFORE_OPENING'
  | 'BREAK'
  | 'AFTER_CLOSING'
  | 'CLOSED_DAY';

export interface OutsideCandidate extends SlotCandidate {
  reason: OutsideReason;
}

/**
 * Start times a manual booking can pick OUTSIDE working hours, on a
 * 15-minute midnight-anchored grid (not the opening-anchored 30-minute grid).
 *
 * - `ranges` = the day's opening ranges, or empty for a closed day / a
 *   provider's day off. Then `closedDayRanges` (the shop's regular hours for
 *   that weekday, or DEFAULT_CLOSED_DAY_HOURS) sets the window and every slot
 *   is CLOSED_DAY; there is no padding.
 * - On an open day the window runs from 3 h before the first opening to 4 h
 *   after the last closing (start times, both ends inclusive), clamped to the
 *   calendar day. Breaks between ranges are listed in full.
 * - A start that is already an in-hours grid slot is not repeated. A start
 *   whose whole booking fits inside one opening range but is off the 30-minute
 *   grid is not "outside hours" and is not listed (reachable via "Other
 *   time…"). A start inside a range that would run past that range's closing
 *   IS outside hours.
 * - Nonexistent (DST gap) wall-clock times are skipped, ambiguous ones map to
 *   their earlier instant, and each label appears once.
 */
export const buildOutsideHoursCandidates = (
  date: string,
  zone: string,
  ranges: { startTime: string; endTime: string }[],
  closedDayRanges: { startTime: string; endTime: string }[],
  durationMinutes: number,
): OutsideCandidate[] => {
  const closedDay = ranges.length === 0;
  const basis = closedDay ? closedDayRanges : ranges;
  const opens = basis.map((r) => toMins(r.startTime));
  const closes = basis.map((r) => toMins(r.endTime));
  const firstOpen = Math.min(...opens);
  const lastClose = Math.max(...closes);

  const lo = closedDay ? firstOpen : firstOpen - OUTSIDE_CAP_BEFORE_MINUTES;
  const hi = closedDay
    ? lastClose - OUTSIDE_STEP_MINUTES
    : lastClose + OUTSIDE_CAP_AFTER_MINUTES;
  const from = Math.max(
    0,
    Math.ceil(lo / OUTSIDE_STEP_MINUTES) * OUTSIDE_STEP_MINUTES,
  );
  const to = Math.min(24 * 60 - OUTSIDE_STEP_MINUTES, hi);

  const inHoursLabels = new Set(
    closedDay
      ? []
      : buildSlotCandidates(date, zone, ranges, durationMinutes).map(
          (c) => c.time,
        ),
  );
  const lastRange = closedDay
    ? null
    : ranges.reduce((a, b) =>
        toMins(b.startTime) > toMins(a.startTime) ? b : a,
      );

  const seen = new Set<string>();
  const out: OutsideCandidate[] = [];
  for (let m = from; m <= to; m += OUTSIDE_STEP_MINUTES) {
    const time = toHHMM(m);
    if (seen.has(time) || inHoursLabels.has(time)) continue;
    const start = wallClockToUtc(date, time, zone);
    if (!start) continue; // inside a DST gap
    const end = new Date(start.getTime() + durationMinutes * 60_000);

    let reason: OutsideReason;
    if (closedDay) {
      reason = 'CLOSED_DAY';
    } else {
      const fits = ranges.some(
        (r) =>
          start >= wallClockToUtcLenient(date, r.startTime, zone) &&
          end <= wallClockToUtcLenient(date, r.endTime, zone),
      );
      if (fits) continue; // in hours, just off the 30-minute grid
      const inside = ranges.find(
        (r) => m >= toMins(r.startTime) && m < toMins(r.endTime),
      );
      if (inside) reason = inside === lastRange ? 'AFTER_CLOSING' : 'BREAK';
      else if (m < firstOpen) reason = 'BEFORE_OPENING';
      else if (m >= lastClose) reason = 'AFTER_CLOSING';
      else reason = 'BREAK';
    }
    seen.add(time);
    out.push({ time, start, end, reason });
  }
  return out;
};
