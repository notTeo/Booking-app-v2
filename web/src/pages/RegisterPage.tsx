import { useState } from 'react';
import { Link } from 'react-router-dom';
import { register, resendVerification } from '../api/auth.api';
import { env } from '../config/env';
import '../styles/pages/register.css';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');

  const [resendStatus, setResendStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {

    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);
    try {
      await register(email, password);
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

  const handleGoogle = () => {
    window.location.href = `${env.apiUrl}/auth/google`;
  };

  return (
    <div className="page">
      <div className="card">
        <Link to="/" className="card-back">← AuthBoilerplate</Link>
        <h1>Register</h1>
        <button className="btn-google" type="button" onClick={handleGoogle}>
          <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
            <path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 6.293C4.672 4.169 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>
        <div className="divider">or</div>
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
                <li className={password.length >= 8 ? 'req-met' : 'req-unmet'}>At least 8 characters</li>
                <li className={/[A-Z]/.test(password) ? 'req-met' : 'req-unmet'}>One uppercase letter</li>
                <li className={/[0-9]/.test(password) ? 'req-met' : 'req-unmet'}>One number</li>
                <li className={/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password) ? 'req-met' : 'req-unmet'}>One special character (!@#$%...)</li>
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
