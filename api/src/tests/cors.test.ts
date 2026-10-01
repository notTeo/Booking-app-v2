import { describe, it, expect } from 'vitest';
import app from '../app';
import { serve } from './testRequest';

const api = await serve(app);

describe('CORS', () => {
  it('exposes Retry-After so the frontend can read it off a 503 BOOKING_BUSY response', async () => {
    const res = await api.get('/health').set('Origin', 'http://localhost:5173');
    expect(res.headers['access-control-expose-headers']).toContain(
      'Retry-After',
    );
  });
});
