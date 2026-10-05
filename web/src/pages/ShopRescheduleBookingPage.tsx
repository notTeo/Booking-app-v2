import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useShop } from '../context/ShopContext';
import { useLang } from '../context/LanguageContext';
import { getApiError, getBooking, type Booking } from '../api/booking.api';
import OwnerBookingWizard from '../components/booking-wizard/OwnerBookingWizard';
import Alert from '../components/Alert';
import { dateInZone } from '../utils/shopTime';
import '../styles/pages/public.css';

// Only bookings that still hold their slot can move; the calendar hides the
// button for the rest, this guards a typed-in or stale URL.
const RESCHEDULABLE = new Set<Booking['status']>(['PENDING', 'CONFIRMED']);

export default function ShopRescheduleBookingPage() {
  const { slug, bookingId } = useParams<{ slug: string; bookingId: string }>();
  const { shop, isLoading } = useShop();
  const { t } = useLang();
  const navigate = useNavigate();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!shop || !bookingId) return;
    let stale = false;
    getBooking(shop.id, bookingId)
      .then((b) => { if (!stale) setBooking(b); })
      .catch((err) => {
        if (stale) return;
        setError(getApiError(err).status === 404 ? t.bookings.reschedule.notFound : t.bookings.errorLoad);
      });
    return () => { stale = true; };
  }, [shop?.id, bookingId]);

  if (isLoading) return <div className="spinner-wrap"><div className="spinner spinner--lg" /></div>;
  if (!shop || !slug || !bookingId) return null;

  const backToCalendar = (
    <Link className="btn btn--ghost" to={`/shops/${slug}/bookings`}>{t.public.back}</Link>
  );

  let body;
  if (error) {
    body = <><Alert variant="danger">{error}</Alert>{backToCalendar}</>;
  } else if (!booking) {
    body = <div className="spinner-wrap"><div className="spinner spinner--lg" /></div>;
  } else if (!RESCHEDULABLE.has(booking.status)) {
    body = <><Alert variant="warning">{t.bookings.reschedule.notAllowed}</Alert>{backToCalendar}</>;
  } else {
    body = (
      <OwnerBookingWizard
        shopId={shop.id}
        slug={slug}
        reschedule={{ booking, zone: shop.timezone }}
        // Back to the calendar on the day the booking is still on.
        onCancel={() => navigate(`/shops/${slug}/bookings?date=${dateInZone(booking.startTime, shop.timezone)}`)}
        onDone={(moved) =>
          navigate(`/shops/${slug}/bookings?date=${dateInZone(moved.startTime, shop.timezone)}`)
        }
      />
    );
  }

  return (
    <div className="public-page">
      <header className="page-hero">
        <div className="page-hero__inner">
          <h1 className="t-title">{shop.name}</h1>
        </div>
      </header>

      <main className="public-main">{body}</main>
    </div>
  );
}
