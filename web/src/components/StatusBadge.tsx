import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useLang } from '../context/LanguageContext';
import type { BookingStatus } from '../api/booking.api';
import { BOOKING_STATUS as STATUS } from './bookingStatus';

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
