import type { KeyboardEvent } from 'react';

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
