import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClock } from '@fortawesome/free-solid-svg-icons';
import type { Service } from '../../api/public.api';
import { useLang } from '../../context/LanguageContext';
import { formatDuration, formatPrice } from './wizardUtils';

export default function ServiceSelectStep({
  services,
  onSelect,
}: {
  services: Service[];
  onSelect: (serviceId: string) => void;
}) {
  const { t } = useLang();

  return (
    <div className="public-wizard-panel">
      {services.length === 0 ? (
        <p>{t.public.noServices}</p>
      ) : (
        <div className="public-services-grid">
          {services.map((s) => (
            <button
              key={s.id}
              className="public-service-card public-service-card--selectable"
              onClick={() => onSelect(s.id)}
            >
              <div className="public-service-header">
                <h3>{s.name}</h3>
                <span className="public-service-price">{formatPrice(s.price)}</span>
              </div>
              {s.description && <p className="public-service-desc">{s.description}</p>}
              <div className="public-service-duration">
                <FontAwesomeIcon icon={faClock} /> {formatDuration(s.duration)}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
