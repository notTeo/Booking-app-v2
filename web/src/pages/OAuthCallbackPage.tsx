import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { authStore } from '../store/authStore';
import '../styles/pages/oauth-callback.css';
import { getMe } from '../api/user.api';
import { useAuth } from '../context/AuthContext';

export default function OAuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setUser } = useAuth();

  useEffect(() => {
    const accessToken = searchParams.get('accessToken');

    if (!accessToken) {
      navigate('/login?error=oauth_failed', { replace: true });
      return;
    }

    authStore.setToken(accessToken);

    getMe()
      .then((data) => {
        setUser(data.user);
        navigate('/dashboard', { replace: true });
      })
      .catch(() => {
        authStore.clearToken();
        navigate('/login?error=oauth_failed', { replace: true });
      });
  }, []);

  return (
    <div className="page">
      <p className="oauth-status">Signing you in...</p>
    </div>
  );
}
