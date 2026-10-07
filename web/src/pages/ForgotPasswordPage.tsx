import { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword } from '../api/auth.api';
import { useLang } from '../context/LanguageContext';
import { apiErrorMessage } from '../utils/apiError';
import AuthTop from '../components/AuthTop';
import Alert from '../components/Alert';

export default function ForgotPasswordPage() {
  const { t } = useLang();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setError('');
    setSuccess('');
    setIsLoading(true);
    try {
      await forgotPassword(email);
      setSuccess(t.forgotPassword.success);
    } catch (err: unknown) {
      setError(apiErrorMessage(err, t.forgotPassword.error));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="page page--center">
      <div className="card card--auth">
        <AuthTop />
        <h1 className="t-heading">{t.forgotPassword.title}</h1>
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label className="field__label" htmlFor="email">{t.forgotPassword.emailLabel}</label>
            <input className="input"
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          {error && <Alert variant="danger">{error}</Alert>}
          {success && <Alert variant="success">{success}</Alert>}
          <button className={`btn btn--block${isLoading ? ' is-loading' : ''}`} type="submit" aria-busy={isLoading}>
            {t.forgotPassword.submit}
          </button>
        </form>
        <div className="form-links">
          <span><Link to="/login">{t.forgotPassword.backToLogin}</Link></span>
        </div>
      </div>
    </div>
  );
}
