import rateLimit from 'express-rate-limit';
import { RequestHandler } from 'express';

// Limiters are off in tests, and can be switched off with RATE_LIMIT_DISABLED=true
// for non-production runs only (the e2e suite drives a real browser through many
// logins and page loads from one IP). Production ALWAYS keeps them on.
const isTest =
  process.env.NODE_ENV === 'test' ||
  (process.env.RATE_LIMIT_DISABLED === 'true' &&
    process.env.NODE_ENV !== 'production');
const passThrough: RequestHandler = (_req, _res, next) => next();

export const authLimiter: RequestHandler = isTest
  ? passThrough
  : rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 10,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        status: 'error',
        message: 'Too many requests, please try again later.',
      },
    });

export const forgotPasswordLimiter: RequestHandler = isTest
  ? passThrough
  : rateLimit({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 5,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        status: 'error',
        message: 'Too many password reset requests, please try again later.',
      },
    });
