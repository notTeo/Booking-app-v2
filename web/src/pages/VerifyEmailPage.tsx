import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { verifyEmail, resendVerification } from '../api/auth.api';
import { apiErrorField, apiErrorMessage } from '../utils/apiError';
import Alert from '../components/Alert';
import PasswordInput from '../components/PasswordInput';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  // 'form' asks for the sign-up password; the link alone verifies nothing.
  const [status, setStatus] = useState<'form' | 'loading' | 'success' | 'error'>(
    token ? 'form' : 'error',
  );
  const [message, setMessage] = useState(token ? '' : 'Invalid verification link.');
  const [isExpired, setIsExpired] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const [resendEmail, setResendEmail] = useState('');
  const [resendStatus, setResendStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle');
  const [resendError, setResendError] = useState('');

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || status === 'loading') return;
    setPasswordError('');
    setStatus('loading');
    try {
      await verifyEmail(token, password);
      setStatus('success');
      setMessage('Email verified successfully. You can now log in.');
    } catch (err: unknown) {
      // A wrong password leaves the link usable: stay on the form.
      if (apiErrorField(err, 'code') === 'INVALID_PASSWORD') {
        setPasswordError('That is not the password you signed up with.');
        setStatus('form');
        return;
      }
      const msg = apiErrorMessage(err, 'Verification failed.');
      setStatus('error');
      setMessage(msg);
      if (msg.toLowerCase().includes('expired')) setIsExpired(true);
    }
  };

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
    <div className="page page--center">
      <div className="card card--auth">
        <h1 className="t-heading">Email Verification</h1>

        {(status === 'form' || status === 'loading') && (
          <form onSubmit={handleVerify}>
            <p className="card__text">
              Enter the password you chose when you signed up to finish creating your account.
            </p>
            <div className="field">
              <label className="field__label" htmlFor="verify-password">Password</label>
              <PasswordInput
                id="verify-password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {passwordError && <Alert variant="danger">{passwordError}</Alert>}
            <button
              className={`btn btn--block${status === 'loading' ? ' is-loading' : ''}`}
              type="submit"
              aria-busy={status === 'loading'}
              disabled={!password}
            >
              Verify email
            </button>
          </form>
        )}

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
              <form onSubmit={handleResend}>
                <div className="field">
                  <label className="field__label" htmlFor="verify-resend-email">Enter your email to get a new link:</label>
                  <input className="input"
                    id="verify-resend-email"
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
