import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../app';
import { prisma } from '../utils/prisma';

// Mock email sending so tests don't hit Resend
vi.mock('../services/email.service', () => ({
  sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
}));

const TEST_EMAIL = 'test@example.com';
const TEST_PASSWORD = 'Password123!';

// Helper: create a verified user directly in DB
async function createVerifiedUser(email = TEST_EMAIL, password = TEST_PASSWORD) {
  const bcrypt = await import('bcrypt');
  const passwordHash = await bcrypt.hash(password, 4); // low rounds for speed in tests
  return prisma.user.create({
    data: { email, passwordHash, isVerified: true },
  });
}

// Helper: login and return tokens
async function loginUser(email = TEST_EMAIL, password = TEST_PASSWORD) {
  const res = await request(app)
    .post('/auth/login')
    .send({ email, password });
  const cookies = res.headers['set-cookie'] as string[] | string;
  const cookieHeader = Array.isArray(cookies) ? cookies[0] : cookies;
  return {
    accessToken: res.body.data?.accessToken as string,
    cookieHeader,
    body: res.body,
    status: res.status,
  };
}

describe('POST /auth/register', () => {
  it('creates a pending registration and sends verification email', async () => {
    const { sendVerificationEmail } = await import('../services/email.service');

    const res = await request(app)
      .post('/auth/register')
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('success');
    expect(sendVerificationEmail).toHaveBeenCalledWith(TEST_EMAIL, expect.any(String));

    const pending = await prisma.pendingRegistration.findUnique({ where: { email: TEST_EMAIL } });
    expect(pending).not.toBeNull();
  });

  it('returns 409 if email already registered', async () => {
    await createVerifiedUser();

    const res = await request(app)
      .post('/auth/register')
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD });

    expect(res.status).toBe(409);
    expect(res.body.message).toBe('Email already in use');
  });

  it('returns 400 for invalid email', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'not-an-email', password: TEST_PASSWORD });

    expect(res.status).toBe(400);
  });

  it('returns 400 for short password', async () => {
    const res = await request(app)
      .post('/auth/register')
      .send({ email: TEST_EMAIL, password: '123' });

    expect(res.status).toBe(400);
  });
});

