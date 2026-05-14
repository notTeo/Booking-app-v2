import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { register, resendVerification } from '../api/auth.api';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LanguageContext';
import { authStore } from '../store/authStore';
import '../styles/pages/register.css';

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
      const data = await register(name, email, password, inviteToken || undefined);

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
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Registration failed');
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
        <Link to="/" className="card-back">← BOOKLY</Link>
        <h1>Register</h1>

        {inviteToken && (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '1rem' }}>
            {t.register.inviteNotice}
          </p>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">{t.register.nameLabel}</label>
            <input
              id="name"
              type="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              readOnly={!!inviteToken && !!emailFromInvite}
              style={inviteToken && emailFromInvite ? { opacity: 0.7, cursor: 'not-allowed' } : undefined}
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {password.length > 0 && (
              <ul className="password-requirements">
                <li className={password.length >= 8 ? 'req-met' : 'req-unmet'}>{t.register.pwMin}</li>
                <li className={/[A-Z]/.test(password) ? 'req-met' : 'req-unmet'}>{t.register.pwUpper}</li>
                <li className={/[0-9]/.test(password) ? 'req-met' : 'req-unmet'}>{t.register.pwNumber}</li>
                <li className={/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password) ? 'req-met' : 'req-unmet'}>{t.register.pwSpecial}</li>
              </ul>
            )}
          </div>
          {error && <div className="alert alert-error">{error}</div>}
          {success && (
            <>
              <div className="alert alert-success">
                {success} Check your spam folder if you don't see it.
              </div>
              {resendStatus === 'sent' && (
                <div className="alert alert-success">Email resent successfully.</div>
              )}
              {resendStatus === 'error' && (
                <div className="alert alert-error">Failed to resend. Please try again.</div>
              )}
              <button
                className="btn btn-ghost"
                type="button"
                onClick={handleResend}
                disabled={resendStatus === 'loading'}
              >
                {resendStatus === 'loading' ? 'Sending...' : 'Resend Email'}
              </button>
            </>
          )}
          {!success && (
            <button className="btn btn-primary" type="submit" disabled={isLoading}>
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
