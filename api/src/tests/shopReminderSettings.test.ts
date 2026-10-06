import { describe, it, expect, vi } from 'vitest';
import app from '../app';
import { serve } from './testRequest';
import { authHeader, createTenant } from './helpers';

const api = await serve(app);

vi.mock('../services/email.service');

describe('shop reminder settings', () => {
  it('are on, 24 hours before, by default', async () => {
    const A = await createTenant('Alpha');
    const res = await api
      .get(`/api/shops/${A.shop.id}`)
      .set(authHeader(A.token));
    expect(res.body.data.reminderEnabled).toBe(true);
    expect(res.body.data.reminderHoursBefore).toBe(24);
  });

  it('can be changed by the owner', async () => {
    const A = await createTenant('Alpha');
    const res = await api
      .patch(`/api/shops/${A.shop.id}`)
      .set(authHeader(A.token))
      .send({ reminderEnabled: false, reminderHoursBefore: 48 });
    expect(res.status).toBe(200);
    expect(res.body.data.reminderEnabled).toBe(false);
    expect(res.body.data.reminderHoursBefore).toBe(48);
  });

  it.each([0, -1, 73, 1.5, 'abc'])(
    'rejects reminderHoursBefore %s with 400',
    async (bad) => {
      const A = await createTenant('Alpha');
      const res = await api
        .patch(`/api/shops/${A.shop.id}`)
        .set(authHeader(A.token))
        .send({ reminderHoursBefore: bad });
      expect(res.status).toBe(400);
    },
  );
});
