// The looks a shop can pick for its public booking page: the data-palette and
// data-font sets in tokens.css. Mirrors api/src/utils/branding.ts; the first
// of each is the default.
export const PUBLIC_PALETTES = ['mono', 'original', 'purple', 'blue', 'rose', 'sand'] as const;
export type PublicPalette = (typeof PUBLIC_PALETTES)[number];

export const PUBLIC_FONTS = ['default', 'manrope', 'noto-serif', 'alegreya', 'comfortaa', 'roboto-slab'] as const;
export type PublicFont = (typeof PUBLIC_FONTS)[number];

/** A stored or typed value as a colour set; anything unknown is black and white. */
export const parsePublicPalette = (value: string | null | undefined): PublicPalette =>
  PUBLIC_PALETTES.includes(value as PublicPalette) ? (value as PublicPalette) : 'mono';

/** A stored or typed value as a font set; anything unknown is the standard fonts. */
export const parsePublicFont = (value: string | null | undefined): PublicFont =>
  PUBLIC_FONTS.includes(value as PublicFont) ? (value as PublicFont) : 'default';

// The font files are bundled (no third-party font host) but split out, so a
// visitor only downloads the one the shop uses.
const FONT_FILES: Record<Exclude<PublicFont, 'default'>, () => Promise<unknown>> = {
  manrope: () => import('@fontsource-variable/manrope/index.css'),
  'noto-serif': () => import('@fontsource-variable/noto-serif/index.css'),
  alegreya: () => import('@fontsource-variable/alegreya/index.css'),
  comfortaa: () => import('@fontsource-variable/comfortaa/index.css'),
  'roboto-slab': () => import('@fontsource-variable/roboto-slab/index.css'),
};

/** Fetches a font set's files. Until they arrive (or if they fail) the fallback fonts show. */
export const loadPublicFont = (font: PublicFont) => {
  if (font !== 'default') FONT_FILES[font]().catch(() => {});
};
