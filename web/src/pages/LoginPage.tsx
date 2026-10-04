import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/pages/login.css';
import { apiErrorMessage } from '../utils/apiError';
import Wordmark from '../components/Wordmark';
import Alert from '../components/Alert';

export default function LoginPage() {
  const { login } = useAuth();

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
      setError(apiErrorMessage(err, 'Login failed'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="card card--auth">
        <Link to="/" className="card-back">← <span className="brand-wordmark brand-wordmark--muted"><Wordmark /></span></Link>
        <h1 className="t-heading">Login</h1>
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
          <div className="field">
            <label className="field__label" htmlFor="password">Password</label>
            <input className="input"
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <label className="checkbox remember-me">
            <input
              id="rememberMe"
              className="checkbox__input"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            <span className="checkbox__box" />
            Remember me
          </label>
          {error && <Alert variant="danger">{error}</Alert>}
          <button className={`btn btn--block${isLoading ? ' is-loading' : ''}`} type="submit" aria-busy={isLoading}>
            Login
          </button>
        </form>
        <div className="form-links">
          <span><Link to="/forgot-password">Forgot password?</Link></span>
          <span>Don't have an account? <Link to="/register">Register</Link></span>
        </div>
      </div>
    </div>
  );
}
