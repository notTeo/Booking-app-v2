import { describe, expect, it } from 'vitest';
import { hasMoreBelow } from './useMoreBelow';

describe('hasMoreBelow', () => {
  it('is true while the page continues under the window', () => {
    expect(hasMoreBelow(800, 0, 2000)).toBe(true);
    expect(hasMoreBelow(800, 1000, 2000)).toBe(true);
  });

  it('is false at the bottom, and for a page that fits the window', () => {
    expect(hasMoreBelow(800, 1200, 2000)).toBe(false);
    expect(hasMoreBelow(800, 0, 800)).toBe(false);
    expect(hasMoreBelow(800, 0, 600)).toBe(false);
  });

  it('ignores a few stray pixels', () => {
    expect(hasMoreBelow(800, 1195, 2000)).toBe(false);
    expect(hasMoreBelow(800, 1180, 2000)).toBe(true);
  });
});
