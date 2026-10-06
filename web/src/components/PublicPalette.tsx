import { useLayoutEffect } from 'react';
import { loadPublicFont, type PublicFont, type PublicPalette as Palette } from '../utils/branding';

/**
 * The look of the pages a shop's customers see (booking, reschedule, cancel),
 * whatever colour set the visitor picked inside the app: the colour set and
 * fonts the shop chose, or black and white with the standard fonts when it is
 * not known (yet). Set on <html>, like AppPalette, so the page background and
 * modals follow it too.
 */
export default function PublicPalette({
  palette = 'mono',
  font = 'default',
}: {
  palette?: Palette;
  font?: PublicFont;
}) {
  useLayoutEffect(() => {
    const root = document.documentElement;
    // Original is the values on :root, so it needs no attribute.
    if (palette === 'original') root.removeAttribute('data-palette');
    else root.setAttribute('data-palette', palette);
    return () => root.removeAttribute('data-palette');
  }, [palette]);

  useLayoutEffect(() => {
    const root = document.documentElement;
    if (font === 'default') return;
    loadPublicFont(font);
    root.setAttribute('data-font', font);
    return () => root.removeAttribute('data-font');
  }, [font]);

  return null;
}
