import app from '../../../api/src/app';
import { serve } from '../../../api/src/tests/testRequest';
import { createTenant, authHeader } from '../../../api/src/tests/helpers';
import { parseEnv } from '../../../api/src/config/parseEnv';

const api = await serve(app);

const baseEnv = {
  DATABASE_URL: 'postgresql://x/y',
  JWT_ACCESS_SECRET: 'a',
  JWT_REFRESH_SECRET: 'b',
  RESEND_API_KEY: 'c',
  EMAIL_FROM: 'd@example.com',
  NODE_ENV: 'development',
};

describe('platform config (true negatives)', () => {
  it('CORS does not reflect an unknown origin', async () => {
    const res = await api.get('/health').set('Origin', 'https://evil.example');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('CORS allows the configured origin with credentials, never "*"', async () => {
    const res = await api.get('/health').set('Origin', 'http://localhost:5173');
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(res.headers['access-control-allow-credentials']).toBe('true');
  });

  it('parseEnv refuses a wildcard, "null" or empty CLIENT_URLS', () => {
    for (const CLIENT_URLS of ['*', 'null', '', ' , ', 'https://ok.example,*'])
      expect(parseEnv({ ...baseEnv, CLIENT_URLS }).env).toBeNull();
  });

  it('helmet headers are set and X-Powered-By is hidden', async () => {
    const res = await api.get('/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('DENY');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('a Prisma error is a generic 500 body with no internals', async () => {
    const t = await createTenant('Pl');
    const res = await api
      .patch(`/api/shops/${t.shop.id}`)
      .set(authHeader(t.token))
      .send({ name: ['x'] });
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ status: 'error', message: 'Internal server error' });
  });

  it('a body over the default 100kb limit is a 413', async () => {
    const res = await api
      .post('/auth/login')
      .send({ email: 'a@example.com', password: 'A'.repeat(200000) });
    expect(res.status).toBe(413);
    expect(JSON.stringify(res.body)).not.toMatch(/node_modules|at /);
  });

  it('a malformed percent-escape in the path is a 4xx without a stack', async () => {
    const res = await api.get('/public/%E0%A4%A');
    expect(res.status).toBeLessThan(500);
    expect(JSON.stringify(res.body)).not.toMatch(/node_modules/);
  });

  it('/health gives no detail', async () => {
    const res = await api.get('/health');
    expect(Object.keys(res.body).sort()).toEqual(['db', 'status', 'timestamp']);
  });
});
