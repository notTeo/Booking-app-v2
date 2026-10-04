/** The app's colour sets. `original` is the default and needs no attribute. */
export const PALETTES = ['original', 'mono', 'purple'] as const;
export type Palette = (typeof PALETTES)[number];

export const PALETTE_COOKIE = 'palette';

/** A stored value as a palette; anything unknown is the original set. */
export const parsePalette = (value: string | null | undefined): Palette =>
  PALETTES.includes(value as Palette) ? (value as Palette) : 'original';
