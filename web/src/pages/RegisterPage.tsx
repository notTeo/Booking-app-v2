import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { register, resendVerification } from '../api/auth.api';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LanguageContext';
import { authStore } from '../store/authStore';
import PasswordRequirement from '../components/PasswordRequirement';
import { apiErrorMessage } from '../utils/apiError';
import AuthTop from '../components/AuthTop';
import Alert from '../components/Alert';
import PasswordInput from '../components/PasswordInput';
import { rememberPlan } from '../utils/onboarding';

export default function RegisterPage() {
  const { setUser } = useAuth();
  const { t } = useLang();
  const [params] = useSearchParams();
  // A plan clicked on the marketing site waits here for the new-shop flow.
  const planFromLink = params.get('plan');
  useEffect(() => rememberPlan(planFromLink), [planFromLink]);

  const inviteToken = params.get('inviteToken') ?? '';
  const emailFromInvite = params.get('email') ?? '';

  const [email, setEmail] = useState(emailFromInvite);
  const [name, setName] = useState('')
  const [password, setPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');

  const [resendStatus, setResendStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle');

  useEffect(() => {
    if (emailFromInvite) setEmail(emailFromInvite);
  }, [emailFromInvite]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setError('');
    setSuccess('');
    setIsLoading(true);
    try {
      const data = await register(name, email, password, acceptTerms, inviteToken || undefined);

      // Invite path: response contains accessToken + user — auto-login; PublicRoute
      // then picks the landing page (the invited shop, for a new user).
      if (data.data?.accessToken) {
        authStore.setToken(data.data.accessToken);
        setUser(data.data.user);
        return;
      }

      // Normal path: verification email sent
      setRegisteredEmail(email);
      setSuccess(t.register.verificationSent);
    } catch (err: unknown) {
      setError(apiErrorMessage(err, t.register.error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendStatus === 'loading') return;
    setResendStatus('loading');
    try {
      await resendVerification(registeredEmail);
      setResendStatus('sent');
      setTimeout(() => setResendStatus('idle'), 4000);
    } catch {
      setResendStatus('error');
      setTimeout(() => setResendStatus('idle'), 4000);
    }
  };

  return (
    <div className="page page--center">
      <div className="card card--auth">
        <AuthTop />
        <h1 className="t-heading">{t.register.title}</h1>

        {inviteToken && (
          <p className="card__text">
            {t.register.inviteNotice}
          </p>
        )}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label className="field__label" htmlFor="name">{t.register.nameLabel}</label>
            <input className="input"
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label className="field__label" htmlFor="email">{t.register.emailLabel}</label>
            <input className={`input${inviteToken && emailFromInvite ? ' is-disabled' : ''}`}
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              readOnly={!!inviteToken && !!emailFromInvite}
            />
          </div>
          <div className="field">
            <label className="field__label" htmlFor="password">{t.register.passwordLabel}</label>
            <PasswordInput
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {password.length > 0 && (
              <ul className="password-requirements">
                <PasswordRequirement met={password.length >= 8} label={t.register.pwMin} />
                <PasswordRequirement met={/[A-Z]/.test(password)} label={t.register.pwUpper} />
                <PasswordRequirement met={/[0-9]/.test(password)} label={t.register.pwNumber} />
                <PasswordRequirement met={/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)} label={t.register.pwSpecial} />
              </ul>
            )}
          </div>
          <div className="field">
            <label className="checkbox">
              <input
                id="acceptTerms"
                className="checkbox__input"
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                required
              />
              <span className="checkbox__box" />
              <span>
                {t.register.acceptPrefix}{' '}
                <Link to="/terms" target="_blank">{t.terms.linkLabel}</Link>{' '}
                {t.register.acceptAnd}{' '}
                <Link to="/privacy" target="_blank">{t.privacy.linkLabel}</Link>.
              </span>
            </label>
          </div>
          {error && <Alert variant="danger">{error}</Alert>}
          {success && (
            <>
              <Alert variant="success">
                {success} {t.register.checkSpam}
              </Alert>
              {resendStatus === 'sent' && (
                <Alert variant="success">{t.register.resentOk}</Alert>
              )}
              {resendStatus === 'error' && (
                <Alert variant="danger">{t.register.resentError}</Alert>
              )}
              <button
                className={`btn btn--secondary btn--block${resendStatus === 'loading' ? ' is-loading' : ''}`}
                type="button"
                onClick={handleResend}
                aria-busy={resendStatus === 'loading'}
              >
                {t.register.resend}
              </button>
            </>
          )}
          {!success && (
            <button className={`btn btn--block${isLoading ? ' is-loading' : ''}`} type="submit" aria-busy={isLoading} disabled={!acceptTerms}>
              {t.register.submit}
            </button>
          )}
        </form>
        <div className="form-links">
          <span>{t.register.alreadyAccount} <Link to="/login">{t.register.loginLink}</Link></span>
        </div>
      </div>
    </div>
  );
}
