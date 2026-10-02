import { describe, it, expect, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import app from '../app';
import { serve } from './testRequest';
import { prisma } from '../utils/prisma';
import { env } from '../config/env';
import { signAccessToken, signRefreshToken } from '../utils/jwt';
import { createTenant } from './helpers';

vi.mock('../services/email.service');

const api = await serve(app);

const PASSWORD = 'Password123!';

const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');

// Header and payload decoded, so a test can alter one and keep the other.
const parts = (token: string) => token.split('.');

async function userWithSession(email: string) {
  const bcrypt = await import('bcrypt');
  const user = await prisma.user.create({
    data: {
      name: 'Forge',
      email,
      passwordHash: await bcrypt.hash(PASSWORD, 4),
      isVerified: true,
    },
  });
  const login = await api
    .post('/auth/login')
    .send({ email, password: PASSWORD });
  const cookie = (login.headers['set-cookie'] as string[])[0].split(';')[0];
  return { user, cookie, accessToken: login.body.data.accessToken as string };
}

const me = (authorization?: string) =>
  authorization === undefined
    ? api.get('/user/me')
    : api.get('/user/me').set('Authorization', authorization);

describe('access tokens: anything but a genuine, current one is a 401', () => {
  it('a genuine token works (the control)', async () => {
    const { user, accessToken } = await userWithSession('control@example.com');
    const res = await me(`Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.user.id).toBe(user.id);
  });

  it.each([
    ['no header', undefined],
    ['wrong scheme', 'Basic abc'],
    ['empty bearer', 'Bearer '],
    ['not a JWT', 'Bearer not-a-token'],
    ['three junk segments', 'Bearer a.b.c'],
  ])('%s', async (_label, header) => {
    expect((await me(header)).status).toBe(401);
  });

  it('a tampered signature', async () => {
    const { accessToken } = await userWithSession('sig@example.com');
    const [h, p, s] = parts(accessToken);
    const flipped = `${s.slice(0, -1)}${s.endsWith('A') ? 'B' : 'A'}`;
    expect((await me(`Bearer ${h}.${p}.${flipped}`)).status).toBe(401);
  });

  it('a tampered payload under the original signature', async () => {
    const { user, accessToken } = await userWithSession('payload@example.com');
    const other = await createTenant('Victim');
    const [h, p, s] = parts(accessToken);
    const payload = JSON.parse(Buffer.from(p, 'base64url').toString());
    expect(payload.userId).toBe(user.id);
    const forged = `${h}.${b64({ ...payload, userId: other.user.id })}.${s}`;
    expect((await me(`Bearer ${forged}`)).status).toBe(401);
  });

  it('a token signed with the wrong secret', async () => {
    const { user } = await userWithSession('wrong@example.com');
    const token = jwt.sign({ userId: user.id }, 'not-the-secret', {
      expiresIn: 900,
    });
    expect((await me(`Bearer ${token}`)).status).toBe(401);
  });

  it('alg:none with an empty signature', async () => {
    const { user } = await userWithSession('none@example.com');
    const now = Math.floor(Date.now() / 1000);
    const token = `${b64({ alg: 'none', typ: 'JWT' })}.${b64({
      userId: user.id,
      iat: now,
      exp: now + 900,
    })}.`;
    expect((await me(`Bearer ${token}`)).status).toBe(401);
  });

  it('an expired token, otherwise genuine', async () => {
    const { user } = await userWithSession('expired@example.com');
    const now = Math.floor(Date.now() / 1000);
    const token = jwt.sign(
      { userId: user.id, iat: now - 1000, exp: now - 10 },
      env.jwt.accessSecret,
    );
    expect((await me(`Bearer ${token}`)).status).toBe(401);
  });

  it('a token signed with the refresh secret', async () => {
    const { user } = await userWithSession('swap@example.com');
    const token = jwt.sign({ userId: user.id }, env.jwt.refreshSecret, {
      expiresIn: 900,
    });
    expect((await me(`Bearer ${token}`)).status).toBe(401);
  });

  it('a real refresh token presented as an access token', async () => {
    const { user } = await userWithSession('refreshasaccess@example.com');
    expect((await me(`Bearer ${signRefreshToken(user.id)}`)).status).toBe(401);
  });

  it('a token for a user who no longer exists gets no data', async () => {
    const { user, accessToken } = await userWithSession('gone@example.com');
    await prisma.refreshToken.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
    const res = await me(`Bearer ${accessToken}`);
    expect(res.status).toBe(404);
    expect(JSON.stringify(res.body)).not.toContain('gone@example.com');
  });
});

describe('refresh cookie', () => {
  const refresh = (cookie?: string) =>
    cookie === undefined
      ? api.post('/auth/refresh')
      : api.post('/auth/refresh').set('Cookie', cookie);
  const sessions = (userId: string) =>
    prisma.refreshToken.count({ where: { userId } });

  it.each([
    ['not a JWT', 'refreshToken=garbage'],
    ['two segments', 'refreshToken=aaa.bbb'],
    ['spaces and symbols', 'refreshToken=%20%3Cscript%3E'],
  ])('%s is a 400 and touches no session', async (_label, cookie) => {
    const { user } = await userWithSession(`bad-${_label.length}@example.com`);
    const res = await refresh(cookie);
    expect(res.status).toBe(400);
    expect(await sessions(user.id)).toBe(1);
  });

  it('a missing or empty cookie is a 401, not a 400', async () => {
    expect((await refresh()).status).toBe(401);
    expect((await refresh('refreshToken=')).status).toBe(401);
  });

  it('forged tokens are a 401 and never revoke the real session', async () => {
    const { user, cookie } = await userWithSession('victim@example.com');
    const now = Math.floor(Date.now() / 1000);
    const valid = signRefreshToken(user.id);
    const [h, p, s] = parts(valid);
    const forged = {
      'wrong secret': jwt.sign({ userId: user.id }, 'not-the-secret', {
        expiresIn: 900,
      }),
      'tampered signature': `${h}.${p}.${s.slice(0, -1)}${s.endsWith('A') ? 'B' : 'A'}`,
      'alg:none': `${b64({ alg: 'none', typ: 'JWT' })}.${b64({
        userId: user.id,
        iat: now,
        exp: now + 900,
      })}.`,
      expired: jwt.sign(
        { userId: user.id, iat: now - 1000, exp: now - 10 },
        env.jwt.refreshSecret,
      ),
      'an access token': signAccessToken(user.id),
    };
    for (const [label, token] of Object.entries(forged)) {
      const res = await refresh(`refreshToken=${token}`);
      expect(res.status, label).toBe(401);
      expect(res.body.message, label).toBe('Invalid refresh token');
      expect(await sessions(user.id), `${label} left the session`).toBe(1);
    }
    // …and the genuine cookie still works afterwards.
    expect((await refresh(cookie)).status).toBe(200);
  });
});

describe('logout cookie', () => {
  const logout = (cookie?: string) =>
    cookie === undefined
      ? api.post('/auth/logout')
      : api.post('/auth/logout').set('Cookie', cookie);

  it('works without a cookie, and removes the session when given one', async () => {
    expect((await logout()).status).toBe(200);

    const { user, cookie } = await userWithSession('bye@example.com');
    expect((await logout(cookie)).status).toBe(200);
    expect(
      await prisma.refreshToken.count({ where: { userId: user.id } }),
    ).toBe(0);
  });

  it('a JWT-shaped cookie that is not a session is a harmless 200', async () => {
    const { user } = await userWithSession('shaped@example.com');
    const res = await logout('refreshToken=aaa.bbb.ccc');
    expect(res.status).toBe(200);
    expect(
      await prisma.refreshToken.count({ where: { userId: user.id } }),
    ).toBe(1);
  });

  it('a cookie that is not shaped like a JWT is a 400', async () => {
    expect((await logout('refreshToken=garbage')).status).toBe(400);
  });
});
