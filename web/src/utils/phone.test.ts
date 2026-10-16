import { describe, it, expect } from 'vitest';
import { formatPhone, groupDigits, normalizePhone, splitPhone } from './phone';

describe('normalizePhone', () => {
  it('stores + and the country code, taking a bare number to be Greek', () => {
    expect(normalizePhone('+30 694 123 4567')).toBe('+306941234567');
    expect(normalizePhone('694 123 4567')).toBe('+306941234567');
    expect(normalizePhone('0030 694 123 4567')).toBe('+306941234567');
    expect(normalizePhone('306941234567')).toBe('+306941234567');
    expect(normalizePhone('+44 7911 123456')).toBe('+447911123456');
  });
});

describe('splitPhone', () => {
  it('separates a listed country code from the number', () => {
    expect(splitPhone('+306941234567')).toEqual({ code: '30', national: '6941234567' });
    expect(splitPhone('+35799123456')).toEqual({ code: '357', national: '99123456' });
    expect(splitPhone('6941234567')).toEqual({ code: '30', national: '6941234567' });
  });

  it('leaves a code that is not listed with the number', () => {
    expect(splitPhone('+99912345678')).toEqual({ code: '', national: '99912345678' });
  });
});

describe('groupDigits', () => {
  it('spaces digits in threes, never leaving one digit alone', () => {
    expect(groupDigits('6941234567')).toBe('694 123 4567');
    expect(groupDigits('99123456')).toBe('991 234 56');
    expect(groupDigits('694')).toBe('694');
    expect(groupDigits('6941')).toBe('6941');
    expect(groupDigits('')).toBe('');
  });
});

describe('formatPhone', () => {
  it('shows a stored number with its country code and spaces', () => {
    expect(formatPhone('+306941234567')).toBe('+30 694 123 4567');
    expect(formatPhone('+447911123456')).toBe('+44 791 112 3456');
  });

  it('shows anything else as it is', () => {
    expect(formatPhone('6941234567')).toBe('6941234567');
    expect(formatPhone('+99912345678')).toBe('+99912345678');
    expect(formatPhone('')).toBe('');
    expect(formatPhone(null)).toBe('');
  });
});
