// Pure calendar decisions (kept out of the page so they can be unit-tested).
// All values are minutes since midnight in the SHOP's timezone.

export interface HourRange {
  startTime: string;
  endTime: string;
}
/** memberId -> opening ranges for the day, or null when that member is closed. */
export type DaySchedule = Record<string, HourRange[] | null>;

const DAY = 24 * 60;
const HOUR = 60;
const MIN_START = 9 * HOUR; // the visible range is never narrower than 09–18
const MIN_END = 18 * HOUR;

const toMins = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

/**
 * Rows to render: the union of every provider's hours that day and the earliest
 * / latest booking, padded by an hour, rounded out to whole hours, never
 * narrower than 09–18 and never past the calendar day. A booking crossing
 * midnight only counts up to 24:00.
 */
export function computeVisibleRange(
  schedule: DaySchedule | null,
  bookings: { startMin: number; endMin: number }[],
): { start: number; end: number } {
  const points: number[] = [];
  for (const ranges of Object.values(schedule ?? {})) {
    for (const r of ranges ?? []) points.push(toMins(r.startTime), toMins(r.endTime));
  }
  for (const b of bookings) points.push(b.startMin, Math.min(b.endMin, DAY));
  if (points.length === 0) return { start: MIN_START, end: MIN_END };
  const start = Math.min(Math.min(...points) - HOUR, MIN_START);
  const end = Math.max(Math.max(...points) + HOUR, MIN_END);
  return {
    start: Math.max(0, Math.floor(start / HOUR) * HOUR),
    end: Math.min(DAY, Math.ceil(end / HOUR) * HOUR),
  };
}

export interface OffSegment {
  from: number;
  to: number;
  /** true = the member is closed all day (no ranges at all) */
  closed: boolean;
}

/** The not-working parts of a column inside the visible range (to hatch). */
export function offSegments(ranges: HourRange[] | null, start: number, end: number): OffSegment[] {
  if (ranges === null) return [{ from: start, to: end, closed: true }];
  const open = ranges
    .map((r) => [toMins(r.startTime), toMins(r.endTime)] as const)
    .sort((a, b) => a[0] - b[0]);
  const out: OffSegment[] = [];
  let cursor = start;
  for (const [from, to] of open) {
    if (to <= cursor) continue;
    if (from >= end) break;
    if (from > cursor) out.push({ from: cursor, to: Math.min(from, end), closed: false });
    cursor = Math.max(cursor, to);
  }
  if (cursor < end) out.push({ from: cursor, to: end, closed: false });
  return out;
}

const TAG_ORDER = ['SHOP_CLOSED', 'OUTSIDE_OPENING_HOURS', 'BOOKING_IN_PAST', 'OFF_SLOT_GRID'] as const;
export type OverrideTag = (typeof TAG_ORDER)[number];

/** Tags for a booking, from the codes STORED at creation (never recomputed). */
export function overrideTags(codes: string[]): OverrideTag[] {
  return TAG_ORDER.filter((c) => codes.includes(c));
}

export function blockGeometry(
  startMin: number,
  durationMin: number,
  range: { start: number; end: number },
  pxPerMin: number,
  minHeight: number,
) {
  const endMin = startMin + durationMin;
  const crossesNextDay = endMin > DAY;
  const shownEnd = Math.min(endMin, DAY, range.end);
  return {
    top: (startMin - range.start) * pxPerMin,
    height: Math.max((shownEnd - startMin) * pxPerMin, minHeight),
    crossesNextDay,
    // not fully inside the rendered area: listed in the "outside the visible range" banner
    outsideView: crossesNextDay || startMin < range.start || endMin > range.end,
  };
}

/**
 * Side-by-side placement for blocks that share time in one column. Live
 * bookings never overlap, but a canceled, no-show or rescheduled one stays on
 * the calendar after its slot is booked again, and both must stay visible.
 * Each block gets a lane and the lane count of its overlapping group.
 */
export function blockLanes(
  blocks: { id: string; startMin: number; endMin: number }[],
): Map<string, { lane: number; lanes: number }> {
  const out = new Map<string, { lane: number; lanes: number }>();
  const sorted = [...blocks].sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);
  let group: { id: string; lane: number }[] = [];
  let laneEnds: number[] = []; // per lane, when its last block ends
  let groupEnd = -Infinity;
  const flush = () => {
    for (const g of group) out.set(g.id, { lane: g.lane, lanes: laneEnds.length });
    group = [];
    laneEnds = [];
  };
  for (const b of sorted) {
    if (b.startMin >= groupEnd) flush(); // nothing before this block reaches it
    let lane = laneEnds.findIndex((end) => end <= b.startMin);
    if (lane === -1) lane = laneEnds.length;
    laneEnds[lane] = b.endMin;
    group.push({ id: b.id, lane });
    groupEnd = Math.max(groupEnd, b.endMin);
  }
  flush();
  return out;
}

/** What the calendar's filter bar has selected. */
export interface BookingFilters {
  /** Empty = every status. */
  statuses: ReadonlySet<string>;
  /** null = every staff member (a column filter, applied by the page). */
  staffId: string | null;
  /** null = every service. */
  serviceId: string | null;
}

export const NO_FILTERS: BookingFilters = { statuses: new Set(), staffId: null, serviceId: null };

export const hasActiveFilters = (f: BookingFilters) =>
  f.statuses.size > 0 || f.staffId !== null || f.serviceId !== null;

/** Status and service filters. Staff is a column filter, so it is not applied here. */
export function filterBookings<T extends { status: string; serviceId: string }>(
  bookings: T[],
  f: BookingFilters,
): T[] {
  return bookings.filter(
    (b) => (f.statuses.size === 0 || f.statuses.has(b.status)) && (f.serviceId === null || b.serviceId === f.serviceId),
  );
}
