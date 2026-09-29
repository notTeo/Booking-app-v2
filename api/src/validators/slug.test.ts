import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { checkSlug, RESERVED_SLUGS } from './slug';

describe('checkSlug', () => {
  it('accepts valid slugs, including the boundary lengths', () => {
    expect(checkSlug('hairology')).toBeNull();
    expect(checkSlug('my-shop-2')).toBeNull();
    expect(checkSlug('abc')).toBeNull();
    expect(checkSlug('a'.repeat(40))).toBeNull();
    expect(checkSlug('123')).toBeNull();
  });

  it('rejects wrong lengths', () => {
    expect(checkSlug('ab')).toBe('length');
    expect(checkSlug('')).toBe('length');
    expect(checkSlug('a'.repeat(41))).toBe('length');
  });

  it('rejects bad characters and leading/trailing hyphens', () => {
    expect(checkSlug('-shop')).toBe('format');
    expect(checkSlug('shop-')).toBe('format');
    expect(checkSlug('My-Shop')).toBe('format');
    expect(checkSlug('my_shop')).toBe('format');
    expect(checkSlug('my shop')).toBe('format');
    expect(checkSlug('my.shop')).toBe('format');
    expect(checkSlug('σαλόνι')).toBe('format');
    expect(checkSlug('a/b')).toBe('format');
    expect(checkSlug(['shop', 'x'])).toBe('format');
    expect(checkSlug(undefined)).toBe('format');
  });

  it('rejects reserved slugs', () => {
    for (const s of ['login', 'dashboard', 'api', 'admin', 'privacy']) {
      expect(checkSlug(s)).toBe('reserved');
    }
  });

  it('reserves every static route in web/src/App.tsx', () => {
    const app = readFileSync(
      join(__dirname, '../../../web/src/App.tsx'),
      'utf8',
    );
    const tops = [...app.matchAll(/path="\/([a-z0-9-]+)/g)].map((m) => m[1]);
    expect(tops.length).toBeGreaterThan(10);
    for (const top of tops) expect(RESERVED_SLUGS.has(top)).toBe(true);
  });

  it('reserves every top-level api mount in app.ts', () => {
    const app = readFileSync(join(__dirname, '../app.ts'), 'utf8');
    const mounts = [...app.matchAll(/app\.use\('\/([a-z0-9-]+)/g)].map(
      (m) => m[1],
    );
    expect(mounts.length).toBeGreaterThan(3);
    for (const m of mounts) expect(RESERVED_SLUGS.has(m)).toBe(true);
  });
});
