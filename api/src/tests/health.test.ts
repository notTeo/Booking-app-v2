import { describe, it, expect } from 'vitest';
import app from '../app';
import { serve } from './testRequest';

const api = await serve(app);

describe('GET /health', () => {
  it('returns 200 with status ok', async () => {
    const res = await api.get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.timestamp).toBeDefined();
  });
});
