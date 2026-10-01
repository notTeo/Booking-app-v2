import { Link } from 'react-router-dom';
import { useLang } from '../../context/LanguageContext';
import type { BookingWithStaff } from '../../api/booking.api';
import StatusBadge from '../StatusBadge';
import Alert from '../Alert';
import { formatWhen } from '../../utils/overviewFormat';

interface Props {
  bookings: BookingWithStaff[] | undefined;
  isError: boolean;
  onRetry: () => void;
  zone: string;
  viewAllTo: string;
}

export default function UpcomingBookings({ bookings, isError, onRetry, zone, viewAllTo }: Props) {
  const { t, language } = useLang();
  const r = t.overview.upcoming;

  return (
    <section className="overview-grid__upcoming" aria-labelledby="overview-upcoming-title">
      <div className="overview-upcoming__head">
        <h2 className="card__title" id="overview-upcoming-title">{r.title}</h2>
        <Link to={viewAllTo}>{r.viewAll}</Link>
      </div>

      {isError ? (
        <Alert
          variant="danger"
          title={t.overview.error.title}
          actions={<button type="button" className="btn btn--secondary btn--sm" onClick={onRetry}>{t.overview.error.retry}</button>}
        >
          {t.overview.error.text}
        </Alert>
      ) : bookings === undefined ? (
        <UpcomingBookingsSkeleton />
      ) : (
        <div className="table-wrap">
          <div className="table-surface">
            {bookings.length === 0 ? (
              <div className="empty empty--sm">
                <p className="empty__text">{r.empty}</p>
              </div>
            ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">{r.customerCol}</th>
                  <th scope="col">{r.serviceCol}</th>
                  <th scope="col">{r.whenCol}</th>
                  <th scope="col">{r.statusCol}</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.id}>
                    <td data-label={r.customerCol} className="data-table__title">
                      {b.customer.contactHidden ? t.customers.hiddenLabel : b.customer.name}
                    </td>
                    <td data-label={r.serviceCol}>{b.service.name}</td>
                    <td data-label={r.whenCol}>{formatWhen(b.startTime, zone, language)}</td>
                    <td data-label={r.statusCol}><StatusBadge status={b.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

export function UpcomingBookingsSkeleton() {
  return (
    <div className="card" aria-hidden="true">
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className="skeleton skeleton--chip" />
      ))}
    </div>
  );
}
