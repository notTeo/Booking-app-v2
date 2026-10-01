import type { ReactNode } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCircleCheck,
  faCircleExclamation,
  faCircleInfo,
  faTriangleExclamation,
  type IconDefinition,
} from '@fortawesome/free-solid-svg-icons';

type AlertVariant = 'danger' | 'success' | 'warning' | 'info';

const VARIANT: Record<AlertVariant, { cls: string; icon: IconDefinition }> = {
  danger: { cls: ' alert--danger', icon: faCircleExclamation },
  success: { cls: ' alert--success', icon: faCircleCheck },
  warning: { cls: ' alert--warning', icon: faTriangleExclamation },
  info: { cls: '', icon: faCircleInfo },
};

interface AlertProps {
  variant: AlertVariant;
  title?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}

export default function Alert({ variant, title, actions, children }: AlertProps) {
  const { cls, icon } = VARIANT[variant];
  return (
    <div className={`alert${cls}`} role={variant === 'danger' ? 'alert' : 'status'}>
      <FontAwesomeIcon className="alert__icon" icon={icon} aria-hidden="true" />
      <div className="alert__body">
        {title && <span className="alert__title">{title}</span>}
        {children}
        {actions && <div className="alert__actions">{actions}</div>}
      </div>
    </div>
  );
}
