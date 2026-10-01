import { describe, it, expect, vi, afterEach } from 'vitest';
import app from '../app';
import { serve } from './testRequest';

const api = await serve(app);

// Prisma's client doesn't expose $queryRaw as a spy-able own property, so wrap
// it in a proxy that can be told to fail.
const db = vi.hoisted(() => ({ down: false }));
vi.mock('../utils/prisma', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../utils/prisma')>();
  const prisma = new Proxy(mod.prisma, {
    get(target, key) {
      if (key === '$queryRaw' && db.down) {
        return () =>
          Promise.reject(new Error('connect ECONNREFUSED 10.0.0.5:5432'));
      }
      const value = Reflect.get(target, key, target);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
  return { ...mod, prisma };
});

afterEach(() => {
  db.down = false;
});

describe('GET /health', () => {
  it('is 200 with db up when the database answers', async () => {
    const res = await api.get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok', db: 'up' });
  });

  it('is 503 with no error detail when the database is unreachable', async () => {
    db.down = true;
    const res = await api.get('/health');
    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({ status: 'error', db: 'down' });
    expect(JSON.stringify(res.body)).not.toContain('ECONNREFUSED');
  });
});

describe('X-Request-Id', () => {
  it('generates an id when none is sent', async () => {
    const res = await api.get('/health');
    expect(res.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('echoes a sane incoming id', async () => {
    const res = await api.get('/health').set('X-Request-Id', 'edge-abc_123');
    expect(res.headers['x-request-id']).toBe('edge-abc_123');
  });

  it('replaces an id that is too long or has odd characters', async () => {
    for (const bad of ['x'.repeat(65), 'a b', 'a"b']) {
      const res = await api.get('/health').set('X-Request-Id', bad);
      expect(res.headers['x-request-id']).not.toBe(bad);
    }
  });
});

describe('CORS', () => {
  it('reflects the configured origin only', async () => {
    const ok = await api.get('/health').set('Origin', 'http://localhost:5173');
    expect(ok.headers['access-control-allow-origin']).toBe(
      'http://localhost:5173',
    );
    const bad = await api.get('/health').set('Origin', 'https://evil.example');
    expect(bad.headers['access-control-allow-origin']).toBeUndefined();
  });
});
