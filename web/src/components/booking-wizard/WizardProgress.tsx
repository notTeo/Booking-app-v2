import { useLang } from '../../context/LanguageContext';
import type { WizardStep } from '../../hooks/useBookingWizard';

const TOTAL = 4;

/** "Step 1 of 4" above a four-part bar: the steps done and the current one are filled. */
export default function WizardProgress({ step }: { step: WizardStep }) {
  const { t } = useLang();
  return (
    <div className="wizard-progress">
      <p className="booking-card__step">
        {t.public.stepLabel.replace('{n}', String(step)).replace('{total}', String(TOTAL))}
      </p>
      <div className="wizard-progress__bar" role="presentation">
        {Array.from({ length: TOTAL }, (_, i) => (
          <span key={i} className={i + 1 <= step ? 'is-done' : ''} />
        ))}
      </div>
    </div>
  );
}
