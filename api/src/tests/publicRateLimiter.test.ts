import { describe, it, expect, vi, afterEach } from 'vitest';
import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';

// Mirrors rateLimiterSwitch.test.ts's pattern: a tiny isolated app wiring the
// real exported limiter (never the full app.ts, which always disables
// limiters under NODE_ENV=test), with process.env reset per test so the
// module-level isTest check is recomputed on each dynamic import.
const ORIGINAL = { ...process.env };

async function limitedApp(
  limiterName: 'publicReadLimiter' | 'publicWriteLimiter' | 'refreshLimiter',
  env: Record<string, string | undefined> = { NODE_ENV: 'development' },
) {
  vi.resetModules();
  Object.assign(process.env, ORIGINAL, env);
  for (const [k, v] of Object.entries(env))
    if (v === undefined) delete process.env[k];
  const mod = await import('../middleware/rateLimiter');
  const app = express();
  app.use(cookieParser());
  app.get('/x', mod[limiterName], (_req, res) => res.json({ ok: true }));
  return app;
}

const burst = async (app: express.Express, n: number, withCookie = false) => {
  const codes: number[] = [];
  for (let i = 0; i < n; i++) {
    const req = request(app).get('/x');
    if (withCookie) req.set('Cookie', 'refreshToken=abc');
    codes.push((await req).status);
  }
  return codes;
};

afterEach(() => {
  for (const k of Object.keys(process.env))
    if (!(k in ORIGINAL)) delete process.env[k];
  Object.assign(process.env, ORIGINAL);
  vi.resetModules();
});

describe('public rate limiters (group 6)', () => {
  it('publicWriteLimiter (book/cancel) is stricter than publicReadLimiter (info/slots)', async () => {
    const writeCodes = await burst(await limitedApp('publicWriteLimiter'), 22);
    expect(writeCodes.slice(0, 20).every((c) => c === 200)).toBe(true);
    expect(writeCodes.slice(20)).toEqual([429, 429]);

    const readCodes = await burst(await limitedApp('publicReadLimiter'), 22);
    // Well within the read limiter's higher ceiling — none of these trip it.
    expect(readCodes.every((c) => c === 200)).toBe(true);
  });

  it('RATE_LIMIT_DISABLED still bypasses the new public limiters outside production', async () => {
    const codes = await burst(
      await limitedApp('publicWriteLimiter', {
        NODE_ENV: 'development',
        RATE_LIMIT_DISABLED: 'true',
      }),
      22,
    );
    expect(codes.every((c) => c === 200)).toBe(true);
  });

  it('production ignores RATE_LIMIT_DISABLED for the new public limiters too', async () => {
    const codes = await burst(
      await limitedApp('publicWriteLimiter', {
        NODE_ENV: 'production',
        RATE_LIMIT_DISABLED: 'true',
      }),
      22,
    );
    expect(codes.slice(20)).toEqual([429, 429]);
  });
});

describe("refreshLimiter (group 6: no longer shares /auth/login's strict budget)", () => {
  it('skips entirely with no refresh cookie — an anonymous visitor never counts against it', async () => {
    const app = await limitedApp('refreshLimiter');
    const codes = await burst(app, 80, false);
    expect(codes.every((c) => c === 200)).toBe(true);
  });

  it('still limits (generously) when a refresh cookie is present', async () => {
    const app = await limitedApp('refreshLimiter');
    const codes = await burst(app, 62, true);
    expect(codes.slice(0, 60).every((c) => c === 200)).toBe(true);
    expect(codes.slice(60)).toEqual([429, 429]);
  });

  it('a cookie-bearing requester does not benefit from cookie-less requests sharing the budget', async () => {
    const app = await limitedApp('refreshLimiter');
    // These never count...
    await burst(app, 200, false);
    // ...so the cookie-bearing budget starts fresh, unaffected by the above.
    const codes = await burst(app, 62, true);
    expect(codes.slice(0, 60).every((c) => c === 200)).toBe(true);
    expect(codes.slice(60)).toEqual([429, 429]);
  });
});
