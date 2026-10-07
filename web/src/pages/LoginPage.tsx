import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LanguageContext';
import { apiErrorMessage } from '../utils/apiError';
import AuthTop from '../components/AuthTop';
import Alert from '../components/Alert';
import PasswordInput from '../components/PasswordInput';

export default function LoginPage() {
  const { login } = useAuth();
  const { t } = useLang();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setError('');
    setIsLoading(true);
    try {
      // PublicRoute sees the new session and picks the landing page.
      await login(email, password, rememberMe);
    } catch (err: unknown) {
      setError(apiErrorMessage(err, t.login.error));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="page page--center">
      <div className="card card--auth">
        <AuthTop />
        <h1 className="t-heading">{t.login.title}</h1>
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label className="field__label" htmlFor="email">{t.login.emailLabel}</label>
            <input className="input"
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label className="field__label" htmlFor="password">{t.login.passwordLabel}</label>
            <PasswordInput
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label className="checkbox">
              <input
                id="rememberMe"
                className="checkbox__input"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <span className="checkbox__box" />
              {t.login.rememberMe}
            </label>
          </div>
          {error && <Alert variant="danger">{error}</Alert>}
          <button className={`btn btn--block${isLoading ? ' is-loading' : ''}`} type="submit" aria-busy={isLoading}>
            {t.login.submit}
          </button>
        </form>
        <div className="form-links">
          <span><Link to="/forgot-password">{t.login.forgotPassword}</Link></span>
          <span>{t.login.noAccount} <Link to="/register">{t.login.registerLink}</Link></span>
        </div>
      </div>
    </div>
  );
}