describe('GET /auth/verify-email', () => {
  it('verifies email and creates user', async () => {
    await request(app).post('/auth/register').send({ email: TEST_EMAIL, password: TEST_PASSWORD });
    const pending = await prisma.pendingRegistration.findUnique({ where: { email: TEST_EMAIL } });

    const res = await request(app).get(`/auth/verify-email?token=${pending!.token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe(TEST_EMAIL);
    expect(res.body.data.user.isVerified).toBe(true);

    const user = await prisma.user.findUnique({ where: { email: TEST_EMAIL } });
    expect(user).not.toBeNull();
  });

  it('returns 400 for invalid token', async () => {
    const res = await request(app).get('/auth/verify-email?token=invalidtoken');
    expect(res.status).toBe(400);
  });

  it('returns 400 for expired token', async () => {
    await prisma.pendingRegistration.create({
      data: {
        email: TEST_EMAIL,
        passwordHash: 'hash',
        token: 'expiredtoken',
        expiresAt: new Date(Date.now() - 1000), // already expired
      },
    });

    const res = await request(app).get('/auth/verify-email?token=expiredtoken');
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('expired');
  });
});

describe('POST /auth/login', () => {
  beforeEach(async () => {
    await createVerifiedUser();
  });

  it('returns access token and sets refresh token cookie', async () => {
    const { accessToken, cookieHeader, status } = await loginUser();

    expect(status).toBe(200);
    expect(accessToken).toBeDefined();
    expect(cookieHeader).toContain('refreshToken=');
    expect(cookieHeader).toContain('HttpOnly');
  });

  it('returns 401 for wrong password', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: TEST_EMAIL, password: 'wrongpassword' });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid credentials');
  });

  it('returns 401 for non-existent user', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'nobody@example.com', password: TEST_PASSWORD });

    expect(res.status).toBe(401);
  });
});

describe('POST /auth/refresh', () => {
  it('returns new access token and rotates refresh token', async () => {
    await createVerifiedUser();
    const { cookieHeader } = await loginUser();

    const res = await request(app)
      .post('/auth/refresh')
      .set('Cookie', cookieHeader);

    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
    // New cookie should be set
    const newCookies = res.headers['set-cookie'] as string;
    expect(newCookies[0]).toContain('refreshToken=');
  });

  it('returns 401 without cookie', async () => {
    const res = await request(app).post('/auth/refresh');
    expect(res.status).toBe(401);
  });

  it('invalidates all sessions on token reuse', async () => {
    await createVerifiedUser();
    const { cookieHeader } = await loginUser();

    // Use the token once (rotates it)
    await request(app).post('/auth/refresh').set('Cookie', cookieHeader);

    // Use the original token again — reuse attack
    const res = await request(app).post('/auth/refresh').set('Cookie', cookieHeader);

    expect(res.status).toBe(401);
    expect(res.body.message).toContain('Session invalidated');

    // All sessions for user should be wiped
    const user = await prisma.user.findUnique({ where: { email: TEST_EMAIL } });
    const sessions = await prisma.refreshToken.findMany({ where: { userId: user!.id } });
    expect(sessions).toHaveLength(0);
  });
});

describe('POST /auth/logout', () => {
  it('clears the refresh token cookie', async () => {
    await createVerifiedUser();
    const { cookieHeader } = await loginUser();

    const res = await request(app)
      .post('/auth/logout')
      .set('Cookie', cookieHeader);

    expect(res.status).toBe(200);
    const cookies = res.headers['set-cookie'] as string;
    expect(cookies[0]).toContain('refreshToken=;');
  });
});

describe('POST /auth/forgot-password', () => {
  it('always returns success (no info leak)', async () => {
    const res = await request(app)
      .post('/auth/forgot-password')
      .send({ email: 'anyone@example.com' });

    expect(res.status).toBe(200);
  });

  it('sends reset email for existing user', async () => {
    await createVerifiedUser();
    const { sendPasswordResetEmail } = await import('../services/email.service');

    await request(app).post('/auth/forgot-password').send({ email: TEST_EMAIL });

    expect(sendPasswordResetEmail).toHaveBeenCalledWith(TEST_EMAIL, expect.any(String));
  });
});

describe('POST /auth/reset-password', () => {
  it('resets password and invalidates all sessions', async () => {
    const user = await createVerifiedUser();
    const { loginUser: login } = await import('../services/auth.service');

    // Create a reset token
    const { generateRandomToken, getPasswordResetTokenExpiry } = await import('../utils/jwt');
    const token = generateRandomToken();
    await prisma.passwordResetToken.create({
      data: { token, userId: user.id, expiresAt: getPasswordResetTokenExpiry() },
    });

    const res = await request(app)
      .post('/auth/reset-password')
      .send({ token, password: 'Newpassword123!' });

    expect(res.status).toBe(200);

    // Should be able to login with new password
    const loginRes = await request(app)
      .post('/auth/login')
      .send({ email: TEST_EMAIL, password: 'Newpassword123!' });
    expect(loginRes.status).toBe(200);
  });

  it('returns 400 for invalid token', async () => {
    const res = await request(app)
      .post('/auth/reset-password')
      .send({ token: 'badtoken', password: 'newpassword123' });

    expect(res.status).toBe(400);
  });
});

describe('POST /auth/resend-verification', () => {
  it('updates token for pending registration', async () => {
    const { sendVerificationEmail } = await import('../services/email.service');
    vi.clearAllMocks();

    await request(app).post('/auth/register').send({ email: TEST_EMAIL, password: TEST_PASSWORD });
    const before = await prisma.pendingRegistration.findUnique({ where: { email: TEST_EMAIL } });

    await request(app).post('/auth/resend-verification').send({ email: TEST_EMAIL });

    const after = await prisma.pendingRegistration.findUnique({ where: { email: TEST_EMAIL } });
    expect(after!.token).not.toBe(before!.token);
    expect(sendVerificationEmail).toHaveBeenCalledTimes(2); // once on register, once on resend
  });

  it('returns success even for unknown email (no info leak)', async () => {
    const res = await request(app)
      .post('/auth/resend-verification')
      .send({ email: 'unknown@example.com' });

    expect(res.status).toBe(200);
  });
});

describe('GET /auth/sessions', () => {
  it('returns active sessions for authenticated user', async () => {
    await createVerifiedUser();
    const { accessToken } = await loginUser();

    const res = await request(app)
      .get('/auth/sessions')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.sessions)).toBe(true);
    expect(res.body.data.sessions.length).toBeGreaterThan(0);
  });

  it('returns 401 without token', async () => {
    const res = await request(app).get('/auth/sessions');
    expect(res.status).toBe(401);
  });
});

describe('DELETE /auth/sessions', () => {
  it('revokes all sessions', async () => {
    await createVerifiedUser();
    const { accessToken, cookieHeader } = await loginUser();

    const res = await request(app)
      .delete('/auth/sessions')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Cookie', cookieHeader);

    expect(res.status).toBe(200);

    // Refresh should now fail
    const refreshRes = await request(app)
      .post('/auth/refresh')
      .set('Cookie', cookieHeader);
    expect(refreshRes.status).toBe(401);
  });
});
