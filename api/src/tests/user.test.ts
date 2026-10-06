import { describe, it, expect, vi, beforeEach } from 'vitest';
import app from '../app';
import { serve } from './testRequest';
import { prisma } from '../utils/prisma';

const api = await serve(app);

// Mock email sending so tests don't hit Resend
vi.mock('../services/email.service', () => ({
  sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
  sendEmailChangeVerification: vi.fn().mockResolvedValue(undefined),
}));

const TEST_EMAIL = 'user@example.com';
const TEST_PASSWORD = 'password123';

async function createVerifiedUser(
  email = TEST_EMAIL,
  password = TEST_PASSWORD,
) {
  const bcrypt = await import('bcrypt');
  const passwordHash = await bcrypt.hash(password, 4);
  return prisma.user.create({
    data: { name: 'Test User', email, passwordHash, isVerified: true },
  });
}

async function loginUser(email = TEST_EMAIL, password = TEST_PASSWORD) {
  const res = await api.post('/auth/login').send({ email, password });
  return res.body.data?.accessToken as string;
}

describe('GET /user/me', () => {
  beforeEach(async () => {
    await createVerifiedUser();
  });

  it('returns current user profile', async () => {
    const token = await loginUser();
    const res = await api
      .get('/user/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe(TEST_EMAIL);
    expect(res.body.data.user.isVerified).toBe(true);
    expect(res.body.data.user.passwordHash).toBeUndefined(); // never exposed
  });

  it('returns the same user shape as login', async () => {
    const login = await api
      .post('/auth/login')
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD });
    const me = await api
      .get('/user/me')
      .set('Authorization', `Bearer ${login.body.data.accessToken}`);

    expect(login.body.data.user).toEqual(me.body.data.user);
    expect(Object.keys(me.body.data.user).sort()).toEqual([
      'createdAt',
      'email',
      'hasPassword',
      'id',
      'isVerified',
      'name',
      'trialAvailable',
    ]);
    expect(me.body.data.user.hasPassword).toBe(true);
  });

  it('returns 401 without token', async () => {
    const res = await api.get('/user/me');
    expect(res.status).toBe(401);
  });
});

describe('PATCH /user/me', () => {
  beforeEach(async () => {
    await createVerifiedUser();
  });

  it('sends verification email to new address and does not change email immediately', async () => {
    const token = await loginUser();
    const res = await api
      .patch('/user/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'new@example.com' });

    expect(res.status).toBe(200);
    expect(res.body.data.message).toBeTruthy();
    expect(res.body.data.user).toBeUndefined();

    // Email must not have changed in DB yet
    const user = await prisma.user.findUnique({ where: { email: TEST_EMAIL } });
    expect(user).not.toBeNull();

    // PendingEmailChange record must exist
    const pending = await prisma.pendingEmailChange.findFirst({
      where: { newEmail: 'new@example.com' },
    });
    expect(pending).not.toBeNull();
  });

  it('updates password and revokes all sessions', async () => {
    const token = await loginUser();
    const res = await api
      .patch('/user/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ password: 'Newpassword456!' });

    expect(res.status).toBe(200);

    // All refresh tokens should be gone
    const user = await prisma.user.findUnique({ where: { email: TEST_EMAIL } });
    const sessions = await prisma.refreshToken.findMany({
      where: { userId: user!.id },
    });
    expect(sessions).toHaveLength(0);
  });

  it('returns 409 if new email is already taken', async () => {
    await createVerifiedUser('other@example.com');
    const token = await loginUser();
    const res = await api
      .patch('/user/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'other@example.com' });

    expect(res.status).toBe(409);
  });

  it('returns 400 for invalid email', async () => {
    const token = await loginUser();
    const res = await api
      .patch('/user/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'not-valid' });

    expect(res.status).toBe(400);
  });
});

describe('GET /auth/verify-email-change', () => {
  beforeEach(async () => {
    await createVerifiedUser();
  });

  it('updates email when valid token is provided', async () => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: TEST_EMAIL },
    });
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + 24);

    await prisma.pendingEmailChange.create({
      data: {
        userId: user.id,
        newEmail: 'changed@example.com',
        token: 'valid-token-abc123',
        expiresAt: expiry,
      },
    });

    const res = await api.get(
      '/auth/verify-email-change?token=valid-token-abc123',
    );

    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe('changed@example.com');
    expect(res.body.data.user.isVerified).toBe(true);

    // PendingEmailChange record must be cleaned up
    const pending = await prisma.pendingEmailChange.findUnique({
      where: { token: 'valid-token-abc123' },
    });
    expect(pending).toBeNull();
  });

  it('returns 400 for an expired token', async () => {
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: TEST_EMAIL },
    });
    const expired = new Date();
    expired.setHours(expired.getHours() - 1);

    await prisma.pendingEmailChange.create({
      data: {
        userId: user.id,
        newEmail: 'expired@example.com',
        token: 'expired-token-xyz',
        expiresAt: expired,
      },
    });

    const res = await api.get(
      '/auth/verify-email-change?token=expired-token-xyz',
    );

    expect(res.status).toBe(400);
  });

  it('returns 400 for an invalid token', async () => {
    const res = await api.get('/auth/verify-email-change?token=bogus-token');
    expect(res.status).toBe(400);
  });

  it('returns 400 when no token is provided', async () => {
    const res = await api.get('/auth/verify-email-change');
    expect(res.status).toBe(400);
  });
});

describe('DELETE /user/me', () => {
  beforeEach(async () => {
    await createVerifiedUser();
  });

  it('deletes account when correct password provided', async () => {
    const token = await loginUser();
    const res = await api
      .delete('/user/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ password: TEST_PASSWORD });

    expect(res.status).toBe(200);

    const user = await prisma.user.findUnique({ where: { email: TEST_EMAIL } });
    expect(user).toBeNull();
  });

  it('returns 403 INVALID_PASSWORD for a wrong password (not 401, which triggers a token refresh)', async () => {
    const token = await loginUser();
    const res = await api
      .delete('/user/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ password: 'wrongpassword' });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('INVALID_PASSWORD');
    expect(
      await prisma.user.findUnique({ where: { email: TEST_EMAIL } }),
    ).not.toBeNull();
  });

  it('returns 403 INVALID_PASSWORD without password field', async () => {
    const token = await loginUser();
    const res = await api
      .delete('/user/me')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('INVALID_PASSWORD');
  });

  it('still returns 401 without a token', async () => {
    const res = await api.delete('/user/me').send({ password: TEST_PASSWORD });
    expect(res.status).toBe(401);
  });
});
