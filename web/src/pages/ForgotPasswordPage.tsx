import { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword } from '../api/auth.api';
import { apiErrorMessage } from '../utils/apiError';
import Wordmark from '../components/Wordmark';
import Alert from '../components/Alert';

export default function ForgotPasswordPage() {
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
      setSuccess('If this email exists you will receive a reset link shortly.');
    } catch (err: unknown) {
      setError(apiErrorMessage(err, 'Something went wrong.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="page page--center">
      <div className="card card--auth">
        <Link to="/" className="back-link">← <span className="wordmark wordmark--inline wordmark--muted"><Wordmark /></span></Link>
        <h1 className="t-heading">Forgot Password</h1>
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label className="field__label" htmlFor="email">Email</label>
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
            Send Reset Link
          </button>
        </form>
        <div className="form-links">
          <span><Link to="/login">Back to Login</Link></span>
        </div>
      </div>
    </div>
  );
}
