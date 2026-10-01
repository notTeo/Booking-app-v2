import { useEffect, useRef, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { verifyEmail, resendVerification } from '../api/auth.api';
import '../styles/pages/verify-email.css';
import { apiErrorMessage } from '../utils/apiError';
import Alert from '../components/Alert';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [isExpired, setIsExpired] = useState(false);

  const [resendEmail, setResendEmail] = useState('');
  const [resendStatus, setResendStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle');
  const [resendError, setResendError] = useState('');

  // useRef persists across StrictMode double-invocations, preventing a second API call
  // that would consume the one-time token before the first call's result is processed.
  const called = useRef(false);

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    const token = searchParams.get('token');
    if (!token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time token call on mount; the ref guard must stay in the effect (StrictMode double-run would spend the token twice)
      setStatus('error');
      setMessage('Invalid verification link.');
      return;
    }

    verifyEmail(token)
      .then(() => {
        setStatus('success');
        setMessage('Email verified successfully. You can now log in.');
      })
      .catch((err: unknown) => {
        const msg = apiErrorMessage(err, 'Verification failed.');
        setStatus('error');
        setMessage(msg);
        if (msg.toLowerCase().includes('expired')) {
          setIsExpired(true);
        }
      });
  }, [searchParams]);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (resendStatus === 'loading') return;
    setResendError('');
    setResendStatus('loading');
    try {
      await resendVerification(resendEmail);
      setResendStatus('sent');
      setTimeout(() => setResendStatus('idle'), 4000);
    } catch {
      setResendStatus('error');
      setResendError('Something went wrong. Please try again.');
      setTimeout(() => setResendStatus('idle'), 4000);
    }
  };

  return (
    <div className="page">
      <div className="card card--auth">
        <h1 className="t-heading">Email Verification</h1>

        {status === 'loading' && <p className="verify-email-status">Verifying...</p>}

        {status === 'success' && (
          <>
            <Alert variant="success">{message}</Alert>
            <Link to="/login"><button className="btn btn--block">Go to Login</button></Link>
          </>
        )}

        {status === 'error' && (
          <>
            <Alert variant="danger">{message}</Alert>

            {isExpired && (
              <form onSubmit={handleResend} className="verify-resend-form">
                <p className="verify-resend-label">Enter your email to get a new link:</p>
                <div className="field">
                  <input className="input"
                    type="email"
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                  />
                </div>
                {resendStatus === 'sent' && (
                  <Alert variant="success">
                    Email sent! Check your inbox and spam folder.
                  </Alert>
                )}
                {resendStatus === 'error' && (
                  <Alert variant="danger">{resendError}</Alert>
                )}
                <button className={`btn btn--block${resendStatus === 'loading' ? ' is-loading' : ''}`} type="submit" aria-busy={resendStatus === 'loading'}>
                  Resend Verification Email
                </button>
              </form>
            )}

            {!isExpired && (
              <Link to="/register"><button className="btn btn--secondary btn--block">Back to Register</button></Link>
            )}
          </>
        )}
      </div>
    </div>
  );
}
