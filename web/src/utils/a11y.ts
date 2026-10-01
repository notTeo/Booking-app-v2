import type { KeyboardEvent, MouseEvent } from 'react';

/**
 * For elements that aren't natively focusable/operable (e.g. a table row or
 * card acting as a navigation trigger via role="button"): activates on
 * Enter/Space, matching native button behavior.
 */
export function handleActivateKeyDown(callback: () => void) {
  return (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      callback();
    }
  };
}

/**
 * Mouse-only convenience for a table row whose first cell holds the real link:
 * runs the callback unless the click came from a link or button inside the row
 * (those handle themselves).
 */
export function handleRowClick(callback: () => void) {
  return (e: MouseEvent<HTMLElement>) => {
    if ((e.target as HTMLElement).closest('a, button')) return;
    callback();
  };
}
