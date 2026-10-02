import { describe, it, expect } from 'vitest';
import { fillIfEmpty, isExactPhoneMatch, shouldLookUpCustomer } from './customerAutofill';

describe('fillIfEmpty', () => {
  it('fills an empty (or whitespace-only) field', () => {
    expect(fillIfEmpty('', 'Ann')).toBe('Ann');
    expect(fillIfEmpty('   ', 'Ann')).toBe('Ann');
  });
  it('never overwrites text the user typed', () => {
    expect(fillIfEmpty('Bob', 'Ann')).toBe('Bob');
    expect(fillIfEmpty('b', 'Ann')).toBe('b');
  });
  it('a missing looked-up value leaves an empty field empty (never "null")', () => {
    expect(fillIfEmpty('', null)).toBe('');
    expect(fillIfEmpty('', undefined)).toBe('');
  });
  it('never clears typed text, even when the match has nothing to offer', () => {
    expect(fillIfEmpty('Bob', null)).toBe('Bob');
  });
});

describe('isExactPhoneMatch', () => {
  it('matches the same number regardless of formatting', () => {
    expect(isExactPhoneMatch('6911223344', '6911223344')).toBe(true);
    expect(isExactPhoneMatch('691 122 3344', '6911223344')).toBe(true);
    expect(isExactPhoneMatch('+30 691-122-3344', '306911223344')).toBe(true);
  });
  it('a partial number is not a match', () => {
    expect(isExactPhoneMatch('691122', '6911223344')).toBe(false);
  });
  it('empty or hidden (redacted) numbers never match', () => {
    expect(isExactPhoneMatch('', '6911223344')).toBe(false);
    expect(isExactPhoneMatch('6911223344', '')).toBe(false);
    expect(isExactPhoneMatch('', '')).toBe(false);
  });
});

describe('shouldLookUpCustomer', () => {
  it('looks up once two characters are typed', () => {
    expect(shouldLookUpCustomer(true, '6')).toBe(false);
    expect(shouldLookUpCustomer(true, ' 6 ')).toBe(false);
    expect(shouldLookUpCustomer(true, '69')).toBe(true);
  });
  it('never looks up for a member who may not see customer details', () => {
    expect(shouldLookUpCustomer(false, '6900000000')).toBe(false);
  });
});
