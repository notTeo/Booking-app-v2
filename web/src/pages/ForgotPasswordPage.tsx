import { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword } from '../api/auth.api';
import '../styles/pages/forgot-password.css';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);
    try {
      await forgotPassword(email);
      setSuccess('If this email exists you will receive a reset link shortly.');
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Something went wrong.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="card">
        <Link to="/" className="card-back">← AuthBoilerplate</Link>
        <h1>Forgot Password</h1>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}
          <button className="btn btn-primary" type="submit" disabled={isLoading}>
            {isLoading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>
        <div className="form-links">
          <span><Link to="/login">Back to Login</Link></span>
        </div>
      </div>
    </div>
  );
}
