import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck } from '@fortawesome/free-solid-svg-icons';
import { useLang } from '../../context/LanguageContext';
import type { WizardStep } from '../../hooks/useBookingWizard';

export default function WizardStepsIndicator({ currentStep }: { currentStep: WizardStep }) {
  const { t } = useLang();
  const steps = [t.public.service, t.public.staff, t.public.dateTime, t.public.yourDetails];
  const state = (stepNum: number) =>
    currentStep > stepNum ? 'is-done' : currentStep === stepNum ? 'is-current' : '';

  return (
    <div className="steps-wrap">
      <ol className="steps">
        {steps.map((label, i) => {
          const stepNum = i + 1;
          return (
            <li
              key={label}
              className={`steps__item ${state(stepNum)}`.trim()}
              aria-current={currentStep === stepNum ? 'step' : undefined}
            >
              <span className="steps__marker">
                {currentStep > stepNum ? <FontAwesomeIcon icon={faCheck} aria-hidden="true" /> : stepNum}
              </span>
              {label}
            </li>
          );
        })}
      </ol>
      <div className="steps-compact">
        <div className="steps-compact__text">
          <span className="steps-compact__title">{steps[currentStep - 1]}</span>
          <span className="steps-compact__count">
            {t.public.stepOf.replace('{n}', String(currentStep)).replace('{total}', String(steps.length))}
          </span>
        </div>
        <div className="steps-compact__bar" aria-hidden="true">
          {steps.map((label, i) => (
            <span key={label} className={state(i + 1)} />
          ))}
        </div>
      </div>
    </div>
  );
}
