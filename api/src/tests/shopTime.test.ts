import { describe, it, expect } from 'vitest';
import {
  addDays,
  dateOnlyToUtc,
  dayBoundsUtc,
  todayInZone,
  wallClockToUtc,
  wallClockToUtcLenient,
  weekdayOf,
} from '../utils/shopTime';
import { buildSlotCandidates } from '../utils/slots';

const ATHENS = 'Europe/Athens';
const iso = (d: Date | null) => d?.toISOString() ?? null;

describe('wallClockToUtc', () => {
  it('converts using the zone offset in effect on that date', () => {
    expect(iso(wallClockToUtc('2027-02-01', '10:00', ATHENS))).toBe(
      '2027-02-01T08:00:00.000Z',
    );
    expect(iso(wallClockToUtc('2027-07-05', '10:00', ATHENS))).toBe(
      '2027-07-05T07:00:00.000Z',
    );
  });

  it('returns null for a nonexistent DST-gap time (2027-03-28 03:30)', () => {
    expect(wallClockToUtc('2027-03-28', '03:30', ATHENS)).toBeNull();
    expect(iso(wallClockToUtc('2027-03-28', '04:00', ATHENS))).toBe(
      '2027-03-28T01:00:00.000Z',
    );
  });

  it('lenient variant rolls a gap time forward instead of returning null', () => {
    expect(iso(wallClockToUtcLenient('2027-03-28', '03:30', ATHENS))).toBe(
      '2027-03-28T01:30:00.000Z',
    );
  });

  it('picks the EARLIER instant for an ambiguous fall-back time (2027-10-31 03:30)', () => {
    // 03:30 EEST (+03:00) = 00:30Z; the later occurrence is 03:30 EET = 01:30Z.
    expect(iso(wallClockToUtc('2027-10-31', '03:30', ATHENS))).toBe(
      '2027-10-31T00:30:00.000Z',
    );
  });

  it('throws on an invalid zone rather than silently using server time', () => {
    expect(() => wallClockToUtc('2027-02-01', '10:00', 'Not/AZone')).toThrow();
  });
});

describe('dayBoundsUtc', () => {
  it('is 24h on a normal day, 23h at DST start, 25h at DST end', () => {
    const len = (d: string) => {
      const { start, end } = dayBoundsUtc(d, ATHENS);
      return (end.getTime() - start.getTime()) / 3_600_000;
    };
    expect(len('2027-02-01')).toBe(24);
    expect(len('2027-03-28')).toBe(23);
    expect(len('2027-10-31')).toBe(25);
  });
});

describe('todayInZone', () => {
  it('rolls over at local midnight, not UTC midnight', () => {
    const now = new Date('2027-02-01T22:30:00Z'); // 00:30 Feb 2 in Athens
    expect(todayInZone(ATHENS, now)).toBe('2027-02-02');
    expect(todayInZone('UTC', now)).toBe('2027-02-01');
    expect(todayInZone('America/New_York', now)).toBe('2027-02-01');
  });
});

describe('calendar-date helpers are timezone independent', () => {
  it('weekdayOf', () => {
    expect(weekdayOf('2027-02-01')).toBe('MON');
    expect(weekdayOf('2027-03-28')).toBe('SUN');
    expect(weekdayOf('2027-10-31')).toBe('SUN');
  });
  it('dateOnlyToUtc / addDays', () => {
    expect(dateOnlyToUtc('2027-02-01').toISOString()).toBe(
      '2027-02-01T00:00:00.000Z',
    );
    expect(addDays('2027-02-28', 1)).toBe('2027-03-01');
    expect(addDays('2027-03-28', -1)).toBe('2027-03-27');
  });
});

describe('buildSlotCandidates', () => {
  it('is anchored at opening time on a 30-minute grid', () => {
    const c = buildSlotCandidates(
      '2027-02-01',
      ATHENS,
      [{ startTime: '09:15', endTime: '10:45' }],
      30,
    );
    expect(c.map((x) => x.time)).toEqual(['09:15', '09:45', '10:15']);
  });

  it('never returns a slot ending after closing, measured in real time', () => {
    const c = buildSlotCandidates(
      '2027-03-28',
      ATHENS,
      [{ startTime: '02:00', endTime: '04:30' }],
      60,
    );
    // 02:00 EET..03:00 EET(=04:00 EEST) ok; 02:30 ends 04:30 EEST ok; 04:00 ends 05:00 > close.
    expect(c.map((x) => x.time)).toEqual(['02:00', '02:30']);
  });

  it('merges overlapping ranges without duplicate labels', () => {
    const c = buildSlotCandidates(
      '2027-02-01',
      ATHENS,
      [
        { startTime: '09:00', endTime: '11:00' },
        { startTime: '10:00', endTime: '12:00' },
      ],
      30,
    );
    const labels = c.map((x) => x.time);
    expect(new Set(labels).size).toBe(labels.length);
  });
});
