import { useEffect, useRef, type RefObject } from 'react';

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Open modals, oldest first. Only the last one answers the keyboard, so a
// dialog opened from inside another (e.g. a confirm) doesn't close both on Esc.
const openModals: symbol[] = [];

/**
 * Shared modal behaviour: body scroll lock, focus into the dialog (the
 * `initialFocus` element, else the first control), Tab trapped inside, Escape
 * calls `onCancel`, and focus returns to the trigger on close.
 * `paused` hands the keyboard to a dialog stacked on top of this one.
 */
export function useModalBehavior(
  dialogRef: RefObject<HTMLElement | null>,
  onCancel: () => void,
  options: { initialFocus?: RefObject<HTMLElement | null>; paused?: boolean } = {},
) {
  const onCancelRef = useRef(onCancel);
  const pausedRef = useRef(false);
  useEffect(() => {
    onCancelRef.current = onCancel;
    pausedRef.current = !!options.paused;
  });

  const initialFocus = options.initialFocus;
  useEffect(() => {
    const trigger = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const dialog = dialogRef.current;
    (initialFocus?.current ?? dialog?.querySelector<HTMLElement>(FOCUSABLE))?.focus();

    const self = Symbol('modal');
    openModals.push(self);

    const onKey = (e: KeyboardEvent) => {
      if (pausedRef.current || openModals[openModals.length - 1] !== self) return;
      if (e.key === 'Escape') {
        onCancelRef.current();
        return;
      }
      if (e.key !== 'Tab' || !dialogRef.current) return;
      const items = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !dialogRef.current.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !dialogRef.current.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      openModals.splice(openModals.indexOf(self), 1);
      document.body.style.overflow = prevOverflow;
      trigger?.focus();
    };
  }, [dialogRef, initialFocus]);
}
