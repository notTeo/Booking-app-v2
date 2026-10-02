import { describe, it, expect, vi } from 'vitest';
import app from '../app';
import { serve } from './testRequest';
import { prisma } from '../utils/prisma';
import { REFRESH_RACE_WINDOW_MS } from '../services/auth.service';

vi.mock('../services/email.service');

const api = await serve(app);

const PASSWORD = 'Password123!';
const ROUNDS = 20;

const cookieOf = (res: { headers: Record<string, unknown> }) => {
  const cookies = res.headers['set-cookie'] as string[] | string;
  return (Array.isArray(cookies) ? cookies[0] : cookies).split(';')[0];
};

async function loginFresh(email: string) {
  const bcrypt = await import('bcrypt');
  const user = await prisma.user.create({
    data: {
      name: 'Racer',
      email,
      passwordHash: await bcrypt.hash(PASSWORD, 4),
      isVerified: true,
    },
  });
  const res = await api.post('/auth/login').send({ email, password: PASSWORD });
  return { cookie: cookieOf(res), userId: user.id };
}

const refresh = (cookie: string) =>
  api.post('/auth/refresh').set('Cookie', cookie);

// Two tabs (or a page load plus an interceptor) refreshing at the same moment
// present the same cookie twice. Exactly one rotation may win; the other must
// be a clean, retryable 401 and must not take the winner's session with it.
describe('POST /auth/refresh: two simultaneous requests with one cookie', () => {
  it(`one wins, the other is a REFRESH_RACE 401, and the session survives (x${ROUNDS})`, async () => {
    for (let i = 0; i < ROUNDS; i++) {
      const { cookie, userId } = await loginFresh(`race-${i}@example.com`);

      const results = await Promise.all([refresh(cookie), refresh(cookie)]);
      const label = `round ${i}: ${results.map((r) => r.status).join('+')}`;

      const wins = results.filter((r) => r.status === 200);
      const losses = results.filter((r) => r.status === 401);
      expect(wins, label).toHaveLength(1);
      expect(losses, label).toHaveLength(1);
      expect(losses[0].body.code, label).toBe('REFRESH_RACE');
      expect(
        await prisma.refreshToken.count({ where: { userId } }),
        label,
      ).toBe(1);

      // The winner's new cookie still works.
      expect((await refresh(cookieOf(wins[0]))).status, label).toBe(200);
    }
  });
});

describe('replaying a rotated cookie', () => {
  it('inside the window is a REFRESH_RACE 401 that leaves the session alone', async () => {
    const { cookie, userId } = await loginFresh('in-window@example.com');
    const winner = await refresh(cookie);
    expect(winner.status).toBe(200);

    vi.setSystemTime(Date.now() + REFRESH_RACE_WINDOW_MS - 1000);
    const replay = await refresh(cookie);

    expect(replay.status).toBe(401);
    expect(replay.body.code).toBe('REFRESH_RACE');
    expect(await prisma.refreshToken.count({ where: { userId } })).toBe(1);
    expect((await refresh(cookieOf(winner))).status).toBe(200);
  });

  it('outside the window revokes every session (reuse detection)', async () => {
    const { cookie, userId } = await loginFresh('out-window@example.com');
    expect((await refresh(cookie)).status).toBe(200);

    vi.setSystemTime(Date.now() + REFRESH_RACE_WINDOW_MS + 1000);
    const replay = await refresh(cookie);

    expect(replay.status).toBe(401);
    expect(replay.body.message).toContain('Session invalidated');
    expect(await prisma.refreshToken.count({ where: { userId } })).toBe(0);
  });
});
