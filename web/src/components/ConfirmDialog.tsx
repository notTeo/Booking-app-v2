import { useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCircleQuestion,
  faTrash,
  faTriangleExclamation,
  type IconDefinition,
} from '@fortawesome/free-solid-svg-icons';
import { useModalBehavior } from '../hooks/useModalBehavior';

type Tone = 'danger' | 'warning' | 'neutral';

const TONE: Record<Tone, { icon: IconDefinition; iconCls: string; btnCls: string }> = {
  danger: { icon: faTrash, iconCls: '', btnCls: ' btn--danger' },
  warning: { icon: faTriangleExclamation, iconCls: ' modal__icon--warning', btnCls: '' },
  neutral: { icon: faCircleQuestion, iconCls: ' modal__icon--accent', btnCls: '' },
};

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
  const { icon, iconCls, btnCls } = TONE[tone];

  useModalBehavior(dialogRef, onCancel, { initialFocus: cancelRef });

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
        <div className="modal__body">
          <p id={`${id}-message`}>{message}</p>
          {children}
        </div>
        <div className="modal__footer">
          <button type="button" className="btn btn--ghost" ref={cancelRef} onClick={onCancel} disabled={busy}>
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
