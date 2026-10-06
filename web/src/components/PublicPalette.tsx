import { useLayoutEffect } from 'react';

/**
 * Black and white for the pages a shop's customers see (booking, reschedule,
 * cancel), whatever colour set the visitor picked inside the app. Set on
 * <html>, like AppPalette, so the page background and modals follow it too.
 */
export default function PublicPalette() {
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-palette', 'mono');
    return () => root.removeAttribute('data-palette');
  }, []);

  return null;
}
