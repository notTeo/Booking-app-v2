// The looks a shop can pick for its public booking page. The values are the
// `data-palette` and `data-font` sets defined in the web app's tokens.css
// (mirrored in web/src/utils/branding.ts); the first of each is the default.
export const PUBLIC_PALETTES = [
  'mono',
  'original',
  'purple',
  'blue',
  'rose',
  'sand',
] as const;

export const PUBLIC_FONTS = [
  'default',
  'manrope',
  'noto-serif',
  'alegreya',
  'comfortaa',
  'roboto-slab',
] as const;
