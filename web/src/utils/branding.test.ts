import { describe, expect, it } from 'vitest';
import { parsePublicFont, parsePublicPalette } from './branding';

describe('parsePublicPalette', () => {
  it('keeps a known colour set', () => {
    expect(parsePublicPalette('rose')).toBe('rose');
    expect(parsePublicPalette('original')).toBe('original');
  });
  it('falls back to black and white', () => {
    expect(parsePublicPalette('neon')).toBe('mono');
    expect(parsePublicPalette(null)).toBe('mono');
    expect(parsePublicPalette(undefined)).toBe('mono');
  });
});

describe('parsePublicFont', () => {
  it('keeps a known font set', () => {
    expect(parsePublicFont('noto-serif')).toBe('noto-serif');
  });
  it('falls back to the standard fonts', () => {
    expect(parsePublicFont('Comic Sans')).toBe('default');
    expect(parsePublicFont(null)).toBe('default');
  });
});
