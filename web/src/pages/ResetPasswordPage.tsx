import { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { resetPassword } from '../api/auth.api';
import PasswordRequirement from '../components/PasswordRequirement';
import { apiErrorMessage } from '../utils/apiError';
import Wordmark from '../components/Wordmark';
import Alert from '../components/Alert';
import PasswordInput from '../components/PasswordInput';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setError('');

    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    const token = searchParams.get('token');
    if (!token) {
      setError('Invalid reset link.');
      return;
    }

    setIsLoading(true);
    try {
      await resetPassword(token, password);
      navigate('/login');
    } catch (err: unknown) {
      setError(apiErrorMessage(err, 'Reset failed.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="page page--center">
      <div className="card card--auth">
        <Link to="/" className="back-link">← <span className="wordmark wordmark--inline wordmark--muted"><Wordmark /></span></Link>
        <h1 className="t-heading">Reset Password</h1>
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label className="field__label" htmlFor="password">New Password</label>
            <PasswordInput
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {password.length > 0 && (
              <ul className="password-requirements">
                <PasswordRequirement met={password.length >= 8} label="At least 8 characters" />
                <PasswordRequirement met={/[A-Z]/.test(password)} label="One uppercase letter" />
                <PasswordRequirement met={/[0-9]/.test(password)} label="One number" />
                <PasswordRequirement met={/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)} label="One special character (!@#$%...)" />
              </ul>
            )}
          </div>
          <div className="field">
            <label className="field__label" htmlFor="confirm">Confirm Password</label>
            <PasswordInput
              id="confirm"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </div>
          {error && <Alert variant="danger">{error}</Alert>}
          <button className={`btn btn--block${isLoading ? ' is-loading' : ''}`} type="submit" aria-busy={isLoading}>
            Reset Password
          </button>
        </form>
        <div className="form-links">
          <span><Link to="/login">Back to Login</Link></span>
        </div>
      </div>
    </div>
  );
}
