import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCircleQuestion,
  faTrash,
  faTriangleExclamation,
  type IconDefinition,
} from '@fortawesome/free-solid-svg-icons';

type Tone = 'danger' | 'warning' | 'neutral';

const TONE: Record<Tone, { icon: IconDefinition; iconCls: string; btnCls: string }> = {
  danger: { icon: faTrash, iconCls: '', btnCls: ' btn--danger' },
  warning: { icon: faTriangleExclamation, iconCls: ' modal__icon--warning', btnCls: '' },
  neutral: { icon: faCircleQuestion, iconCls: ' modal__icon--accent', btnCls: '' },
};

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Modal confirmation: title, message, and two buttons.
 * - portal, role="alertdialog", labelled and described, aria-modal
 * - focus moves to the safe (cancel) button, is trapped inside, and returns to the trigger on close
 * - Escape or the backdrop cancels; body scroll is locked while open
 */
export default function ConfirmDialog({
  title,
  message,
  confirmLabel,
  cancelLabel,
  tone = 'neutral',
  busy,
  confirmDisabled,
  children,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  tone?: Tone;
  busy?: boolean;
  /** Extra reason to keep the confirm button inert (e.g. a required field is empty). */
  confirmDisabled?: boolean;
  /** Optional content between the message and the buttons (e.g. a password field). */
  children?: ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const id = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const onCancelRef = useRef(onCancel);
  const { icon, iconCls, btnCls } = TONE[tone];

  useEffect(() => {
    onCancelRef.current = onCancel;
  });

  useEffect(() => {
    const trigger = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    cancelRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
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
      document.body.style.overflow = prevOverflow;
      trigger?.focus();
    };
  }, []);

  return createPortal(
    <div className="modal-backdrop" onClick={onCancel}>
      <div
        ref={dialogRef}
        className="modal modal--confirm"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-message`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal__header">
          <span className={`modal__icon${iconCls}`}>
            <FontAwesomeIcon icon={icon} aria-hidden="true" />
          </span>
          <h2 id={`${id}-title`} className="modal__title">{title}</h2>
        </div>
        <p id={`${id}-message`} className="modal__body">{message}</p>
        {children}
        <div className="modal__footer">
          <button type="button" className="btn btn--secondary" ref={cancelRef} onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`btn${btnCls}${busy ? ' is-loading' : ''}`}
            onClick={busy ? undefined : onConfirm}
            aria-busy={busy}
            disabled={confirmDisabled}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
