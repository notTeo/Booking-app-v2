import { useCallback, useEffect, useRef, useState } from 'react';

const MIN_WIDTH = 180;
const MAX_WIDTH = 360;
const DEFAULT_WIDTH = 220;
const STORAGE_KEY = 'sidebar-width';

const clamp = (value: number) => Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, value));

/**
 * Draggable sidebar width (like Claude's sidebar) — clamped to
 * [MIN_WIDTH, MAX_WIDTH] and persisted across sessions. The sidebar's left
 * edge always sits at x=0, so the pointer's clientX during a drag *is* the
 * new width.
 */
export function useSidebarWidth() {
  const [width, setWidth] = useState(() => {
    const stored = Number(localStorage.getItem(STORAGE_KEY));
    return Number.isFinite(stored) && stored > 0 ? clamp(stored) : DEFAULT_WIDTH;
  });
  const resizing = useRef(false);

  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    resizing.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!resizing.current) return;
      setWidth(clamp(e.clientX));
    };
    const stopResize = () => {
      if (!resizing.current) return;
      resizing.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      setWidth((w) => {
        localStorage.setItem(STORAGE_KEY, String(w));
        return w;
      });
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', stopResize);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', stopResize);
    };
  }, []);

  return { width, startResize, minWidth: MIN_WIDTH, maxWidth: MAX_WIDTH };
}
