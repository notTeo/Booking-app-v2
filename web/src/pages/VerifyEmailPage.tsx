import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { verifyEmail, resendVerification } from '../api/auth.api';
import { apiErrorField, apiErrorMessage } from '../utils/apiError';
import { useLang } from '../context/LanguageContext';
import Alert from '../components/Alert';
import AuthTop from '../components/AuthTop';
import PasswordInput from '../components/PasswordInput';

export default function VerifyEmailPage() {
  const { t } = useLang();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  // Set once verified (the token is then spent): a reload keeps the success.
  const done = searchParams.has('done');
  // 'form' asks for the sign-up password; the link alone verifies nothing.
  const [status, setStatus] = useState<'form' | 'loading' | 'success' | 'error'>(
    done ? 'success' : token ? 'form' : 'error',
  );
  const [message, setMessage] = useState(
    done ? t.verifyEmail.success : token ? '' : t.verifyEmail.invalidLink,
  );
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
      setMessage(t.verifyEmail.success);
      navigate('/verify-email?done=1', { replace: true });
    } catch (err: unknown) {
      // A wrong password leaves the link usable: stay on the form.
      if (apiErrorField(err, 'code') === 'INVALID_PASSWORD') {
        setPasswordError(t.verifyEmail.wrongPassword);
        setStatus('form');
        return;
      }
      const msg = apiErrorMessage(err, t.verifyEmail.error);
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
      setResendError(t.verifyEmail.resendError);
      setTimeout(() => setResendStatus('idle'), 4000);
    }
  };

  return (
    <div className="page page--center">
      <div className="card card--auth">
        <AuthTop back={false} />
        <h1 className="t-heading">{t.verifyEmail.title}</h1>

        {(status === 'form' || status === 'loading') && (
          <form onSubmit={handleVerify}>
            <p className="card__text">
              {t.verifyEmail.passwordIntro}
            </p>
            <div className="field">
              <label className="field__label" htmlFor="verify-password">{t.verifyEmail.passwordLabel}</label>
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
              {t.verifyEmail.submit}
            </button>
          </form>
        )}

        {status === 'success' && (
          <>
            <Alert variant="success">{message}</Alert>
            <Link to="/login"><button className="btn btn--block">{t.verifyEmail.goToLogin}</button></Link>
          </>
        )}

        {status === 'error' && (
          <>
            <Alert variant="danger">{message}</Alert>

            {isExpired && (
              <form onSubmit={handleResend}>
                <div className="field">
                  <label className="field__label" htmlFor="verify-resend-email">{t.verifyEmail.resendLabel}</label>
                  <input className="input"
                    id="verify-resend-email"
                    type="email"
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                    placeholder={t.verifyEmail.resendPlaceholder}
                    required
                  />
                </div>
                {resendStatus === 'sent' && (
                  <Alert variant="success">
                    {t.verifyEmail.resentOk}
                  </Alert>
                )}
                {resendStatus === 'error' && (
                  <Alert variant="danger">{resendError}</Alert>
                )}
                <button className={`btn btn--block${resendStatus === 'loading' ? ' is-loading' : ''}`} type="submit" aria-busy={resendStatus === 'loading'}>
                  {t.verifyEmail.resendSubmit}
                </button>
              </form>
            )}

            {!isExpired && (
              <Link to="/register"><button className="btn btn--secondary btn--block">{t.verifyEmail.backToRegister}</button></Link>
            )}
          </>
        )}
      </div>
    </div>
  );
}
