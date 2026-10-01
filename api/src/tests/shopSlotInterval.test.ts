import { describe, it, expect, vi } from 'vitest';
import app from '../app';
import { serve } from './testRequest';
import { addWeeklySchedule, authHeader, createTenant, unique } from './helpers';

const api = await serve(app);

vi.mock('../services/email.service');

describe('shop.slotIntervalMinutes (gap between bookable start times)', () => {
  it('defaults to 30 minutes', async () => {
    const A = await createTenant('Alpha');
    const res = await api
      .post('/api/shops')
      .set(authHeader(A.token))
      .send({ name: 'S', slug: `slot-${unique()}` });
    expect(res.status).toBe(201);
    expect(res.body.data.slotIntervalMinutes).toBe(30);
  });

  it('can be set on create and updated by the owner', async () => {
    const A = await createTenant('Alpha');
    const created = await api
      .post('/api/shops')
      .set(authHeader(A.token))
      .send({ name: 'S', slug: `slot-${unique()}`, slotIntervalMinutes: 15 });
    expect(created.body.data.slotIntervalMinutes).toBe(15);

    const updated = await api
      .patch(`/api/shops/${created.body.data.id}`)
      .set(authHeader(A.token))
      .send({ slotIntervalMinutes: 10 });
    expect(updated.status).toBe(200);
    expect(updated.body.data.slotIntervalMinutes).toBe(10);
  });

  it.each([0, 5, 25, 45, 60, -15, 'abc'])(
    'rejects %s with 400',
    async (bad) => {
      const A = await createTenant('Alpha');
      const res = await api
        .patch(`/api/shops/${A.shop.id}`)
        .set(authHeader(A.token))
        .send({ slotIntervalMinutes: bad });
      expect(res.status).toBe(400);
    },
  );

  it('drives the slot grid: a 15-minute shop offers :15 and :45 starts', async () => {
    const A = await createTenant('Alpha');
    await addWeeklySchedule(A);
    await api
      .patch(`/api/shops/${A.shop.id}`)
      .set(authHeader(A.token))
      .send({ slotIntervalMinutes: 15 });
    const res = await api.get(
      `/public/${A.shop.slug}/slots?date=2026-12-08&serviceId=${A.service.id}&staffId=${A.staff.id}`,
    );
    const times = (res.body.data.slots as { time: string }[]).map(
      (s) => s.time,
    );
    expect(times).toContain('09:15');
    expect(times).toContain('09:45');
  });
});
