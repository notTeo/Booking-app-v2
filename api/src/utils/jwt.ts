import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import crypto from 'crypto';

export const signAccessToken = (userId: string): string => {
  const options: SignOptions = {
    expiresIn: env.jwt.accessExpiresInSeconds,
  };
  return jwt.sign({ userId }, env.jwt.accessSecret, options);
};

export const verifyAccessToken = (token: string): { userId: string } => {
  return jwt.verify(token, env.jwt.accessSecret) as { userId: string };
};

export const signRefreshToken = (userId: string): string => {
  const options: SignOptions = {
    expiresIn: env.jwt.refreshExpiresInSeconds,
    jwtid: crypto.randomUUID(),
  };
  return jwt.sign({ userId }, env.jwt.refreshSecret, options);
};

export const verifyRefreshToken = (token: string): { userId: string } => {
  return jwt.verify(token, env.jwt.refreshSecret) as { userId: string };
};

export const getRefreshTokenExpiry = (): Date => {
  return new Date(Date.now() + env.jwt.refreshExpiresInSeconds * 1000);
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
