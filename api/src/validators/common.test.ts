import { describe, it, expect } from 'vitest';
import {
  isInstant,
  isPlausiblePhone,
  normalizePhone,
  phoneDigits,
} from './common';

describe('normalizePhone', () => {
  it('stores one form: + and the country code, then digits', () => {
    expect(normalizePhone('+30 694 123 4567')).toBe('+306941234567');
    expect(normalizePhone('+44 (7911) 123-456')).toBe('+447911123456');
  });

  it('takes a number with no country code to be a Greek one', () => {
    expect(normalizePhone('694 123 4567')).toBe('+306941234567');
    expect(normalizePhone('2101234567')).toBe('+302101234567');
  });

  it('reads 00 and a bare 30 in front as the country code', () => {
    expect(normalizePhone('0030 694 123 4567')).toBe('+306941234567');
    expect(normalizePhone('00447911123456')).toBe('+447911123456');
    expect(normalizePhone('306941234567')).toBe('+306941234567');
  });
});

describe('phoneDigits', () => {
  it('keeps what was typed, without separators or a guessed country code', () => {
    expect(phoneDigits('694 123')).toBe('694123');
    expect(phoneDigits('+30 694')).toBe('+30694');
  });
});

describe('isPlausiblePhone', () => {
  it('accepts real-world phone formats', () => {
    expect(isPlausiblePhone('6900000000')).toBe(true);
    expect(isPlausiblePhone('+306900000000')).toBe(true);
    expect(isPlausiblePhone('+30 690 000 0000')).toBe(true);
    expect(isPlausiblePhone('(690) 000-0000')).toBe(true);
    expect(isPlausiblePhone('690.000.0000')).toBe(true);
  });

  it('rejects garbage: letters, too short, too long, empty, wrong type', () => {
    expect(isPlausiblePhone('not a phone')).toBe(false);
    expect(isPlausiblePhone('12345')).toBe(false); // only 5 digits
    expect(isPlausiblePhone('1'.repeat(16))).toBe(false); // 16 digits, over E.164
    expect(isPlausiblePhone('')).toBe(false);
    expect(isPlausiblePhone('☎️ 6900000000')).toBe(false); // emoji not in the allowed charset
    expect(isPlausiblePhone(undefined)).toBe(false);
    expect(isPlausiblePhone(12345678)).toBe(false);
    expect(isPlausiblePhone(['6900000000'])).toBe(false);
  });

  it('accepts the boundary lengths (7 and 15 digits)', () => {
    expect(isPlausiblePhone('1234567')).toBe(true);
    expect(isPlausiblePhone('123456789012345')).toBe(true);
    expect(isPlausiblePhone('123456')).toBe(false);
    expect(isPlausiblePhone('1234567890123456')).toBe(false);
  });
});

describe('isInstant', () => {
  it('accepts a full timestamp with an offset or Z', () => {
    expect(isInstant('2026-12-08T10:00:00+02:00')).toBe(true);
    expect(isInstant('2026-12-08T08:00:00.000Z')).toBe(true);
    expect(isInstant('2026-12-08T08:00Z')).toBe(true);
  });

  it('rejects a time with no offset, which would be read in the server zone', () => {
    expect(isInstant('2026-12-08T10:00:00')).toBe(false);
    expect(isInstant('2026-12-08')).toBe(false);
  });

  it('rejects ISO 8601 forms Date cannot parse, and impossible dates', () => {
    expect(isInstant('2026-W50')).toBe(false);
    expect(isInstant('20261208T080000Z')).toBe(false);
    expect(isInstant('2026-342')).toBe(false);
    expect(isInstant('2026-13-01T10:00:00Z')).toBe(false);
    expect(isInstant(['2026-12-08T08:00:00Z'])).toBe(false);
  });
});
