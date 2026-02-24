import rateLimit from 'express-rate-limit';
import { RequestHandler } from 'express';

const isTest = process.env.NODE_ENV === 'test';
const passThrough: RequestHandler = (_req, _res, next) => next();

export const authLimiter: RequestHandler = isTest
  ? passThrough
  : rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 10,
      standardHeaders: true,
      legacyHeaders: false,
      message: { status: 'error', message: 'Too many requests, please try again later.' },
    });

export const forgotPasswordLimiter: RequestHandler = isTest
  ? passThrough
  : rateLimit({
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 5,
      standardHeaders: true,
      legacyHeaders: false,
      message: { status: 'error', message: 'Too many password reset requests, please try again later.' },
    });
