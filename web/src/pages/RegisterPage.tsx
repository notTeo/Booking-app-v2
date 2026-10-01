import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { register, resendVerification } from '../api/auth.api';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LanguageContext';
import { authStore } from '../store/authStore';
import PasswordRequirement from '../components/PasswordRequirement';
import '../styles/pages/register.css';
import { apiErrorMessage } from '../utils/apiError';
import Wordmark from '../components/Wordmark';
import Alert from '../components/Alert';

export default function RegisterPage() {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const { t } = useLang();
  const [params] = useSearchParams();

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
    setError('');
    setSuccess('');
    setIsLoading(true);
    try {
      const data = await register(name, email, password, acceptTerms, inviteToken || undefined);

      // Invite path: response contains accessToken + user — auto-login and redirect
      if (data.data?.accessToken) {
        authStore.setToken(data.data.accessToken);
        setUser(data.data.user);
        navigate(`/shops/${data.data.shopSlug}`);
        return;
      }

      // Normal path: verification email sent
      setRegisteredEmail(email);
      setSuccess('Verification email sent. Please check your inbox.');
    } catch (err: unknown) {
      setError(apiErrorMessage(err, 'Registration failed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
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
    <div className="page">
      <div className="card">
        <Link to="/" className="card-back">← <span className="brand-wordmark brand-wordmark--muted"><Wordmark /></span></Link>
        <h1>Register</h1>

        {inviteToken && (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '1rem' }}>
            {t.register.inviteNotice}
          </p>
        )}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label className="field__label" htmlFor="name">{t.register.nameLabel}</label>
            <input className="input"
              id="name"
              type="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label className="field__label" htmlFor="email">Email</label>
            <input className="input"
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              readOnly={!!inviteToken && !!emailFromInvite}
              style={inviteToken && emailFromInvite ? { opacity: 0.7, cursor: 'not-allowed' } : undefined}
            />
          </div>
          <div className="field">
            <label className="field__label" htmlFor="password">Password</label>
            <input className="input"
              id="password"
              type="password"
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
                {success} Check your spam folder if you don't see it.
              </Alert>
              {resendStatus === 'sent' && (
                <Alert variant="success">Email resent successfully.</Alert>
              )}
              {resendStatus === 'error' && (
                <Alert variant="danger">Failed to resend. Please try again.</Alert>
              )}
              <button
                className="btn btn--secondary btn--block"
                type="button"
                onClick={handleResend}
                disabled={resendStatus === 'loading'}
              >
                {resendStatus === 'loading' ? 'Sending...' : 'Resend Email'}
              </button>
            </>
          )}
          {!success && (
            <button className="btn btn--block" type="submit" disabled={isLoading || !acceptTerms}>
              {isLoading ? 'Registering...' : 'Register'}
            </button>
          )}
        </form>
        <div className="form-links">
          <span>Already have an account? <Link to="/login">Login</Link></span>
        </div>
      </div>
    </div>
  );
}
