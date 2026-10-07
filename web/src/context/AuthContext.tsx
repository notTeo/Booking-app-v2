import { createContext, useContext, useEffect, useState } from 'react';
import type { PhotoFields } from '../api/photo.api';
import { useQueryClient } from '@tanstack/react-query';
import { login as loginApi, logout as logoutApi, refreshTokens } from '../api/auth.api';
import { getMe } from '../api/user.api';
import { authStore } from '../store/authStore';

interface User extends PhotoFields {
  id: string;
  name: string;
  email: string;
  isVerified: boolean;
  /** Their first shop gets the free trial; false once they have created one. */
  trialAvailable: boolean;
  createdAt: string;
  hasPassword: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string, rememberMe: boolean) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

// The shop settings preview embeds the public page in an iframe. It needs no
// session, and a page-load refresh there rotates the cookie behind the parent
// page: leaving the settings mid-refresh lost the new cookie and logged the
// owner out.
const isEmbedded = window.self !== window.top;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(!isEmbedded);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (isEmbedded) return;
    let cancelled = false;

    refreshTokens()
      .then((data) => {
        if (cancelled) return;
        authStore.setToken(data.data.accessToken);
        return getMe();
      })
      .then((data) => {
        if (cancelled || !data) return;
        setUser(data.user);
      })
      .catch(() => { if (!cancelled) setUser(null); })
      .finally(() => { if (!cancelled) setIsLoading(false); });

    return () => { cancelled = true; };
  }, []);

  const login = async (email: string, password: string, rememberMe: boolean) => {
    const data = await loginApi(email, password, rememberMe);
    authStore.setToken(data.data.accessToken);
    setUser(data.data.user);
  };

  const logout = async () => {
    // Signing out locally must not depend on the request succeeding: a
    // network error or a rejected cookie would otherwise keep the user in.
    try {
      await logoutApi();
    } catch {
      // Nothing to do: the session is dropped locally either way.
    }
    authStore.clearToken();
    // Cached shops, invites and bookings belong to this user: the next person
    // to log in on this tab must not see them, even for a moment.
    queryClient.clear();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
