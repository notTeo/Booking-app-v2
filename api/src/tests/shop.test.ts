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

async function createVerifiedUser(email: string) {
  const bcrypt = await import('bcrypt');
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 4);
  return prisma.user.create({
    data: { name: 'Test User', email, passwordHash, isVerified: true },
  });
}

async function loginUser(email: string) {
  const res = await api
    .post('/auth/login')
    .send({ email, password: TEST_PASSWORD });
  return res.body.data?.accessToken as string;
}

describe('POST /api/shops', () => {
  it("starts a user's first shop on a 30-day Team trial", async () => {
    await createVerifiedUser('pro@example.com');
    const token = await loginUser('pro@example.com');

    const res = await api
      .post('/api/shops')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Test Shop', slug: 'test-shop' });

    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('Test Shop');
    expect(res.body.data.role).toBe('owner');
    expect(res.body.data).toMatchObject({
      plan: 'TEAM',
      subscriptionStatus: 'TRIALING',
      locked: false,
      staffLimit: 5,
      teamFeatures: true,
    });
    const days =
      (new Date(res.body.data.trialEndsAt).getTime() - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(29.9);
    expect(days).toBeLessThanOrEqual(30);
  });

  it('starts any later shop inactive, with no second trial', async () => {
    await createVerifiedUser('pro2@example.com');
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
    expect(second.body.data).toMatchObject({
      subscriptionStatus: 'INACTIVE',
      trialEndsAt: null,
      locked: true,
    });
  });

  it.each([
    ['SOLO', 1, false],
    ['TEAM', 5, true],
    ['BUSINESS', 15, true],
  ] as const)(
    "runs the first shop's trial on the plan its owner picked: %s",
    async (plan, staffLimit, teamFeatures) => {
      await createVerifiedUser('pick@example.com');
      const token = await loginUser('pick@example.com');

      const res = await api
        .post('/api/shops')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Picked', slug: 'picked-shop', plan });

      expect(res.status).toBe(201);
      expect(res.body.data).toMatchObject({
        plan,
        subscriptionStatus: 'TRIALING',
        locked: false,
        staffLimit,
        teamFeatures,
      });
    },
  );

  it('keeps the plan picked for a later shop, which still starts inactive', async () => {
    await createVerifiedUser('later@example.com');
    const token = await loginUser('later@example.com');
    await api
      .post('/api/shops')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'First', slug: 'first-shop' });

    const second = await api
      .post('/api/shops')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Second', slug: 'second-shop', plan: 'BUSINESS' });

    expect(second.status).toBe(201);
    expect(second.body.data).toMatchObject({
      plan: 'BUSINESS',
      subscriptionStatus: 'INACTIVE',
      locked: true,
    });
  });

  it('rejects a plan that does not exist', async () => {
    await createVerifiedUser('gold@example.com');
    const token = await loginUser('gold@example.com');

    const res = await api
      .post('/api/shops')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Gold', slug: 'gold-shop', plan: 'GOLD' });

    expect(res.status).toBe(400);
    expect(await prisma.shop.count()).toBe(0);
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
    await createVerifiedUser('slug@example.com');
    const token = await loginUser('slug@example.com');

    const res = await api
      .post('/api/shops')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Test Shop', slug });

    expect(res.status).toBe(400);
    expect(await prisma.shop.count()).toBe(0);
  });

  it('returns 401 without a token', async () => {
    const res = await api
      .post('/api/shops')
      .send({ name: 'Test Shop', slug: 'test-shop' });

    expect(res.status).toBe(401);
  });
});
