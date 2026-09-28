import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import app from '../app';
import { prisma } from '../utils/prisma';
import { authHeader, createTenant, unique } from './helpers';

vi.mock('../services/email.service');

describe('POST /api/shops — only whitelisted fields are accepted', () => {
  it('ignores isActive, id, createdAt and nested relation writes', async () => {
    const A = await createTenant('Alpha');
    const slug = `mass-${unique()}`;

    const res = await request(app)
      .post('/api/shops')
      .set(authHeader(A.token))
      .send({
        name: 'Mass Shop',
        slug,
        isActive: false,
        id: 'attacker-chosen-id',
        createdAt: '2000-01-01T00:00:00.000Z',
        services: { create: { name: 'injected', duration: 1, price: 0 } },
      });

    expect(res.status).toBe(201);
    expect(res.body.data.isActive).toBe(true);
    expect(res.body.data.id).not.toBe('attacker-chosen-id');
    expect(new Date(res.body.data.createdAt).getFullYear()).toBeGreaterThan(
      2000,
    );
    expect(
      await prisma.service.count({ where: { shopId: res.body.data.id } }),
    ).toBe(0);
  });

  it('accepts validated-but-unstored fields (lat/lng/placeId) without erroring', async () => {
    const A = await createTenant('Alpha');

    const res = await request(app)
      .post('/api/shops')
      .set(authHeader(A.token))
      .send({
        name: 'Geo Shop',
        slug: `geo-${unique()}`,
        lat: 37.98,
        lng: 23.72,
        placeId: 'abc',
      });

    expect(res.status).toBe(201);
  });

  it('stores every whitelisted field', async () => {
    const A = await createTenant('Alpha');

    const res = await request(app)
      .post('/api/shops')
      .set(authHeader(A.token))
      .send({
        name: 'Full Shop',
        slug: `full-${unique()}`,
        description: 'desc',
        phone: '2100000000',
        formattedAddress: 'Athens',
        timezone: 'Europe/Athens',
      });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      name: 'Full Shop',
      description: 'desc',
      phone: '2100000000',
      formattedAddress: 'Athens',
      timezone: 'Europe/Athens',
    });
  });
});

describe('PATCH /api/shops/:id — only whitelisted fields are accepted', () => {
  it('ignores slug, id and createdAt', async () => {
    const A = await createTenant('Alpha');

    const res = await request(app)
      .patch(`/api/shops/${A.shop.id}`)
      .set(authHeader(A.token))
      .send({
        name: 'Renamed',
        slug: `hijack-${unique()}`,
        id: 'other-id',
        createdAt: '2000-01-01T00:00:00.000Z',
      });

    expect(res.status).toBe(200);
    const after = await prisma.shop.findUnique({ where: { id: A.shop.id } });
    expect(after?.name).toBe('Renamed');
    expect(after?.slug).toBe(A.shop.slug);
    expect(after?.id).toBe(A.shop.id);
    expect(after?.createdAt.toISOString()).toBe(A.shop.createdAt.toISOString());
  });

  it('cannot smuggle nested relation writes (members/services deleteMany)', async () => {
    const A = await createTenant('Alpha');

    await request(app)
      .patch(`/api/shops/${A.shop.id}`)
      .set(authHeader(A.token))
      .send({
        name: 'Still Here',
        members: { deleteMany: {} },
        services: { deleteMany: {} },
      });

    expect(await prisma.userShop.count({ where: { shopId: A.shop.id } })).toBe(
      1,
    );
    expect(await prisma.service.count({ where: { shopId: A.shop.id } })).toBe(
      1,
    );
  });

  it('ignores lat/lng/placeId instead of failing with a 500', async () => {
    const A = await createTenant('Alpha');

    const res = await request(app)
      .patch(`/api/shops/${A.shop.id}`)
      .set(authHeader(A.token))
      .send({ name: 'Geo', lat: 1, lng: 2, placeId: 'x' });

    expect(res.status).toBe(200);
  });

  it('still lets the owner update every whitelisted field, including isActive', async () => {
    const A = await createTenant('Alpha');

    const res = await request(app)
      .patch(`/api/shops/${A.shop.id}`)
      .set(authHeader(A.token))
      .send({
        name: 'N',
        description: 'd',
        phone: '1',
        formattedAddress: 'a',
        timezone: 'Europe/Athens',
        isActive: false,
      });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      name: 'N',
      description: 'd',
      phone: '1',
      formattedAddress: 'a',
      isActive: false,
    });
  });
});
