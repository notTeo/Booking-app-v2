import { useEffect, useRef } from 'react';

interface PollingTarget {
  doc: Pick<Document, 'visibilityState' | 'addEventListener' | 'removeEventListener'>;
  win: Pick<Window, 'setInterval' | 'clearInterval' | 'addEventListener' | 'removeEventListener'>;
}

/**
 * Runs `run` every `intervalMs` while the tab is visible, and once right away
 * when the tab becomes visible or the window regains focus. Nothing runs
 * while the tab is hidden. Returns the function that stops it.
 */
export function startPolling(run: () => void, intervalMs: number, { doc, win }: PollingTarget) {
  const tick = () => {
    if (doc.visibilityState === 'visible') run();
  };
  const timer = win.setInterval(tick, intervalMs);
  doc.addEventListener('visibilitychange', tick);
  win.addEventListener('focus', tick);
  return () => {
    win.clearInterval(timer);
    doc.removeEventListener('visibilitychange', tick);
    win.removeEventListener('focus', tick);
  };
}

/**
 * Keeps a page that is left open current: `callback` runs on a timer while
 * the tab is visible and the moment it is looked at again (see startPolling).
 */
export function usePolling(callback: () => void, intervalMs: number) {
  // The latest callback, so a new one each render does not restart the timer.
  const saved = useRef(callback);
  useEffect(() => {
    saved.current = callback;
  });

  useEffect(
    () => startPolling(() => saved.current(), intervalMs, { doc: document, win: window }),
    [intervalMs],
  );
}
