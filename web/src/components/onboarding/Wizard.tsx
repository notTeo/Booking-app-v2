import { type ReactNode } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck } from '@fortawesome/free-solid-svg-icons';
import { useLang } from '../../context/LanguageContext';
import { useIsCompact } from '../../hooks/useIsCompact';

export interface WizardStepItem {
  key: string;
  label: string;
  /** A finished step that can be opened again from its tick. */
  onOpen?: () => void;
}

interface WizardProps {
  steps: WizardStepItem[];
  /** Index of the step on screen. */
  current: number;
  /** The step came from a later one: it slides in from the left. */
  back?: boolean;
  /** A wider column, for the three plan cards side by side. */
  wide?: boolean;
  footer: ReactNode;
  children: ReactNode;
}

/**
 * The new-shop flow's frame: the steps bar, one step on screen, and a footer
 * that stays in view. A step slides in when it changes (it is keyed by the
 * step, so the animation runs again).
 */
export default function Wizard({ steps, current, back, wide, footer, children }: WizardProps) {
  const { t } = useLang();
  const compact = useIsCompact();
  const state = (i: number) => (i < current ? 'is-done' : i === current ? 'is-current' : '');

  return (
    <div className={`wizard${wide ? ' wizard--wide' : ''}${compact ? ' is-compact' : ''}`}>
      <nav className="steps-wrap" aria-label={t.onboarding.stepsLabel}>
        <ol className="steps">
          {steps.map((step, i) => {
            const marker = (
              <span className="steps__marker">
                {i < current ? <FontAwesomeIcon icon={faCheck} aria-hidden="true" /> : i + 1}
              </span>
            );
            const cls = `steps__item ${state(i)}`.trim();
            // A finished step is a button back to it; the rest are plain items.
            return i < current && step.onOpen ? (
              <li key={step.key} className={cls}>
                <button type="button" className="steps__item is-done" onClick={step.onOpen}>
                  {marker}
                  {step.label}
                </button>
              </li>
            ) : (
              <li key={step.key} className={cls} aria-current={i === current ? 'step' : undefined}>
                {marker}
                {step.label}
              </li>
            );
          })}
        </ol>
        <div className="steps-compact">
          <div className="steps-compact__text">
            <span className="steps-compact__title">{steps[current]?.label}</span>
            <span className="steps-compact__count">
              {t.onboarding.stepOf.replace('{n}', String(current + 1)).replace('{total}', String(steps.length))}
            </span>
          </div>
          <div className="steps-compact__bar" aria-hidden="true">
            {steps.map((step, i) => (
              <span key={step.key} className={state(i)} />
            ))}
          </div>
        </div>
      </nav>
      <section key={steps[current]?.key} className={`wizard__step wizard__step--slide${back ? ' is-back' : ''}`}>
        {children}
      </section>
      {footer}
    </div>
  );
}

interface WizardFooterProps {
  onBack?: () => void;
  onSkip?: () => void;
  /** A short reassurance beside the main button, on a step with no Back. */
  note?: string;
  main: {
    label: string;
    onClick?: () => void;
    /** Submits the step's form instead of calling onClick. */
    form?: string;
    loading?: boolean;
    disabled?: boolean;
  };
}

/** Back on the left, Skip and the step's one main button on the right. */
export function WizardFooter({ onBack, onSkip, note, main }: WizardFooterProps) {
  const { t } = useLang();
  const compact = useIsCompact();
  const busy = !!main.loading;

  return (
    <div className={`wizard__foot${compact ? ' is-compact' : ''}`}>
      {onBack && (
        <button type="button" className="btn btn--ghost wizard__back" onClick={onBack} disabled={busy}>
          {t.onboarding.back}
        </button>
      )}
      {!onBack && note && <span className="wizard__note">{note}</span>}
      {onSkip && (
        <button type="button" className="btn btn--ghost" onClick={onSkip} disabled={busy}>
          {t.onboarding.skip}
        </button>
      )}
      <button
        type={main.form ? 'submit' : 'button'}
        form={main.form}
        className={`btn wizard__main${busy ? ' is-loading' : ''}`}
        onClick={main.onClick}
        disabled={main.disabled}
        aria-busy={busy}
      >
        {main.label}
      </button>
    </div>
  );
}

/** A step's title and the sentence under it. */
export function WizardIntro({ title, text, badge }: { title: string; text: string; badge?: string }) {
  return (
    <div className="wizard__intro">
      {badge && <span className="badge badge--neutral">{badge}</span>}
      <h1 className="t-title">{title}</h1>
      <p className="t-muted">{text}</p>
    </div>
  );
}
