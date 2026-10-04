import { describe, it, expect } from 'vitest';
import { COLLAPSED_WIDTH, snapWidth, stepWidth } from './useSidebarWidth';

describe('snapWidth', () => {
  it('keeps a width inside the range', () => {
    expect(snapWidth(300)).toBe(300);
  });

  it('clamps to the widest rail', () => {
    expect(snapWidth(900)).toBe(400);
  });

  it('holds the minimum just below it', () => {
    expect(snapWidth(180)).toBe(200);
  });

  it('snaps to the icon rail when dragged really close', () => {
    expect(snapWidth(139)).toBe(COLLAPSED_WIDTH);
    expect(snapWidth(0)).toBe(COLLAPSED_WIDTH);
  });

  it('expands again once dragged back past the snap point', () => {
    expect(snapWidth(140)).toBe(200);
  });

  it('keeps a stored icon rail collapsed', () => {
    expect(snapWidth(COLLAPSED_WIDTH)).toBe(COLLAPSED_WIDTH);
  });
});

describe('stepWidth', () => {
  it('moves by one step inside the range', () => {
    expect(stepWidth(256, -1)).toBe(240);
    expect(stepWidth(256, 1)).toBe(272);
  });

  it('collapses from the minimum width', () => {
    expect(stepWidth(200, -1)).toBe(COLLAPSED_WIDTH);
  });

  it('expands the icon rail to the minimum width', () => {
    expect(stepWidth(COLLAPSED_WIDTH, 1)).toBe(200);
  });

  it('stays put at either end', () => {
    expect(stepWidth(COLLAPSED_WIDTH, -1)).toBe(COLLAPSED_WIDTH);
    expect(stepWidth(400, 1)).toBe(400);
  });
});
