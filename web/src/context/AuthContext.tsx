import { createContext, useContext, useEffect, useState } from 'react';
import { login as loginApi, logout as logoutApi, refreshTokens } from '../api/auth.api';
import { getMe } from '../api/user.api';
import { authStore } from '../store/authStore';

interface User {
  id: string;
  email: string;
  isVerified: boolean;
  createdAt: string;
  plan: 'free' | 'pro';
  hasPassword: boolean;
  subscription?: {
    status: string;
    stripePriceId: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
  } | null;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
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

  const login = async (email: string, password: string) => {
    const data = await loginApi(email, password);
    authStore.setToken(data.data.accessToken);
    setUser(data.data.user);
  };

  const logout = async () => {
    await logoutApi();
    authStore.clearToken();
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
