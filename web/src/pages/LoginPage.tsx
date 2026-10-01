import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/pages/login.css';
import { apiErrorMessage } from '../utils/apiError';
import Wordmark from '../components/Wordmark';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await login(email, password, rememberMe);
      navigate('/dashboard');
    } catch (err: unknown) {
      setError(apiErrorMessage(err, 'Login failed'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="card">
        <Link to="/" className="card-back">← <span className="brand-wordmark brand-wordmark--muted"><Wordmark /></span></Link>
        <h1>Login</h1>
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
          </div>
          <label className="remember-me" htmlFor="rememberMe">
            <input
              id="rememberMe"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            Remember me
          </label>
          {error && <div className="alert alert-error">{error}</div>}
          <button className="btn btn-primary" type="submit" disabled={isLoading}>
            {isLoading ? 'Logging in...' : 'Login'}
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
