import { describe, expect, it } from 'vitest';
import {
  axisLabel,
  bucketLabel,
  firstName,
  formatWhen,
  greetingPeriod,
  isCurrentBucket,
  percentOf,
  showsAxisLabel,
} from './overviewFormat';

describe('greetingPeriod', () => {
  // 2026-10-01T09:30Z is 12:30 in Athens (EEST), 05:30 in New York (EDT).
  const now = new Date('2026-10-01T09:30:00Z');

  it('uses the shop timezone, not the browser', () => {
    expect(greetingPeriod('Europe/Athens', now)).toBe('afternoon');
    expect(greetingPeriod('America/New_York', now)).toBe('morning');
    expect(greetingPeriod('UTC', new Date('2026-10-01T22:00:00Z'))).toBe('evening');
  });

  it('switches at 05:00, 12:00 and 18:00', () => {
    const at = (iso: string) => greetingPeriod('UTC', new Date(iso));
    expect(at('2026-10-01T04:59:00Z')).toBe('evening');
    expect(at('2026-10-01T05:00:00Z')).toBe('morning');
    expect(at('2026-10-01T11:59:00Z')).toBe('morning');
    expect(at('2026-10-01T12:00:00Z')).toBe('afternoon');
    expect(at('2026-10-01T17:59:00Z')).toBe('afternoon');
    expect(at('2026-10-01T18:00:00Z')).toBe('evening');
  });
});

describe('firstName', () => {
  it('takes the first word', () => {
    expect(firstName('Nikos Theodosis')).toBe('Nikos');
    expect(firstName('  Maria  ')).toBe('Maria');
    expect(firstName('')).toBe('');
  });
});

describe('labels', () => {
  const dayBucket = { start: '2026-10-05', end: '2026-10-05', count: 4 };
  const weekBucket = { start: '2026-10-05', end: '2026-10-11', count: 9 };

  it('formats daily and weekly bucket labels', () => {
    expect(bucketLabel(dayBucket, 'week', 'en')).toBe('Mon 5 Oct');
    expect(bucketLabel(weekBucket, 'quarter', 'en')).toBe('5 Oct – 11 Oct');
  });

  it('formats axis ticks per range', () => {
    expect(axisLabel(dayBucket, 'week', 'en')).toBe('Mon');
    expect(axisLabel(dayBucket, 'month', 'en')).toBe('5');
    expect(axisLabel(weekBucket, 'quarter', 'en')).toBe('5 Oct');
  });

  it('localises to Greek', () => {
    expect(bucketLabel(dayBucket, 'week', 'el')).toMatch(/5/);
    expect(bucketLabel(dayBucket, 'week', 'el')).not.toBe('Mon 5 Oct');
  });

  it('always labels the latest bar and thins the rest', () => {
    const shown = (n: number, range: 'week' | 'month' | 'quarter') =>
      Array.from({ length: n }, (_, i) => showsAxisLabel(i, n, range));
    expect(shown(7, 'week').every(Boolean)).toBe(true);
    expect(shown(30, 'month').filter(Boolean)).toHaveLength(6);
    expect(shown(30, 'month')[29]).toBe(true);
    expect(shown(13, 'quarter').filter(Boolean)).toHaveLength(5);
  });
});

describe('isCurrentBucket', () => {
  it('matches the bucket containing today', () => {
    const w = { start: '2026-09-28', end: '2026-10-04', count: 0 };
    expect(isCurrentBucket(w, '2026-10-01')).toBe(true);
    expect(isCurrentBucket(w, '2026-10-04')).toBe(true);
    expect(isCurrentBucket(w, '2026-10-05')).toBe(false);
  });
});

describe('formatWhen', () => {
  it('renders in the shop timezone', () => {
    expect(formatWhen('2026-10-01T07:30:00Z', 'Europe/Athens', 'en')).toBe('Thu 1 Oct, 10:30');
    expect(formatWhen('2026-10-01T07:30:00Z', 'America/New_York', 'en')).toBe('Thu 1 Oct, 03:30');
  });
});

describe('percentOf', () => {
  it('rounds and guards against zero', () => {
    expect(percentOf(1, 3)).toBe(33);
    expect(percentOf(0, 0)).toBe(0);
  });
});
