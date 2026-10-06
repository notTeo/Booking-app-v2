import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClock } from '@fortawesome/free-solid-svg-icons';
import type { Service } from '../../api/public.api';
import { useLang } from '../../context/LanguageContext';
import { formatDuration, formatPrice } from './wizardUtils';

export default function ServiceSelectStep({
  services,
  onSelect,
  customDurations,
}: {
  services: Service[];
  onSelect: (serviceId: string) => void;
  /** Shop wizard: the picked customer's own minutes per service id, shown in place of the standard duration. */
  customDurations?: Record<string, number>;
}) {
  const { t } = useLang();

  return (
    <div className="public-wizard-panel">
      {services.length === 0 ? (
        <p>{t.public.noServices}</p>
      ) : (
        <div className="public-options" role="radiogroup" aria-label={t.public.service}>
          {services.map((s) => (
            <button
              key={s.id}
              type="button"
              role="radio"
              aria-checked="false"
              className="service-card"
              onClick={() => onSelect(s.id)}
            >
              <span className="service-card__main">
                <span className="service-card__name">{s.name}</span>
                {s.description && <span className="service-card__desc">{s.description}</span>}
                <span className="service-card__meta">
                  <FontAwesomeIcon icon={faClock} aria-hidden="true" /> {formatDuration(customDurations?.[s.id] ?? s.duration)}
                  {customDurations?.[s.id] !== undefined && customDurations[s.id] !== s.duration && (
                    <span className="badge badge--accent">{t.customers.customDurationsBadge}</span>
                  )}
                </span>
              </span>
              <span className="service-card__price">{formatPrice(s.price)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
