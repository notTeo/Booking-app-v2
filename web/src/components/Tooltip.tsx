import { useState, type ReactNode } from 'react';

interface TooltipProps {
  /** Same text as the control's aria-label: the bubble is visual only. */
  label: string;
  /** `end` lines the bubble up with the trigger's right edge (controls at a bar's right). */
  align?: 'center' | 'end';
  children: ReactNode;
}

// DS Tooltip: shows on hover and keyboard focus (CSS), hides on Esc until the
// pointer or focus leaves (WCAG 1.4.13, dismissible).
export default function Tooltip({ label, align = 'center', children }: TooltipProps) {
  const [dismissed, setDismissed] = useState(false);
  const classes = ['tooltip'];
  if (align === 'end') classes.push('tooltip--end');
  if (dismissed) classes.push('is-dismissed');

  return (
    <span
      className={classes.join(' ')}
      onKeyDown={(e) => { if (e.key === 'Escape') setDismissed(true); }}
      onMouseLeave={() => setDismissed(false)}
      onBlur={() => setDismissed(false)}
    >
      {children}
      <span className="tooltip__bubble" aria-hidden="true">{label}</span>
    </span>
  );
}
