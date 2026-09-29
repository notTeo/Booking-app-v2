import { describe, it, expect } from 'vitest';
import { isPlausiblePhone } from './common';

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
