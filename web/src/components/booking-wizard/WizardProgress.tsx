import { useLang } from '../../context/LanguageContext';
import type { WizardStep } from '../../hooks/useBookingWizard';

/** "Step 1 of 4" above a bar with a part per step: the steps done and the current one are filled. */
export default function WizardProgress({ step, total }: { step: WizardStep; total: number }) {
  const { t } = useLang();
  return (
    <div className="wizard-progress">
      <p className="booking-card__step">
        {t.public.stepLabel.replace('{n}', String(step)).replace('{total}', String(total))}
      </p>
      <div className="wizard-progress__bar" role="presentation">
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className={i + 1 <= step ? 'is-done' : ''} />
        ))}
      </div>
    </div>
  );
}
