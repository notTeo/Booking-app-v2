import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import app from '../app';
import { authHeader, createTenant } from './helpers';

vi.mock('../services/email.service');

describe('date query params are calendar dates (YYYY-MM-DD) only', () => {
  it('public slots rejects a full ISO datetime with 400', async () => {
    const t = await createTenant('Fmt');
    const res = await request(app).get(
      `/public/${t.shop.slug}/slots?date=2027-02-01T00:00:00Z&serviceId=${t.service.id}`,
    );
    expect(res.status).toBe(400);
  });

  it('owner booking list rejects a full ISO datetime with 400', async () => {
    const t = await createTenant('Fmt');
    const res = await request(app)
      .get(`/api/shops/${t.shop.id}/bookings?date=2027-02-01T00:00:00Z`)
      .set(authHeader(t.token));
    expect(res.status).toBe(400);
  });

  it('accepts a plain calendar date', async () => {
    const t = await createTenant('Fmt');
    const res = await request(app)
      .get(`/api/shops/${t.shop.id}/bookings?date=2027-02-01`)
      .set(authHeader(t.token));
    expect(res.status).toBe(200);
  });
});
