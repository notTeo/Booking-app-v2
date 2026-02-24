import client, { refreshClient } from './client';

export const register = (email: string, password: string) =>
  client.post('/auth/register', { email, password }).then((res) => res.data);

export const login = (email: string, password: string) =>
  client.post('/auth/login', { email, password }).then((res) => res.data);

export const logout = () =>
  client.post('/auth/logout').then((res) => res.data);

export const forgotPassword = (email: string) =>
  client.post('/auth/forgot-password', { email }).then((res) => res.data);

export const resetPassword = (token: string, password: string) =>
  client.post('/auth/reset-password', { token, password }).then((res) => res.data);

export const verifyEmail = (token: string) =>
  client.get(`/auth/verify-email?token=${token}`).then((res) => res.data);

export const verifyEmailChange = (token: string) =>
  client.get(`/auth/verify-email-change?token=${token}`).then((res) => res.data);

export const resendVerification = (email: string) =>
  client.post('/auth/resend-verification', { email }).then((res) => res.data);

let refreshPromise: Promise<any> | null = null;

export const refreshTokens = () => {
  if (!refreshPromise) {
    refreshPromise = refreshClient
      .post('/auth/refresh')
      .then((res) => res.data)
      .finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
};
