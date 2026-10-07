import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { cancelBooking, getManagedBooking, type CancelBookingResult } from '../api/public.api';
import { useLang } from '../context/LanguageContext';
import { apiErrorField } from '../utils/apiError';
import Alert from '../components/Alert';
import AuthTop from '../components/AuthTop';
import PublicPalette from '../components/PublicPalette';

export default function CancelBookingPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const { t, language } = useLang();

  const [loading, setLoading] = useState(false);
  const [kept, setKept] = useState(false);
  const [result, setResult] = useState<CancelBookingResult | null>(null);
  const [error, setError] = useState(token ? '' : t.cancelBooking.invalidLink);

  const confirmCancel = () => {
    setLoading(true);
    cancelBooking(token)
      .then((data) => {
        setResult(data);
      })
      .catch((err: unknown) => {
        const messages: Record<string, string> = {
          BOOKING_ALREADY_CANCELED: t.cancelBooking.alreadyCancelled,
          BOOKING_COMPLETED: t.cancelBooking.alreadyCompleted,
          BOOKING_NO_SHOW: t.cancelBooking.markedNoShow,
          BOOKING_IN_PAST: t.cancelBooking.pastBooking,
          BOOKING_NOT_FOUND: t.cancelBooking.notFound,
          INVALID_CANCEL_LINK: t.cancelBooking.notFound,
          BOOKING_RESCHEDULED: t.cancelBooking.rescheduled,
        };
        const code = apiErrorField(err, 'code');
        if (code === 'CANCEL_WINDOW_CLOSED') {
          // The notice the shop asks for isn't in the error; the booking says.
          getManagedBooking(token)
            .then((b) => setError(t.cancelBooking.windowClosed.replace('{n}', String(b.cancel.cutoffHours))))
            .catch(() => setError(t.cancelBooking.errorCancel));
          return;
        }
        setError(messages[code] ?? t.cancelBooking.errorCancel);
      })
      .finally(() => setLoading(false));
  };

  if (loading) {
    return (
      <div className="page page--center">
        <PublicPalette />
        <div className="card card--auth card--center">
          <div className="spinner spinner--lg" />
          <p className="card__text">{t.cancelBooking.cancelling}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page page--center">
        <PublicPalette />
        <div className="card card--auth card--center">
          <Alert variant="danger">{error}</Alert>
        </div>
      </div>
    );
  }

  if (kept) {
    return (
      <div className="page page--center">
        <PublicPalette />
        <div className="card card--auth card--center">
          <p>{t.cancelBooking.kept}</p>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="page page--center">
        <PublicPalette />
        <div className="card card--auth card--center">
          <h1 className="t-heading">{t.cancelBooking.confirmTitle}</h1>
          <p className="card__text">{t.cancelBooking.confirmText}</p>
          <button type="button" className="btn btn--danger btn--block" onClick={confirmCancel}>
            {t.cancelBooking.confirmButton}
          </button>
          <button type="button" className="btn btn--ghost btn--block" onClick={() => setKept(true)}>
            {t.cancelBooking.keepButton}
          </button>
        </div>
      </div>
    );
  }

  const locale = language === 'el' ? 'el-GR' : 'en-US';
  const formattedDate = new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: locale !== 'el-GR',
  }).format(new Date(result.startTime));

  return (
    <div className="page page--center">
      <PublicPalette />
      <div className="card card--auth card--center">
        <AuthTop back={false} />
        <h1 className="t-heading">{t.cancelBooking.cancelled}</h1>
        <p className="card__text">
          {t.cancelBooking.yourText} <strong>{result.serviceName}</strong> {t.cancelBooking.appointmentAt}{' '}
          <strong>{result.shopName}</strong> {t.cancelBooking.hasCancelled}
        </p>
        <p className="card__text">{formattedDate}</p>
      </div>
    </div>
  );
}
