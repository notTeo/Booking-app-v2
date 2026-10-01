import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faUsers } from '@fortawesome/free-solid-svg-icons';
import type { Service, ShopMember } from '../../api/public.api';
import { useLang } from '../../context/LanguageContext';

export default function StaffSelectStep({
  members,
  selectedService,
  onSelect,
  onBack,
}: {
  members: ShopMember[];
  selectedService: Service | null;
  onSelect: (memberId: string | null) => void;
  onBack: () => void;
}) {
  const { t } = useLang();
  const check = (
    <span className="option-check" aria-hidden="true"><FontAwesomeIcon icon={faCheck} /></span>
  );

  return (
    <div className="public-wizard-panel">
      {selectedService && (
        <p className="public-wizard-context">
          {t.public.serviceContext} <strong>{selectedService.name}</strong>
        </p>
      )}

      {members.length === 0 && <p>{t.public.noStaff}</p>}

      <div className="public-options" role="radiogroup" aria-label={t.public.staff}>
        {members.map((m) => (
          <button
            key={m.id}
            type="button"
            role="radio"
            aria-checked="false"
            className="staff-card"
            onClick={() => onSelect(m.id)}
          >
            <span className="avatar avatar--lg" aria-hidden="true">
              {m.name?.charAt(0)?.toUpperCase() ?? '?'}
            </span>
            <span className="staff-card__main">
              <span className="staff-card__name">{m.name}</span>
              {m.staffServices.length > 0 && (
                <span className="staff-card__role">
                  {m.staffServices.map((ss) => ss.service.name).join(', ')}
                </span>
              )}
            </span>
            {check}
          </button>
        ))}

        <button
          type="button"
          role="radio"
          aria-checked="false"
          className="staff-card"
          onClick={() => onSelect(null)}
        >
          <span className="avatar avatar--lg" aria-hidden="true"><FontAwesomeIcon icon={faUsers} /></span>
          <span className="staff-card__main">
            <span className="staff-card__name">{t.public.noPreference}</span>
            <span className="staff-card__role">{t.public.anyStaff}</span>
          </span>
          {check}
        </button>
      </div>

      <button className="btn btn--secondary wizard-btn" onClick={onBack}>{t.public.back}</button>
    </div>
  );
}
