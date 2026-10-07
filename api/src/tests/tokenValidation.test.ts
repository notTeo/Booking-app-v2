import { describe, it, expect, vi } from 'vitest';
import app from '../app';
import { serve } from './testRequest';
import { prisma } from '../utils/prisma';
import { hashToken } from '../utils/jwt';
import bcrypt from 'bcrypt';

const api = await serve(app);

vi.mock('../services/email.service', () => ({
  sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
  sendEmailChangeVerification: vi.fn().mockResolvedValue(undefined),
  sendBookingConfirmationEmail: vi.fn().mockResolvedValue(undefined),
  sendNewBookingNotificationEmail: vi.fn().mockResolvedValue(undefined),
  sendCancellationConfirmationEmail: vi.fn().mockResolvedValue(undefined),
}));

// A query-string or body "token" reaches a Prisma findUnique keyed on that
// field further down the stack. Before group 7, a malformed shape (an array,
// from a repeated query key) passed the existing notEmpty() check — arrays
// have a .length too — and only failed once it hit Prisma, as an unhandled
// error with no .status, landing on the generic 500 branch instead of a
// clean 400. isString() catches it before any of that runs.
describe('token validation (group 7): a malformed token is a 400, not a 500', () => {
  it('POST /auth/verify-email: missing token', async () => {
    const res = await api.post('/auth/verify-email').send({ password: 'x' });
    expect(res.status).toBe(400);
  });

  it('POST /auth/verify-email: array-shaped token', async () => {
    const res = await api
      .post('/auth/verify-email')
      .send({ token: ['a', 'b'], password: 'x' });
    expect(res.status).toBe(400);
  });

  it('GET /auth/verify-email-change: array-shaped token', async () => {
    const res = await api.get('/auth/verify-email-change?token=a&token=b');
    expect(res.status).toBe(400);
  });

  it('POST /auth/reset-password: array-shaped token in the body', async () => {
    const res = await api
      .post('/auth/reset-password')
      .send({ token: ['a', 'b'], password: 'Sup3r!Secret' });
    expect(res.status).toBe(400);
  });

  it('POST /public/cancel: array-shaped token in the body', async () => {
    const res = await api.post('/public/cancel').send({ token: ['a', 'b'] });
    expect(res.status).toBe(400);
  });

  it('a genuine string token still works end to end (no regression)', async () => {
    await prisma.pendingRegistration.create({
      data: {
        name: 'Real User',
        email: 'real-token-user@example.com',
        passwordHash: await bcrypt.hash('Real-Pass-1!', 4),
        token: hashToken('a-real-token'), // stored hashed
        expiresAt: new Date(Date.now() + 60_000),
      },
    });
    const res = await api
      .post('/auth/verify-email')
      .send({ token: 'a-real-token', password: 'Real-Pass-1!' });
    expect(res.status).toBe(200);
  });
});
