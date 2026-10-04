import { describe, it, expect } from 'vitest';
import { parseSavedCustomer } from './savedCustomer';

const NOW = Date.UTC(2026, 9, 4);
const DAY = 24 * 60 * 60 * 1000;
const stored = (over: Record<string, unknown> = {}) =>
  JSON.stringify({ name: 'Ann', phone: '6900000000', email: 'ann@example.com', savedAt: NOW, ...over });

describe('parseSavedCustomer', () => {
  it('returns the saved details', () => {
    expect(parseSavedCustomer(stored(), NOW)).toEqual({
      name: 'Ann',
      phone: '6900000000',
      email: 'ann@example.com',
    });
  });
  it('keeps an empty email (it is optional on the form)', () => {
    expect(parseSavedCustomer(stored({ email: '' }), NOW)?.email).toBe('');
  });
  it('nothing stored reads as nothing saved', () => {
    expect(parseSavedCustomer(null, NOW)).toBeNull();
    expect(parseSavedCustomer('', NOW)).toBeNull();
  });
  it('malformed or unexpected content reads as nothing saved', () => {
    expect(parseSavedCustomer('{not json', NOW)).toBeNull();
    expect(parseSavedCustomer('null', NOW)).toBeNull();
    expect(parseSavedCustomer('"Ann"', NOW)).toBeNull();
    expect(parseSavedCustomer(stored({ phone: 6900000000 }), NOW)).toBeNull();
    expect(parseSavedCustomer(stored({ email: null }), NOW)).toBeNull();
    expect(parseSavedCustomer(stored({ savedAt: 'yesterday' }), NOW)).toBeNull();
  });
  it('drops details older than a year', () => {
    expect(parseSavedCustomer(stored({ savedAt: NOW - 364 * DAY }), NOW)).not.toBeNull();
    expect(parseSavedCustomer(stored({ savedAt: NOW - 366 * DAY }), NOW)).toBeNull();
  });
  it('caps over-long values instead of prefilling them whole', () => {
    expect(parseSavedCustomer(stored({ name: 'a'.repeat(500) }), NOW)?.name).toHaveLength(100);
  });
});
