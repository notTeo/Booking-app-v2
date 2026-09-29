import rateLimit, { type Options } from 'express-rate-limit';
import { Request, RequestHandler } from 'express';

// Limiters are off in tests, and can be switched off with RATE_LIMIT_DISABLED=true
// for non-production runs only (the e2e suite drives a real browser through many
// logins and page loads from one IP). Production ALWAYS keeps them on.
const isTest =
  process.env.NODE_ENV === 'test' ||
  (process.env.RATE_LIMIT_DISABLED === 'true' &&
    process.env.NODE_ENV !== 'production');
const passThrough: RequestHandler = (_req, _res, next) => next();

const limiter = (opts: Partial<Options>): RequestHandler =>
  isTest
    ? passThrough
    : rateLimit({ standardHeaders: true, legacyHeaders: false, ...opts });

export const authLimiter: RequestHandler = limiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: {
    status: 'error',
    message: 'Too many requests, please try again later.',
  },
});

export const forgotPasswordLimiter: RequestHandler = limiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: {
    status: 'error',
    message: 'Too many password reset requests, please try again later.',
  },
});

// /auth/refresh runs on every page load — including anonymous visitors of the
// public booking page — so it must NOT share login's strict budget: a shared
// IP (shop wifi, a mobile carrier's NAT) could exhaust it from ordinary
// browsing alone and lock a staff member out of logging in. Skipped entirely
// with no refresh cookie (nothing to refresh, so nothing to rate-limit
// either), and generous even when one is present — this still guards against
// a runaway refresh loop, just not at login's strictness.
export const refreshLimiter: RequestHandler = limiter({
  windowMs: 15 * 60 * 1000,
  max: 60,
  skip: (req: Request) => !req.cookies?.refreshToken,
  message: {
    status: 'error',
    message: 'Too many requests, please try again later.',
  },
});

// /public/*: no account to throttle by, so IP is all there is. Reads (shop
// info, slots) are generous — the booking wizard refetches slots on every
// date/staff change from one visitor. Writes (book, cancel) are stricter:
// they create data or reveal whether a guessed cancelToken worked.
export const publicReadLimiter: RequestHandler = limiter({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    status: 'error',
    message: 'Too many requests, please try again later.',
  },
});

export const publicWriteLimiter: RequestHandler = limiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    status: 'error',
    message: 'Too many requests, please try again later.',
  },
});
