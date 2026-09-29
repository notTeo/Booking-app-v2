import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app';

describe('CORS', () => {
  it('exposes Retry-After so the frontend can read it off a 503 BOOKING_BUSY response', async () => {
    const res = await request(app)
      .get('/health')
      .set('Origin', 'http://localhost:5173');
    expect(res.headers['access-control-expose-headers']).toContain(
      'Retry-After',
    );
  });
});
