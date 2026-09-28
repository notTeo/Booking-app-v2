import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import app from '../app';
import { authHeader, createTenant, unique } from './helpers';

vi.mock('../services/email.service');

describe('shop.maxAdvanceDays (how far ahead customers may book)', () => {
  it('defaults to 60 days', async () => {
    const A = await createTenant('Alpha');
    const res = await request(app)
      .post('/api/shops')
      .set(authHeader(A.token))
      .send({ name: 'S', slug: `adv-${unique()}` });
    expect(res.status).toBe(201);
    expect(res.body.data.maxAdvanceDays).toBe(60);
  });

  it('can be set on create and updated by the owner', async () => {
    const A = await createTenant('Alpha');
    const created = await request(app)
      .post('/api/shops')
      .set(authHeader(A.token))
      .send({ name: 'S', slug: `adv-${unique()}`, maxAdvanceDays: 30 });
    expect(created.body.data.maxAdvanceDays).toBe(30);

    const updated = await request(app)
      .patch(`/api/shops/${created.body.data.id}`)
      .set(authHeader(A.token))
      .send({ maxAdvanceDays: 90 });
    expect(updated.status).toBe(200);
    expect(updated.body.data.maxAdvanceDays).toBe(90);
  });

  it.each([0, -5, 731, 1.5, 'abc'])('rejects %s with 400', async (bad) => {
    const A = await createTenant('Alpha');
    const res = await request(app)
      .patch(`/api/shops/${A.shop.id}`)
      .set(authHeader(A.token))
      .send({ maxAdvanceDays: bad });
    expect(res.status).toBe(400);
  });

  it('is exposed on the public shop endpoint so the date picker can cap itself', async () => {
    const A = await createTenant('Alpha');
    const res = await request(app).get(`/public/${A.shop.slug}`);
    expect(res.body.data.maxAdvanceDays).toBe(60);
  });
});
