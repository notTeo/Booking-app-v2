import { useLayoutEffect, useRef, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { useModalBehavior } from '../hooks/useModalBehavior';

// Longer than the exit animation (--motion-base); only a safety net in case
// `animationend` never fires.
const EXIT_FALLBACK_MS = 600;

/**
 * Modal shell: portal, backdrop, the `.modal` dialog and the shared keyboard
 * behaviour (see useModalBehavior). The consumer renders `.modal__header`,
 * `.modal__body` and `.modal__footer` inside.
 *
 * Closing plays the enter animation in reverse, whichever way the modal goes
 * away (Esc, backdrop, a button, or the parent unmounting it after a save):
 * once React has removed the backdrop, the same node is put back, inert, with
 * `is-closing` and dropped when its animation ends.
 */
export default function Modal({
  onClose,
  labelledBy,
  describedBy,
  role = 'dialog',
  className = '',
  initialFocus,
  paused,
  children,
}: {
  /** Esc and backdrop click. */
  onClose: () => void;
  labelledBy: string;
  describedBy?: string;
  role?: 'dialog' | 'alertdialog';
  /** Extra classes on the dialog, e.g. `modal--confirm`. */
  className?: string;
  initialFocus?: RefObject<HTMLElement | null>;
  /** Hands the keyboard to a dialog stacked on top of this one. */
  paused?: boolean;
  children: ReactNode;
}) {
  const backdropRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useModalBehavior(dialogRef, onClose, { initialFocus, paused });

  useLayoutEffect(() => {
    const node = backdropRef.current;
    return () => {
      if (!node || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      // After the commit: a real unmount has detached the node by now, while
      // StrictMode's simulated one leaves it in place.
      queueMicrotask(() => {
        if (node.isConnected) return;
        node.classList.add('is-closing');
        node.setAttribute('aria-hidden', 'true');
        node.inert = true;
        document.body.appendChild(node);
        const remove = () => node.remove();
        node.addEventListener('animationend', (e) => { if (e.target === node) remove(); });
        window.setTimeout(remove, EXIT_FALLBACK_MS);
      });
    };
  }, []);

  return createPortal(
    <div ref={backdropRef} className="modal-backdrop" onClick={onClose}>
      <div
        ref={dialogRef}
        className={`modal${className ? ` ${className}` : ''}`}
        role={role}
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
