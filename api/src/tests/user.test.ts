import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../app';
import { prisma } from '../utils/prisma';

// Mock email sending so tests don't hit Resend
vi.mock('../services/email.service', () => ({
  sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
  sendEmailChangeVerification: vi.fn().mockResolvedValue(undefined),
}));

const TEST_EMAIL = 'user@example.com';
const TEST_PASSWORD = 'password123';

async function createVerifiedUser(email = TEST_EMAIL, password = TEST_PASSWORD) {
  const bcrypt = await import('bcrypt');
  const passwordHash = await bcrypt.hash(password, 4);
  return prisma.user.create({
    data: { email, passwordHash, isVerified: true },
  });
}

async function loginUser(email = TEST_EMAIL, password = TEST_PASSWORD) {
  const res = await request(app).post('/auth/login').send({ email, password });
  return res.body.data?.accessToken as string;
}

describe('GET /user/me', () => {
  beforeEach(async () => { await createVerifiedUser(); });

  it('returns current user profile', async () => {
    const token = await loginUser();
    const res = await request(app)
      .get('/user/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe(TEST_EMAIL);
    expect(res.body.data.user.isVerified).toBe(true);
    expect(res.body.data.user.passwordHash).toBeUndefined(); // never exposed
  });

  it('returns 401 without token', async () => {
    const res = await request(app).get('/user/me');
    expect(res.status).toBe(401);
  });
});

describe('PATCH /user/me', () => {
  beforeEach(async () => { await createVerifiedUser(); });

  it('sends verification email to new address and does not change email immediately', async () => {
    const token = await loginUser();
    const res = await request(app)
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
    const res = await request(app)
      .patch('/user/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ password: 'Newpassword456!' });

    expect(res.status).toBe(200);

    // All refresh tokens should be gone
    const user = await prisma.user.findUnique({ where: { email: TEST_EMAIL } });
    const sessions = await prisma.refreshToken.findMany({ where: { userId: user!.id } });
    expect(sessions).toHaveLength(0);
  });

  it('returns 409 if new email is already taken', async () => {
    await createVerifiedUser('other@example.com');
    const token = await loginUser();
    const res = await request(app)
      .patch('/user/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'other@example.com' });

    expect(res.status).toBe(409);
  });

  it('returns 400 for invalid email', async () => {
    const token = await loginUser();
    const res = await request(app)
      .patch('/user/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ email: 'not-valid' });

    expect(res.status).toBe(400);
  });
});

describe('GET /auth/verify-email-change', () => {
  beforeEach(async () => { await createVerifiedUser(); });

  it('updates email when valid token is provided', async () => {
    const user = await prisma.user.findUniqueOrThrow({ where: { email: TEST_EMAIL } });
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

    const res = await request(app).get('/auth/verify-email-change?token=valid-token-abc123');

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
    const user = await prisma.user.findUniqueOrThrow({ where: { email: TEST_EMAIL } });
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

    const res = await request(app).get('/auth/verify-email-change?token=expired-token-xyz');

    expect(res.status).toBe(400);
  });

  it('returns 400 for an invalid token', async () => {
    const res = await request(app).get('/auth/verify-email-change?token=bogus-token');
    expect(res.status).toBe(400);
  });

  it('returns 400 when no token is provided', async () => {
    const res = await request(app).get('/auth/verify-email-change');
    expect(res.status).toBe(400);
  });
});

describe('DELETE /user/me', () => {
  beforeEach(async () => { await createVerifiedUser(); });

  it('deletes account when correct password provided', async () => {
    const token = await loginUser();
    const res = await request(app)
      .delete('/user/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ password: TEST_PASSWORD });

    expect(res.status).toBe(200);

    const user = await prisma.user.findUnique({ where: { email: TEST_EMAIL } });
    expect(user).toBeNull();
  });

  it('returns 401 for wrong password', async () => {
    const token = await loginUser();
    const res = await request(app)
      .delete('/user/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ password: 'wrongpassword' });

    expect(res.status).toBe(401);
  });

  it('returns 400 without password field', async () => {
    const token = await loginUser();
    const res = await request(app)
      .delete('/user/me')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(400);
  });
});
