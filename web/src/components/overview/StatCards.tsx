import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBan, faCalendarCheck, faCircleCheck, faXmark } from '@fortawesome/free-solid-svg-icons';
import { useLang } from '../../context/LanguageContext';
import type { Overview } from '../../api/overview.api';

/** The four totals as tinted tiles: in a row, or 2 by 2 with `tiles` (the overview's side column). */
export default function StatCards({ totals, tiles = false }: { totals: Overview['totals']; tiles?: boolean }) {
  const { t } = useLang();
  const cards = [
    { key: 'bookings', tone: 'accent', icon: faCalendarCheck, label: t.overview.stats.bookings, value: totals.all },
    { key: 'completed', tone: 'info', icon: faCircleCheck, label: t.overview.stats.completed, value: totals.completed },
    { key: 'canceled', tone: 'neutral', icon: faXmark, label: t.overview.stats.canceled, value: totals.canceled },
    { key: 'noShow', tone: 'danger', icon: faBan, label: t.overview.stats.noShow, value: totals.noShow },
  ] as const;

  return (
    <div className={`stat-grid${tiles ? ' stat-grid--tiles' : ''}`}>
      {cards.map((c) => (
        <div key={c.key} className={`card stat stat--tile stat--${c.tone}`}>
          <span className={`stat__icon stat__icon--${c.tone}`}>
            <FontAwesomeIcon icon={c.icon} aria-hidden="true" />
          </span>
          <span className="stat__value">{c.value}</span>
          <span className="stat__label">{c.label}</span>
        </div>
      ))}
    </div>
  );
}
