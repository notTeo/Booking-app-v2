import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { cancelBooking, type CancelBookingResult } from '../api/public.api';
import '../styles/pages/invites.css';

export default function CancelBookingPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';

  const called = useRef(false);
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<CancelBookingResult | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    if (!token) {
      setError('Invalid cancellation link.');
      setLoading(false);
      return;
    }

    cancelBooking(token)
      .then((data) => {
        setResult(data);
      })
      .catch((err: any) => {
        const msg: string = err?.response?.data?.error ?? '';
        if (msg.includes('already')) setError('This booking has already been cancelled.');
        else if (msg.includes('not found')) setError('Booking not found. The link may be invalid or expired.');
        else setError('Could not cancel booking. Please try again or contact the shop.');
      })
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="accept-invite-page">
        <div className="accept-invite-card">
          <div className="spinner" />
          <p style={{ marginTop: '1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Cancelling your booking...
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

  const formattedDate = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(result.startTime));

  return (
    <div className="accept-invite-page">
      <div className="accept-invite-card">
        <h1 style={{ marginBottom: '0.5rem' }}>Booking Cancelled</h1>
        <div className="accept-invite-meta">
          <p>
            Your <strong>{result.serviceName}</strong> appointment at{' '}
            <strong>{result.shopName}</strong> has been cancelled.
          </p>
          <p style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
            {formattedDate}
          </p>
        </div>
      </div>
    </div>
  );
}
