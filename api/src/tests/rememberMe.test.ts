import { describe, it, expect, vi } from 'vitest';
import app from '../app';
import { serve } from './testRequest';
import { prisma } from '../utils/prisma';
import { env } from '../config/env';

vi.mock('../services/email.service');

const api = await serve(app);

const PASSWORD = 'Password123!';
const DAY_MS = 24 * 60 * 60 * 1000;
const REMEMBERED_MS = env.jwt.refreshExpiresInSeconds * 1000;

async function user(email: string) {
  const bcrypt = await import('bcrypt');
  return prisma.user.create({
    data: {
      name: 'Remember',
      email,
      passwordHash: await bcrypt.hash(PASSWORD, 4),
      isVerified: true,
    },
  });
}

const login = (email: string, rememberMe?: boolean | string) =>
  api.post('/auth/login').send({
    email,
    password: PASSWORD,
    ...(rememberMe !== undefined && { rememberMe }),
  });

const setCookie = (res: { headers: Record<string, unknown> }) =>
  (res.headers['set-cookie'] as string[])[0];

// Persistent cookies carry Max-Age (and Expires); a session cookie carries
// neither and dies with the browser.
const isPersistent = (cookie: string) => /Max-Age=\d+/i.test(cookie);

const rowFor = (userId: string) =>
  prisma.refreshToken.findFirstOrThrow({ where: { userId } });

describe('login with rememberMe', () => {
  it('defaults to remembered: persistent cookie, full-length session', async () => {
    const u = await user('default@example.com');
    const res = await login('default@example.com');

    expect(res.status).toBe(200);
    expect(setCookie(res)).toContain(
      `Max-Age=${env.jwt.refreshExpiresInSeconds}`,
    );
    const row = await rowFor(u.id);
    expect(row.rememberMe).toBe(true);
    expect(row.expiresAt.getTime()).toBe(Date.now() + REMEMBERED_MS);
  });

  it('true is the same as the default', async () => {
    const u = await user('true@example.com');
    const res = await login('true@example.com', true);

    expect(isPersistent(setCookie(res))).toBe(true);
    expect((await rowFor(u.id)).rememberMe).toBe(true);
  });

  it('false: a session cookie, and a server-side session of at most a day', async () => {
    const u = await user('false@example.com');
    const res = await login('false@example.com', false);

    expect(res.status).toBe(200);
    expect(isPersistent(setCookie(res))).toBe(false);
    expect(setCookie(res)).not.toMatch(/Expires=/i);
    const row = await rowFor(u.id);
    expect(row.rememberMe).toBe(false);
    expect(row.expiresAt.getTime()).toBe(Date.now() + DAY_MS);
  });

  it('rejects a non-boolean rememberMe and creates no session', async () => {
    const u = await user('bad@example.com');
    const res = await login('bad@example.com', 'yes');

    expect(res.status).toBe(400);
    expect(await prisma.refreshToken.count({ where: { userId: u.id } })).toBe(
      0,
    );
  });
});

describe('the choice survives refresh rotation', () => {
  it.each([
    [true, REMEMBERED_MS],
    [false, DAY_MS],
  ])(
    'rememberMe=%s: cookie type, flag and expiry carry over',
    async (remember, lifetime) => {
      const u = await user(`rotate-${remember}@example.com`);
      const first = await login(`rotate-${remember}@example.com`, remember);
      const cookie = setCookie(first).split(';')[0];

      // Rotate a few minutes later; the new expiry counts from the rotation.
      vi.setSystemTime(Date.now() + 5 * 60 * 1000);
      const res = await api.post('/auth/refresh').set('Cookie', cookie);

      expect(res.status).toBe(200);
      expect(isPersistent(setCookie(res))).toBe(remember);
      const row = await rowFor(u.id);
      expect(row.rememberMe).toBe(remember);
      expect(row.expiresAt.getTime()).toBe(Date.now() + lifetime);
    },
  );

  it('a session-only login expires server-side after a day, whatever the cookie does', async () => {
    const u = await user('expiry@example.com');
    const first = await login('expiry@example.com', false);
    const cookie = setCookie(first).split(';')[0];

    vi.setSystemTime(Date.now() + DAY_MS + 1000);
    const res = await api.post('/auth/refresh').set('Cookie', cookie);

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Refresh token expired');
    expect(await prisma.refreshToken.count({ where: { userId: u.id } })).toBe(
      0,
    );
  });

  it('a remembered login is still good well past a day', async () => {
    await user('long@example.com');
    const first = await login('long@example.com');
    const cookie = setCookie(first).split(';')[0];

    vi.setSystemTime(Date.now() + 7 * DAY_MS);
    expect((await api.post('/auth/refresh').set('Cookie', cookie)).status).toBe(
      200,
    );
  });
});

describe('getRefreshTokenExpiry', () => {
  it('never extends a session-only login beyond the configured lifetime', async () => {
    vi.resetModules();
    vi.doMock('../config/env', () => ({
      env: {
        jwt: { refreshExpiresInSeconds: 3600, accessExpiresInSeconds: 900 },
      },
    }));
    const { getRefreshTokenExpiry } = await import('../utils/jwt');

    expect(getRefreshTokenExpiry(false).getTime()).toBe(
      Date.now() + 3600 * 1000,
    );
    expect(getRefreshTokenExpiry(true).getTime()).toBe(
      Date.now() + 3600 * 1000,
    );

    vi.doUnmock('../config/env');
    vi.resetModules();
  });
});
