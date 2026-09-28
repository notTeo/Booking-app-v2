import { describe, it, expect } from 'vitest';
import {
  dateInZone,
  formatTimeInZone,
  minutesOfDayInZone,
  shiftDate,
  todayInZone,
  wallClockToISO,
} from './shopTime';

const ATHENS = 'Europe/Athens';

describe('todayInZone', () => {
  it('rolls over at the SHOP midnight regardless of browser TZ', () => {
    const now = new Date('2027-02-01T22:30:00Z'); // 00:30 Feb 2 in Athens
    expect(todayInZone(ATHENS, now)).toBe('2027-02-02');
    expect(todayInZone('America/New_York', now)).toBe('2027-02-01');
  });
});

describe('dateInZone / minutesOfDayInZone / formatTimeInZone', () => {
  it('place a late-evening UTC instant on the next Athens day', () => {
    expect(dateInZone('2027-02-01T22:30:00Z', ATHENS)).toBe('2027-02-02');
    expect(minutesOfDayInZone('2027-02-01T22:30:00Z', ATHENS)).toBe(30);
  });
  it('follow DST: 07:00Z is 10:00 in summer, 09:00Z is 11:00 in winter', () => {
    expect(minutesOfDayInZone('2027-07-05T07:00:00Z', ATHENS)).toBe(10 * 60);
    expect(minutesOfDayInZone('2027-02-01T09:00:00Z', ATHENS)).toBe(11 * 60);
  });
  it('formats the time in the shop zone, not the browser zone', () => {
    expect(formatTimeInZone('2027-02-01T08:00:00Z', ATHENS)).toMatch(/^10:00/);
  });
});

describe('shiftDate', () => {
  it('is pure calendar arithmetic, even across DST days', () => {
    expect(shiftDate('2027-03-27', 1)).toBe('2027-03-28');
    expect(shiftDate('2027-03-28', 1)).toBe('2027-03-29');
    expect(shiftDate('2027-10-31', -1)).toBe('2027-10-30');
    expect(shiftDate('2027-02-28', 1)).toBe('2027-03-01');
  });
});

describe('wallClockToISO', () => {
  it('rejects an invalid zone', () => {
    expect(() => wallClockToISO('2027-02-01', '10:00', 'Nope/Zone')).toThrow();
  });
});
