import { useEffect, useRef, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { verifyEmail, resendVerification } from '../api/auth.api';
import '../styles/pages/verify-email.css';

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
      setStatus('error');
      setMessage('Invalid verification link.');
      return;
    }

    verifyEmail(token)
      .then(() => {
        setStatus('success');
        setMessage('Email verified successfully. You can now log in.');
      })
      .catch((err: any) => {
        const msg = err.response?.data?.message ?? 'Verification failed.';
        setStatus('error');
        setMessage(msg);
        if (msg.toLowerCase().includes('expired')) {
          setIsExpired(true);
        }
      });
  }, [searchParams]);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
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
      <div className="card">
        <h1>Email Verification</h1>

        {status === 'loading' && <p className="verify-email-status">Verifying...</p>}

        {status === 'success' && (
          <>
            <div className="alert alert-success">{message}</div>
            <Link to="/login"><button className="btn btn-primary">Go to Login</button></Link>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="alert alert-error">{message}</div>

            {isExpired && (
              <form onSubmit={handleResend} className="verify-resend-form">
                <p className="verify-resend-label">Enter your email to get a new link:</p>
                <div className="form-group">
                  <input
                    type="email"
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                  />
                </div>
                {resendStatus === 'sent' && (
                  <div className="alert alert-success">
                    Email sent! Check your inbox and spam folder.
                  </div>
                )}
                {resendStatus === 'error' && (
                  <div className="alert alert-error">{resendError}</div>
                )}
                <button className="btn btn-primary" type="submit" disabled={resendStatus === 'loading'}>
                  {resendStatus === 'loading' ? 'Sending...' : 'Resend Verification Email'}
                </button>
              </form>
            )}

            {!isExpired && (
              <Link to="/register"><button className="btn btn-ghost">Back to Register</button></Link>
            )}
          </>
        )}
      </div>
    </div>
  );
}
