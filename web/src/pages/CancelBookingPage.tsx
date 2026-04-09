import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { cancelBooking, type CancelBookingResult } from '../api/public.api';
import { useLang } from '../context/LanguageContext';
import '../styles/pages/invites.css';

export default function CancelBookingPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const { t, language } = useLang();

  const called = useRef(false);
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<CancelBookingResult | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    if (!token) {
      setError(t.cancelBooking.invalidLink);
      setLoading(false);
      return;
    }

    cancelBooking(token)
      .then((data) => {
        setResult(data);
      })
      .catch((err: any) => {
        const msg: string = err?.response?.data?.error ?? '';
        if (msg.includes('already')) setError(t.cancelBooking.alreadyCancelled);
        else if (msg.includes('not found')) setError(t.cancelBooking.notFound);
        else setError(t.cancelBooking.errorCancel);
      })
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="accept-invite-page">
        <div className="accept-invite-card">
          <div className="spinner" />
          <p style={{ marginTop: '1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            {t.cancelBooking.cancelling}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="accept-invite-page">
        <div className="accept-invite-card">
          <p className="accept-invite-error">{error}</p>
        </div>
      </div>
    );
  }

  if (!result) return null;

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
    <div className="accept-invite-page">
      <div className="accept-invite-card">
        <h1 style={{ marginBottom: '0.5rem' }}>{t.cancelBooking.cancelled}</h1>
        <div className="accept-invite-meta">
          <p>
            {t.cancelBooking.yourText} <strong>{result.serviceName}</strong> {t.cancelBooking.appointmentAt}{' '}
            <strong>{result.shopName}</strong> {t.cancelBooking.hasCancelled}
          </p>
          <p style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
            {formattedDate}
          </p>
        </div>
      </div>
    </div>
  );
}
