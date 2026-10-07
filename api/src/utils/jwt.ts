import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import crypto from 'crypto';

// What a token is for travels in the token, not only in which secret signed
// it, and only the algorithm we sign with is accepted.
const ACCESS = 'access';
const REFRESH = 'refresh';
const VERIFY = { algorithms: ['HS256' as const] };
type Claims = { userId: string; typ?: string };

export const signAccessToken = (userId: string): string => {
  const options: SignOptions = {
    expiresIn: env.jwt.accessExpiresInSeconds,
  };
  return jwt.sign({ userId, typ: ACCESS }, env.jwt.accessSecret, options);
};

export const verifyAccessToken = (token: string): { userId: string } => {
  const payload = jwt.verify(token, env.jwt.accessSecret, VERIFY) as Claims;
  if (payload.typ !== ACCESS) throw new Error('Not an access token');
  return payload;
};

export const signRefreshToken = (userId: string): string => {
  const options: SignOptions = {
    expiresIn: env.jwt.refreshExpiresInSeconds,
    jwtid: crypto.randomUUID(),
  };
  return jwt.sign({ userId, typ: REFRESH }, env.jwt.refreshSecret, options);
};

export const verifyRefreshToken = (token: string): { userId: string } => {
  const payload = jwt.verify(token, env.jwt.refreshSecret, VERIFY) as Claims;
  // Refresh tokens issued before 2026-10 carry no typ and live up to 30 days;
  // from 2026-12 on, require typ === REFRESH here.
  if (payload.typ !== undefined && payload.typ !== REFRESH)
    throw new Error('Not a refresh token');
  return payload;
};

// Without "remember me" the cookie is session-only; the DB row still expires after a day
const SESSION_REFRESH_SECONDS = 24 * 60 * 60;

export const getRefreshTokenExpiry = (rememberMe = true): Date => {
  const seconds = rememberMe
    ? env.jwt.refreshExpiresInSeconds
    : Math.min(SESSION_REFRESH_SECONDS, env.jwt.refreshExpiresInSeconds);
  return new Date(Date.now() + seconds * 1000);
};

export const generateRandomToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

export const hashToken = (token: string): string =>
  crypto.createHash('sha256').update(token).digest('hex');

export const getEmailTokenExpiry = (): Date => {
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + 24);
  return expiry;
};

export const getPasswordResetTokenExpiry = (): Date => {
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + 1);
  return expiry;
};

export const getInviteTokenExpiry = (): Date => {
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + 7);
  return expiry;
};
