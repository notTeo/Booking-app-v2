import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUsers } from '@fortawesome/free-solid-svg-icons';
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

  return (
    <div className="public-wizard-panel">
      {selectedService && (
        <p className="public-wizard-context">
          {t.public.serviceContext} <strong>{selectedService.name}</strong>
        </p>
      )}

      {members.length === 0 ? (
        <p>{t.public.noStaff}</p>
      ) : (
        <div className="public-team-grid">
          {members.map((m) => (
            <button
              key={m.id}
              className="public-team-card public-team-card--selectable"
              onClick={() => onSelect(m.id)}
            >
              <div className="public-team-avatar">
                {m.name?.charAt(0)?.toUpperCase() ?? '?'}
              </div>
              <div className="public-team-info">
                <h3>{m.name}</h3>
                {m.staffServices.length > 0 && (
                  <div className="public-team-services">
                    {m.staffServices.map((ss) => (
                      <span key={ss.service.id} className="public-team-service-tag">
                        {ss.service.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      <button className="public-team-card public-team-card--selectable" onClick={() => onSelect(null)}>
        <div className="public-team-avatar"><FontAwesomeIcon icon={faUsers} /></div>
        <div className="public-team-info">
          <h3>{t.public.noPreference}</h3>
          <p className="public-team-any-subtitle">{t.public.anyStaff}</p>
        </div>
      </button>

      <button className="btn btn-ghost wizard-btn" onClick={onBack}>{t.public.back}</button>
    </div>
  );
}
