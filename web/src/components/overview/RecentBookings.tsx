import { Link } from 'react-router-dom';
import { useLang } from '../../context/LanguageContext';
import type { Booking } from '../../api/booking.api';
import StatusBadge from '../StatusBadge';
import Alert from '../Alert';
import { formatWhen } from '../../utils/overviewFormat';

interface Props {
  bookings: Booking[] | undefined;
  isError: boolean;
  onRetry: () => void;
  zone: string;
  viewAllTo: string;
}

export default function RecentBookings({ bookings, isError, onRetry, zone, viewAllTo }: Props) {
  const { t, language } = useLang();
  const r = t.overview.recent;

  return (
    <section className="overview-grid__recent" aria-labelledby="overview-recent-title">
      <div className="overview-recent__head">
        <h2 className="card__title" id="overview-recent-title">{r.title}</h2>
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
        <RecentBookingsSkeleton />
      ) : (
        <div className="table-wrap">
          <div className="table-surface">
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
          </div>
        </div>
      )}
    </section>
  );
}

export function RecentBookingsSkeleton() {
  return (
    <div className="card" aria-hidden="true">
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className="skeleton skeleton--chip" />
      ))}
    </div>
  );
}
