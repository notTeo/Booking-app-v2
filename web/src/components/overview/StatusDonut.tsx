import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { CSSProperties } from 'react';
import { useLang } from '../../context/LanguageContext';
import type { Overview } from '../../api/overview.api';
import type { BookingStatus } from '../../api/booking.api';
import { BOOKING_STATUS } from '../bookingStatus';
import { percentOf } from '../../utils/overviewFormat';

// Legend order and the token each status is drawn with (same as the badges).
const SEGMENTS: { status: BookingStatus; key: keyof Overview['totals']; color: string }[] = [
  { status: 'CONFIRMED', key: 'confirmed', color: 'var(--success)' },
  { status: 'PENDING', key: 'pending', color: 'var(--warning)' },
  { status: 'COMPLETED', key: 'completed', color: 'var(--info)' },
  { status: 'CANCELED', key: 'canceled', color: 'var(--text-muted)' },
  { status: 'NO_SHOW', key: 'noShow', color: 'var(--danger)' },
];

export default function StatusDonut({ totals }: { totals: Overview['totals'] }) {
  const { t } = useLang();
  const total = SEGMENTS.reduce((sum, s) => sum + totals[s.key], 0);

  const stops = SEGMENTS.filter((s) => totals[s.key] > 0).map((s, i, shown) => {
    const share = (key: keyof Overview['totals']) => (totals[key] / total) * 100;
    const from = shown.slice(0, i).reduce((sum, p) => sum + share(p.key), 0);
    return `${s.color} ${from}% ${from + share(s.key)}%`;
  });

  return (
    <section className="card overview-grid__breakdown" aria-labelledby="overview-breakdown-title">
      <div className="card__header">
        <h2 className="card__title" id="overview-breakdown-title">{t.overview.breakdown.title}</h2>
      </div>
      <div className="donut" aria-hidden="true" style={{ '--donut-stops': stops.join(', ') } as CSSProperties}>
        <div className="donut__center">
          <span className="donut__value">{total}</span>
          <span className="donut__label">{t.overview.breakdown.total}</span>
        </div>
      </div>
      <ul className="legend" aria-label={t.overview.breakdown.listLabel}>
        {SEGMENTS.map((s) => {
          const entry = BOOKING_STATUS[s.status];
          return (
            <li key={s.status} className={`legend__item legend__item--${entry.cls}`}>
              <FontAwesomeIcon className="legend__icon" icon={entry.icon} aria-hidden="true" />
              <span>{t.bookings.filters.status[s.status]}</span>
              <span className="legend__count">{totals[s.key]}</span>
              <span className="legend__pct">{percentOf(totals[s.key], total)}%</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
