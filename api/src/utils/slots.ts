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
