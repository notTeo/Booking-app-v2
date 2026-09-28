import { wallClockToISO } from '../../utils/shopTime';

export function formatDuration(mins: number): string {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function formatPrice(cents: number): string {
  return `€${(cents / 100).toFixed(2)}`;
}

/** Slot date + "HH:mm" label -> UTC instant, interpreted in the SHOP's timezone. */
export function buildISODateTime(date: string, time: string, shopTimezone: string): string {
  return wallClockToISO(date, time, shopTimezone);
}
