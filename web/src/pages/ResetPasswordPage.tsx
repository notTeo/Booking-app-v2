import { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { resetPassword } from '../api/auth.api';
import { useLang } from '../context/LanguageContext';
import PasswordRequirement from '../components/PasswordRequirement';
import { apiErrorMessage } from '../utils/apiError';
import AuthTop from '../components/AuthTop';
import Alert from '../components/Alert';
import PasswordInput from '../components/PasswordInput';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useLang();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setError('');

    if (password !== confirm) {
      setError(t.resetPassword.mismatch);
      return;
    }

    const token = searchParams.get('token');
    if (!token) {
      setError(t.resetPassword.invalidLink);
      return;
    }

    setIsLoading(true);
    try {
      await resetPassword(token, password);
      navigate('/login');
    } catch (err: unknown) {
      setError(apiErrorMessage(err, t.resetPassword.error));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="page page--center">
      <div className="card card--auth">
        <AuthTop />
        <h1 className="t-heading">{t.resetPassword.title}</h1>
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label className="field__label" htmlFor="password">{t.resetPassword.newPasswordLabel}</label>
            <PasswordInput
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {password.length > 0 && (
              <ul className="password-requirements">
                <PasswordRequirement met={password.length >= 8} label={t.resetPassword.pwMin} />
                <PasswordRequirement met={/[A-Z]/.test(password)} label={t.resetPassword.pwUpper} />
                <PasswordRequirement met={/[0-9]/.test(password)} label={t.resetPassword.pwNumber} />
                <PasswordRequirement met={/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)} label={t.resetPassword.pwSpecial} />
              </ul>
            )}
          </div>
          <div className="field">
            <label className="field__label" htmlFor="confirm">{t.resetPassword.confirmLabel}</label>
            <PasswordInput
              id="confirm"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </div>
          {error && <Alert variant="danger">{error}</Alert>}
          <button className={`btn btn--block${isLoading ? ' is-loading' : ''}`} type="submit" aria-busy={isLoading}>
            {t.resetPassword.submit}
          </button>
        </form>
        <div className="form-links">
          <span><Link to="/login">{t.resetPassword.backToLogin}</Link></span>
        </div>
      </div>
    </div>
  );
}
