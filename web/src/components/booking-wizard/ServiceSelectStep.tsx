import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faClock } from '@fortawesome/free-solid-svg-icons';
import type { Service } from '../../api/public.api';
import { useLang } from '../../context/LanguageContext';
import { MAX_SERVICES } from '../../hooks/useBookingWizard';
import { formatDuration, formatPrice, servicesSummary } from './wizardUtils';

/**
 * The services to choose from. By default one is picked and the wizard moves
 * on (`onSelect`, used when rescheduling). With `selectedIds` and `onToggle`
 * several can be picked, each shown with a check circle; the wizard moves on
 * from its own button (the public page's footer), or from the one here when
 * `onContinue` is given (the shop's wizard).
 */
export default function ServiceSelectStep({
  services,
  onSelect,
  selectedIds,
  onToggle,
  onContinue,
  customDurations,
}: {
  services: Service[];
  onSelect?: (serviceId: string) => void;
  selectedIds?: string[];
  onToggle?: (serviceId: string) => void;
  /** Shows a Continue button (with the running total) under the list. */
  onContinue?: () => void;
  /** Shop wizard: the picked customer's own minutes per service id, shown in place of the standard duration. */
  customDurations?: Record<string, number>;
}) {
  const { t } = useLang();
  const multi = !!onToggle;
  const chosen = selectedIds ?? [];
  const durationOf = (s: Service) => customDurations?.[s.id] ?? s.duration;
  const picked = services.filter((s) => chosen.includes(s.id));
  const atLimit = chosen.length >= MAX_SERVICES;

  return (
    <div className="public-wizard-panel">
      {services.length === 0 ? (
        <p>{t.public.noServices}</p>
      ) : (
        <div className={`public-options${multi ? ' public-options--list' : ''}`} role={multi ? 'group' : 'radiogroup'} aria-label={t.public.service}>
          {services.map((s) => {
            const selected = chosen.includes(s.id);
            return (
              <button
                key={s.id}
                type="button"
                role={multi ? 'checkbox' : 'radio'}
                aria-checked={selected}
                aria-disabled={multi && !selected && atLimit ? true : undefined}
                className="service-card"
                onClick={() => {
                  if (multi) {
                    if (selected || !atLimit) onToggle!(s.id);
                  } else onSelect?.(s.id);
                }}
              >
                {multi && (
                  <span className="option-check" aria-hidden="true">
                    <FontAwesomeIcon icon={faCheck} />
                  </span>
                )}
                <span className="service-card__main">
                  <span className="service-card__name">{s.name}</span>
                  {s.description && <span className="service-card__desc">{s.description}</span>}
                  <span className="service-card__meta">
                    <FontAwesomeIcon icon={faClock} aria-hidden="true" /> {formatDuration(durationOf(s))}
                    {customDurations?.[s.id] !== undefined && customDurations[s.id] !== s.duration && (
                      <span className="badge badge--accent">{t.customers.customDurationsBadge}</span>
                    )}
                  </span>
                </span>
                <span className="service-card__price">{formatPrice(s.price)}</span>
              </button>
            );
          })}
        </div>
      )}
      {multi && atLimit && <p className="field__hint">{t.public.servicesLimit.replace('{n}', String(MAX_SERVICES))}</p>}
      {multi && onContinue && (
        <>
          {picked.length > 1 && <p className="t-body-sm t-muted">{servicesSummary(t.public, picked, durationOf)}</p>}
          <button type="button" className="btn" disabled={picked.length === 0} onClick={onContinue}>
            {t.public.continue}
          </button>
        </>
      )}
    </div>
  );
}
