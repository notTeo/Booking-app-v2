import { describe, expect, it } from 'vitest';
import { cropPixels } from './cropPreview';

describe('cropPixels', () => {
  it('turns fractions into pixels', () => {
    expect(cropPixels({ x: 0.25, y: 0.5, width: 0.5, height: 0.25 }, 800, 400)).toEqual({
      x: 200,
      y: 200,
      width: 400,
      height: 100,
    });
  });

  it('keeps the area inside the image when rounding pushes it over', () => {
    expect(cropPixels({ x: 0.6, y: -0.001, width: 0.5, height: 1.001 }, 100, 100)).toEqual({
      x: 60,
      y: 0,
      width: 40,
      height: 100,
    });
  });

  it('never returns an empty area', () => {
    const area = cropPixels({ x: 1, y: 1, width: 0, height: 0 }, 10, 10);
    expect(area.width).toBe(1);
    expect(area.height).toBe(1);
  });
});
