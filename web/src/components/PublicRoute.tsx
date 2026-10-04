import { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { resolveLanding } from '../utils/landing';

// Logged in on an auth page (just logged in or registered, or opened /login
// with a live session): work out where to go, then leave. This is the only
// place the post-login landing is decided.
function LandingRedirect() {
  const navigate = useNavigate();
  const { search } = useLocation();
  const queryClient = useQueryClient();

  useEffect(() => {
    let cancelled = false;
    resolveLanding(search, queryClient).then((to) => {
      if (!cancelled) navigate(to, { replace: true });
    });
    return () => { cancelled = true; };
  }, [search, navigate, queryClient]);

  return (
    <div className="spinner-page">
      <div className="spinner spinner--lg" />
    </div>
  );
}

export default function PublicRoute() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return null;
  if (isAuthenticated) return <LandingRedirect />;

  return <Outlet />;
}
