import { useEffect, useState } from 'react';

// A few pixels of slack: sub-pixel layouts never land exactly on the bottom.
const SLACK_PX = 8;

/** Whether the page continues below what the window shows. */
export const hasMoreBelow = (viewportHeight: number, scrollY: number, pageHeight: number) =>
  viewportHeight + scrollY < pageHeight - SLACK_PX;

/**
 * True while there is more of the page to scroll down to. Follows scrolling,
 * window resizes and the page itself growing or shrinking (a new step, a
 * list that loaded).
 */
export function useMoreBelow() {
  const [more, setMore] = useState(false);

  useEffect(() => {
    const check = () =>
      setMore(hasMoreBelow(window.innerHeight, window.scrollY, document.documentElement.scrollHeight));
    check();
    window.addEventListener('scroll', check, { passive: true });
    window.addEventListener('resize', check);
    const observer = new ResizeObserver(check);
    observer.observe(document.body);
    return () => {
      window.removeEventListener('scroll', check);
      window.removeEventListener('resize', check);
      observer.disconnect();
    };
  }, []);

  return more;
}

/**
 * True once the bottom of the page has been reached while `active`, and it
 * stays true when scrolling back up. Starts over each time `active` turns on
 * again. A page that fits the window counts as reached at once.
 */
export function useReachedBottom(active: boolean) {
  const [reached, setReached] = useState(false);

  useEffect(() => {
    if (!active) return;
    const check = () => {
      if (!hasMoreBelow(window.innerHeight, window.scrollY, document.documentElement.scrollHeight)) setReached(true);
    };
    // After the new content has been laid out.
    const frame = requestAnimationFrame(check);
    window.addEventListener('scroll', check, { passive: true });
    window.addEventListener('resize', check);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', check);
      window.removeEventListener('resize', check);
      setReached(false);
    };
  }, [active]);

  return active && reached;
}
