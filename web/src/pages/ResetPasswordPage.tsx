import { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { resetPassword } from '../api/auth.api';
import '../styles/pages/reset-password.css';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Reset failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="card">
        <Link to="/" className="card-back">← AuthBoilerplate</Link>
        <h1>Reset Password</h1>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="password">New Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {password.length > 0 && (
              <ul className="password-requirements">
                <li className={password.length >= 8 ? 'req-met' : 'req-unmet'}>At least 8 characters</li>
                <li className={/[A-Z]/.test(password) ? 'req-met' : 'req-unmet'}>One uppercase letter</li>
                <li className={/[0-9]/.test(password) ? 'req-met' : 'req-unmet'}>One number</li>
                <li className={/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password) ? 'req-met' : 'req-unmet'}>One special character (!@#$%...)</li>
              </ul>
            )}
          </div>
          <div className="form-group">
            <label htmlFor="confirm">Confirm Password</label>
            <input
              id="confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </div>
          {error && <div className="alert alert-error">{error}</div>}
          <button className="btn btn-primary" type="submit" disabled={isLoading}>
            {isLoading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>
        <div className="form-links">
          <span><Link to="/login">Back to Login</Link></span>
        </div>
      </div>
    </div>
  );
}
