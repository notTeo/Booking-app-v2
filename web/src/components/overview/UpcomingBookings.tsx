import Avatar from '../Avatar';
import { Link } from 'react-router-dom';
import { useLang } from '../../context/LanguageContext';
import type { BookingWithStaff } from '../../api/booking.api';
import StatusBadge from '../StatusBadge';
import Alert from '../Alert';
import { formatWhen } from '../../utils/overviewFormat';
import { bookingServiceNames } from '../../utils/bookingServices';

/** A booking from another shop: carries that shop's identity and timezone. */
export type UpcomingBooking = BookingWithStaff & {
  shop?: { id: string; name: string; slug: string; timezone: string };
};

interface Props {
  bookings: UpcomingBooking[] | undefined;
  isError: boolean;
  onRetry: () => void;
  /** Timezone for bookings that don't carry their own shop. */
  zone?: string;
  /** Omit to hide the "view all" link. */
  viewAllTo?: string;
  /** Adds a Shop column (shop name in the row card on phones). */
  showShop?: boolean;
}

export default function UpcomingBookings({ bookings, isError, onRetry, zone = 'UTC', viewAllTo, showShop = false }: Props) {
  const { t, language } = useLang();
  const r = t.overview.upcoming;

  return (
    <section className="overview-grid__upcoming" aria-labelledby="overview-upcoming-title">
      <div className="overview-upcoming__head">
        <h2 className="card__title" id="overview-upcoming-title">{r.title}</h2>
        {viewAllTo && <Link to={viewAllTo}>{r.viewAll}</Link>}
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
                  {showShop && <th scope="col">{r.shopCol}</th>}
                  <th scope="col">{r.whenCol}</th>
                  <th scope="col">{r.statusCol}</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.id}>
                    <td data-label={r.customerCol} className="data-table__title">
                      <span className="cluster cluster--tight">
                        {b.customer.photoUrl && !b.customer.contactHidden && (
                          <Avatar name={b.customer.name} photoUrl={b.customer.photoUrl} size="sm" />
                        )}
                        {b.customer.contactHidden ? t.customers.hiddenLabel : b.customer.name}
                      </span>
                    </td>
                    <td data-label={r.serviceCol}>{bookingServiceNames(b)}</td>
                    {showShop && <td data-label={r.shopCol}>{b.shop?.name}</td>}
                    <td data-label={r.whenCol}>{formatWhen(b.startTime, b.shop?.timezone ?? zone, language)}</td>
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
