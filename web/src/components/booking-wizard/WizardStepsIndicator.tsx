import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck } from '@fortawesome/free-solid-svg-icons';
import { useLang } from '../../context/LanguageContext';
import type { WizardStep } from '../../hooks/useBookingWizard';

export default function WizardStepsIndicator({ currentStep }: { currentStep: WizardStep }) {
  const { t } = useLang();
  const steps = [t.public.service, t.public.staff, t.public.dateTime, t.public.yourDetails];

  return (
    <div className="public-wizard-steps">
      {steps.map((label, i) => {
        const stepNum = (i + 1) as WizardStep;
        const isCompleted = currentStep > stepNum;
        const isActive = currentStep === stepNum;
        return (
          <div
            key={label}
            className={[
              'public-wizard-step',
              isActive ? 'public-wizard-step--active' : '',
              isCompleted ? 'public-wizard-step--completed' : '',
            ].join(' ').trim()}
          >
            <span className="public-wizard-step-number">
              {isCompleted ? <FontAwesomeIcon icon={faCheck} /> : stepNum}
            </span>
            <span className="public-wizard-step-label">{label}</span>
          </div>
        );
      })}
    </div>
  );
}
