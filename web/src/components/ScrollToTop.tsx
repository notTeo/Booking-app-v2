import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// React Router doesn't reset scroll position on navigation (only full page
// loads do) — without this, clicking a Link while scrolled down on one page
// lands you at the same scroll offset on the next page. The browser's own
// automatic scroll restoration (history.scrollRestoration === 'auto') fights
// this and wins — it re-applies the old scroll offset to the new page right
// after our scrollTo runs — so it has to be turned off too.
if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
  window.history.scrollRestoration = 'manual';
}

export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    // 'instant' bypasses the site's global `scroll-behavior: smooth` (see
    // base.css) — that CSS is meant for in-page anchor links, not this.
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);

  return null;
}
