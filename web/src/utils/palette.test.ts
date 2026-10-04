import { describe, it, expect } from 'vitest';
import { PALETTES, parsePalette } from './palette';

describe('parsePalette', () => {
  it('accepts every known colour set', () => {
    for (const p of PALETTES) expect(parsePalette(p)).toBe(p);
  });

  it('falls back to the original set for a missing or unknown value', () => {
    for (const value of [null, undefined, '', 'green', 'MONO', 'dark']) {
      expect(parsePalette(value)).toBe('original');
    }
  });
});
