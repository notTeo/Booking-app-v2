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

const TEST_PASSWORD = 'password123';

async function createVerifiedUser(email: string, isPro: boolean) {
  const bcrypt = await import('bcrypt');
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 4);
  return prisma.user.create({
    data: { name: 'Test User', email, passwordHash, isVerified: true, isPro },
  });
}

async function loginUser(email: string) {
  const res = await api
    .post('/auth/login')
    .send({ email, password: TEST_PASSWORD });
  return res.body.data?.accessToken as string;
}

describe('POST /api/shops', () => {
  it('creates a shop for a Pro user', async () => {
    await createVerifiedUser('pro@example.com', true);
    const token = await loginUser('pro@example.com');

    const res = await api
      .post('/api/shops')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Test Shop', slug: 'test-shop' });

    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('Test Shop');
    expect(res.body.data.role).toBe('owner');
  });

  it('allows a Pro user to create more than one shop', async () => {
    await createVerifiedUser('pro2@example.com', true);
    const token = await loginUser('pro2@example.com');

    const first = await api
      .post('/api/shops')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Shop One', slug: 'shop-one' });
    expect(first.status).toBe(201);

    const second = await api
      .post('/api/shops')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Shop Two', slug: 'shop-two' });
    expect(second.status).toBe(201);
  });

  it.each([
    ['too short', 'ab'],
    ['too long', 'a'.repeat(41)],
    ['leading hyphen', '-shop'],
    ['trailing hyphen', 'shop-'],
    ['uppercase', 'My-Shop'],
    ['reserved (route)', 'dashboard'],
    ['reserved (owner list)', 'admin'],
  ])('rejects an invalid slug: %s', async (_label, slug) => {
    await createVerifiedUser('slug@example.com', true);
    const token = await loginUser('slug@example.com');

    const res = await api
      .post('/api/shops')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Test Shop', slug });

    expect(res.status).toBe(400);
    expect(await prisma.shop.count()).toBe(0);
  });

  it('returns 403 for a Free user', async () => {
    await createVerifiedUser('free@example.com', false);
    const token = await loginUser('free@example.com');

    const res = await api
      .post('/api/shops')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Test Shop', slug: 'free-user-shop' });

    expect(res.status).toBe(403);
    expect(res.body.message).toContain('Pro account');
  });

  it('returns 401 without a token', async () => {
    const res = await api
      .post('/api/shops')
      .send({ name: 'Test Shop', slug: 'test-shop' });

    expect(res.status).toBe(401);
  });
});
