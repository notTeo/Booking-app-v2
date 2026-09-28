import { describe, it, expect } from 'vitest';
import {
  blockGeometry,
  computeVisibleRange,
  offSegments,
  overrideTags,
} from './calendarModel';

const h = (hh: number, mm = 0) => hh * 60 + mm;
const r = (startTime: string, endTime: string) => ({ startTime, endTime });

describe('computeVisibleRange', () => {
  it('is 09:00–18:00 with nothing to show', () => {
    expect(computeVisibleRange(null, [])).toEqual({ start: h(9), end: h(18) });
    expect(computeVisibleRange({ a: null, b: null }, [])).toEqual({ start: h(9), end: h(18) });
  });

  it('covers every provider\'s hours padded by an hour, never narrower than 09–18', () => {
    // Nick 09–17, Maria 10–18 -> 08:00–19:00
    const s = { nick: [r('09:00', '17:00')], maria: [r('10:00', '18:00')] };
    expect(computeVisibleRange(s, [])).toEqual({ start: h(8), end: h(19) });
    // short hours 11–15 still show 09–18
    expect(computeVisibleRange({ a: [r('11:00', '15:00')] }, [])).toEqual({ start: h(9), end: h(18) });
  });

  it('expands to show a late booking, padded by an hour and rounded out to whole hours', () => {
    const s = { nick: [r('09:00', '17:00')] };
    // 20:30–21:00 -> data ends 21:00, +1h = 22:00
    expect(computeVisibleRange(s, [{ startMin: h(20, 30), endMin: h(21) }])).toEqual({ start: h(8), end: h(22) });
    // 21:10–21:40 -> 21:40 + 1h = 22:40 -> up to 23:00
    expect(computeVisibleRange(s, [{ startMin: h(21, 10), endMin: h(21, 40) }])).toEqual({ start: h(8), end: h(23) });
  });

  it('expands to show an early booking, rounding down', () => {
    const s = { nick: [r('09:00', '17:00')] };
    // 06:15 -> 05:15 -> down to 05:00
    expect(computeVisibleRange(s, [{ startMin: h(6, 15), endMin: h(6, 45) }])).toEqual({ start: h(5), end: h(18) });
  });

  it('clamps to the calendar day, and a booking crossing midnight only reaches 24:00', () => {
    expect(computeVisibleRange(null, [{ startMin: h(23, 30), endMin: h(24, 30) }])).toEqual({ start: h(9), end: h(24) });
    expect(computeVisibleRange(null, [{ startMin: 0, endMin: h(0, 30) }])).toEqual({ start: 0, end: h(18) });
  });

  it('ignores closed (null) providers', () => {
    expect(computeVisibleRange({ a: null, b: [r('12:00', '13:00')] }, [])).toEqual({ start: h(9), end: h(18) });
  });
});

describe('offSegments (the hatched, not-working parts of a column)', () => {
  it('a closed provider is off for the whole visible range', () => {
    expect(offSegments(null, h(8), h(19))).toEqual([{ from: h(8), to: h(19), closed: true }]);
  });

  it('marks before, between (break) and after the opening ranges', () => {
    expect(offSegments([r('09:00', '12:00'), r('15:00', '19:00')], h(8), h(21))).toEqual([
      { from: h(8), to: h(9), closed: false },
      { from: h(12), to: h(15), closed: false },
      { from: h(19), to: h(21), closed: false },
    ]);
  });

  it('has no segments when the hours cover the whole range', () => {
    expect(offSegments([r('08:00', '19:00')], h(8), h(19))).toEqual([]);
  });

  it('is unordered- and overlap-safe, and clips to the visible range', () => {
    expect(offSegments([r('15:00', '19:00'), r('09:00', '16:00')], h(8), h(20))).toEqual([
      { from: h(8), to: h(9), closed: false },
      { from: h(19), to: h(20), closed: false },
    ]);
    // hours entirely outside the window: the whole window is off
    expect(offSegments([r('01:00', '02:00')], h(8), h(19))).toEqual([{ from: h(8), to: h(19), closed: false }]);
  });
});

describe('overrideTags (from the STORED codes, never recomputed)', () => {
  it('maps codes to tags in a fixed priority order and ignores unknown codes', () => {
    expect(overrideTags([])).toEqual([]);
    expect(overrideTags(['OUTSIDE_OPENING_HOURS'])).toEqual(['OUTSIDE_OPENING_HOURS']);
    expect(overrideTags(['BOOKING_IN_PAST', 'SHOP_CLOSED', 'NOPE', 'OFF_SLOT_GRID'])).toEqual([
      'SHOP_CLOSED',
      'BOOKING_IN_PAST',
      'OFF_SLOT_GRID',
    ]);
  });
});

describe('blockGeometry', () => {
  const range = { start: h(8), end: h(19) };
  const ppm = 1; // 1px per minute keeps the arithmetic readable

  it('places a block by its start relative to the range', () => {
    expect(blockGeometry(h(10), 30, range, ppm, 28)).toMatchObject({
      top: 120,
      height: 30,
      crossesNextDay: false,
      outsideView: false,
    });
  });

  it('enforces the minimum height', () => {
    expect(blockGeometry(h(10), 10, range, ppm, 28).height).toBe(28);
  });

  it('a booking crossing midnight is clamped to the end of the day and flagged', () => {
    const g = blockGeometry(h(23, 30), 60, { start: h(8), end: h(24) }, ppm, 28);
    expect(g.crossesNextDay).toBe(true);
    expect(g.height).toBe(30); // 23:30 -> 24:00
    expect(g.outsideView).toBe(true); // not fully shown: listed in the banner
  });

  it('a booking outside the range is flagged for the banner', () => {
    expect(blockGeometry(h(6), 30, range, ppm, 28).outsideView).toBe(true);
    expect(blockGeometry(h(18, 45), 30, range, ppm, 28).outsideView).toBe(true);
  });
});
