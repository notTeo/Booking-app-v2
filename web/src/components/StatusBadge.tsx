import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBan,
  faCalendarCheck,
  faCircleCheck,
  faClock,
  faXmark,
  type IconDefinition,
} from '@fortawesome/free-solid-svg-icons';
import { useLang } from '../context/LanguageContext';
import type { BookingStatus } from '../api/booking.api';

// Single place that maps a DB booking status to its design-system badge modifier.
const STATUS: Record<BookingStatus, { cls: string; icon: IconDefinition }> = {
  PENDING: { cls: 'pending', icon: faClock },
  CONFIRMED: { cls: 'confirmed', icon: faCalendarCheck },
  COMPLETED: { cls: 'completed', icon: faCircleCheck },
  CANCELED: { cls: 'canceled', icon: faXmark },
  NO_SHOW: { cls: 'no-show', icon: faBan },
};

export default function StatusBadge({ status }: { status: BookingStatus | string }) {
  const { t } = useLang();
  const entry = STATUS[status as BookingStatus];
  if (!entry) return <span className="badge badge--neutral">{status}</span>;
  return (
    <span className={`badge badge--${entry.cls}`}>
      <FontAwesomeIcon className="icon" icon={entry.icon} aria-hidden="true" />
      {t.bookings.filters.status[status as BookingStatus]}
    </span>
  );
}
