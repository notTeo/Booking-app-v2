import { describe, it, expect } from 'vitest';
import { isPlausibleSlug, publicShopPath } from './publicLink';

describe('isPlausibleSlug', () => {
  it('accepts valid slugs', () => {
    for (const s of ['hairology', 'my-shop-2', 'abc', 'a'.repeat(40)]) {
      expect(isPlausibleSlug(s)).toBe(true);
    }
  });
  it('rejects things that cannot be a shop, so they never hit the API', () => {
    for (const s of ['ab', 'a'.repeat(41), '-shop', 'shop-', 'Shop', 'favicon.ico', 'robots.txt', 'a b', '']) {
      expect(isPlausibleSlug(s)).toBe(false);
    }
  });
});

describe('publicShopPath', () => {
  it('is the root-level path', () => {
    expect(publicShopPath('hairology')).toBe('/hairology');
  });
});
