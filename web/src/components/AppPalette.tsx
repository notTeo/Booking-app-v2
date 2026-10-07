import { useLayoutEffect } from 'react';
import { usePalette } from '../context/PaletteContext';

/**
 * Puts the chosen colour set on <html> while an app layout, a marketing page
 * (through SiteNav) or a login page (through AuthTop) is mounted, and takes
 * it off again on the way out, so a shop's public pages keep their own look. On <html> rather than the layout so the page background and
 * modals (rendered into <body>) follow it too.
 */
export default function AppPalette() {
  const { palette } = usePalette();

  useLayoutEffect(() => {
    const root = document.documentElement;
    if (palette === 'original') root.removeAttribute('data-palette');
    else root.setAttribute('data-palette', palette);
    return () => root.removeAttribute('data-palette');
  }, [palette]);

  return null;
}
