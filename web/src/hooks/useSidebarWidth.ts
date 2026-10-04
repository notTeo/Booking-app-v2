import { useCallback, useRef, useState } from 'react';

const MIN_WIDTH = 200;
const MAX_WIDTH = 400;
const DEFAULT_WIDTH = 256;
const STEP = 16;
const STORAGE_KEY = 'sidebar-width';

const clamp = (value: number) => Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, value));

function read(): number {
  try {
    const stored = Number(localStorage.getItem(STORAGE_KEY));
    return Number.isFinite(stored) && stored > 0 ? clamp(stored) : DEFAULT_WIDTH;
  } catch {
    return DEFAULT_WIDTH;
  }
}

function write(width: number) {
  try {
    localStorage.setItem(STORAGE_KEY, String(width));
  } catch {
    // Private mode or blocked storage: the width just won't persist.
  }
}

/**
 * Draggable width for the desktop sidebar, clamped and remembered. The rail's
 * left edge sits at x=0, so the pointer's clientX during a drag is the width.
 * Spread `handleProps` onto the drag handle (pointer drag, arrow keys, and
 * double-click to reset).
 */
export function useSidebarWidth() {
  const [width, setWidth] = useState(read);
  const [dragging, setDragging] = useState(false);
  const active = useRef(false);
  const moved = useRef(false);

  const commit = useCallback((next: number) => {
    const w = clamp(next);
    setWidth(w);
    write(w);
  }, []);

  const handleProps = {
    role: 'separator' as const,
    'aria-orientation': 'vertical' as const,
    'aria-valuemin': MIN_WIDTH,
    'aria-valuemax': MAX_WIDTH,
    'aria-valuenow': width,
    tabIndex: 0,
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      active.current = true;
      moved.current = false;
      setDragging(true);
      document.body.style.userSelect = 'none';
    },
    onPointerMove: (e: React.PointerEvent<HTMLElement>) => {
      if (!active.current) return;
      moved.current = true;
      setWidth(clamp(e.clientX));
    },
    onPointerUp: (e: React.PointerEvent<HTMLElement>) => {
      if (!active.current) return;
      active.current = false;
      setDragging(false);
      document.body.style.userSelect = '';
      // A plain click on the edge must not nudge the width.
      if (moved.current) commit(e.clientX);
    },
    onKeyDown: (e: React.KeyboardEvent<HTMLElement>) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); commit(width - STEP); }
      if (e.key === 'ArrowRight') { e.preventDefault(); commit(width + STEP); }
    },
    onDoubleClick: () => commit(DEFAULT_WIDTH),
  };

  return { width, dragging, handleProps };
}
