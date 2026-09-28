import { describe, it, expect, vi, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// The e2e suite drives a real browser through many logins/page loads from one
// IP, which the auth limiter (10 / 15 min) would block. RATE_LIMIT_DISABLED
// turns the limiters off — but NEVER in production.
const ORIGINAL = { ...process.env };

async function limitedApp(env: Record<string, string | undefined>) {
  vi.resetModules();
  Object.assign(process.env, ORIGINAL, env);
  for (const [k, v] of Object.entries(env))
    if (v === undefined) delete process.env[k];
  const { authLimiter } = await import('../middleware/rateLimiter');
  const app = express();
  app.post('/x', authLimiter, (_req, res) => res.json({ ok: true }));
  return app;
}

const burst = async (app: express.Express, n = 12) => {
  const codes: number[] = [];
  for (let i = 0; i < n; i++)
    codes.push((await request(app).post('/x')).status);
  return codes;
};

afterEach(() => {
  for (const k of Object.keys(process.env))
    if (!(k in ORIGINAL)) delete process.env[k];
  Object.assign(process.env, ORIGINAL);
  vi.resetModules();
});

describe('rate limiter on/off switch', () => {
  it('development: the limiter is ON by default (11th request is 429)', async () => {
    const codes = await burst(
      await limitedApp({
        NODE_ENV: 'development',
        RATE_LIMIT_DISABLED: undefined,
      }),
    );
    expect(codes.slice(0, 10).every((c) => c === 200)).toBe(true);
    expect(codes.slice(10)).toEqual([429, 429]);
  });

  it('development + RATE_LIMIT_DISABLED=true: limiter is off', async () => {
    const codes = await burst(
      await limitedApp({
        NODE_ENV: 'development',
        RATE_LIMIT_DISABLED: 'true',
      }),
    );
    expect(codes.every((c) => c === 200)).toBe(true);
  });

  it('production ignores RATE_LIMIT_DISABLED (still limited)', async () => {
    const codes = await burst(
      await limitedApp({ NODE_ENV: 'production', RATE_LIMIT_DISABLED: 'true' }),
    );
    expect(codes.slice(10)).toEqual([429, 429]);
  });

  it('an unset NODE_ENV counts as not-production, so it must not silently disable either without the flag', async () => {
    const codes = await burst(
      await limitedApp({ NODE_ENV: undefined, RATE_LIMIT_DISABLED: undefined }),
    );
    expect(codes.slice(10)).toEqual([429, 429]);
  });
});
