import { wallClockToISO } from '../../utils/shopTime';
import type { BookingRuleCode } from '../../api/booking.api';
import type { Service, SlotInfo, SlotsResponse } from '../../api/public.api';

export function formatDuration(mins: number): string {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function formatPrice(cents: number): string {
  return `€${(cents / 100).toFixed(2)}`;
}

/** "2 services · 50m · €45.00" for the services chosen so far. */
export const servicesSummary = (
  t: { servicesChosen: string },
  chosen: Service[],
  durationFor: (s: Service) => number = (s) => s.duration,
) =>
  t.servicesChosen
    .replace('{n}', String(chosen.length))
    .replace('{duration}', formatDuration(chosen.reduce((sum, s) => sum + durationFor(s), 0)))
    .replace('{price}', formatPrice(chosen.reduce((sum, s) => sum + s.price, 0)));

/** Slot date + "HH:mm" label -> UTC instant, interpreted in the SHOP's timezone. */
export function buildISODateTime(date: string, time: string, shopTimezone: string): string {
  return wallClockToISO(date, time, shopTimezone);
}

/**
 * The booking rules the owner will be asked to accept for the chosen `time`,
 * derived from the slot's flags (so the last step can show the confirmation up
 * front instead of after a 422). `[]` = an ordinary booking. `null` = the time
 * is not one of the listed slots (e.g. "Other time…"), so only the server knows;
 * a 422 then falls back to the "book anyway" dialog. The server still checks.
 */
export function anticipatedRuleCodes(slots: SlotsResponse, time: string): BookingRuleCode[] | null {
  const slot = slots.slots?.find((s) => s.time === time);
  if (!slot) return null;
  const codes: BookingRuleCode[] = [];
  if (slot.reason === 'CLOSED_DAY') codes.push('SHOP_CLOSED');
  else if (slot.outsideHours) codes.push('OUTSIDE_OPENING_HOURS');
  if (slot.past) codes.push('BOOKING_IN_PAST');
  if (slot.offGrid) codes.push('OFF_SLOT_GRID');
  return codes;
}

export type SlotSectionKey = 'working' | 'BEFORE_OPENING' | 'BREAK' | 'AFTER_CLOSING' | 'CLOSED_DAY';
const SECTION_ORDER: SlotSectionKey[] = ['working', 'BEFORE_OPENING', 'BREAK', 'AFTER_CLOSING', 'CLOSED_DAY'];

/** Slots grouped for display: working hours first, then the out-of-hours sections (only when shown). */
export function groupSlotSections(
  slots: SlotInfo[],
  showOutsideHours: boolean,
): { key: SlotSectionKey; slots: SlotInfo[] }[] {
  const keyOf = (s: SlotInfo): SlotSectionKey => (s.outsideHours ? (s.reason ?? 'BREAK') : 'working');
  return SECTION_ORDER.filter((k) => k === 'working' || showOutsideHours)
    .map((key) => ({ key, slots: slots.filter((s) => keyOf(s) === key) }))
    .filter((g) => g.slots.length > 0);
}
