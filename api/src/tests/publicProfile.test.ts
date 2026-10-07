import { describe, it, expect, vi } from 'vitest';
import sharp from 'sharp';
import app from '../app';
import { serve } from './testRequest';
import { prisma } from '../utils/prisma';
import { memoryFiles } from '../services/storage.service';
import { authHeader, createTenant, type Tenant } from './helpers';

vi.mock('../services/email.service');

const api = await serve(app);

const image = (background = '#33aa66') =>
  sharp({ create: { width: 800, height: 800, channels: 3, background } })
    .jpeg()
    .toBuffer();

const FULL = { x: 0, y: 0, width: 1, height: 1 };
const keyOf = (url: string) => url.replace('/media/', '');

async function shop(settings: {
  page?: boolean;
  photos?: boolean;
}): Promise<Tenant> {
  const t = await createTenant('Profile');
  await prisma.shop.update({
    where: { id: t.shop.id },
    data: {
      customerProfilePageEnabled: settings.page ?? false,
      customerPhotosEnabled: settings.photos ?? false,
    },
  });
  return t;
}

const submit = (
  t: Tenant,
  fields: { name?: string; phone?: string; email?: string },
  photo?: Buffer,
) => {
  let req = api.post(`/public/${t.shop.slug}/profile`);
  for (const [key, value] of Object.entries(fields))
    req = req.field(key, value);
  if (photo)
    req = req
      .field('crop', JSON.stringify(FULL))
      .attach('photo', photo, 'me.jpg');
  return req;
};

const customerOf = (t: Tenant, phone: string) =>
  prisma.customer.findUnique({
    where: { shopId_phone: { shopId: t.shop.id, phone } },
  });

describe('POST /public/:slug/profile', () => {
  it('creates a customer with their photo', async () => {
    const t = await shop({ page: true, photos: true });
    const res = await submit(
      t,
      { name: 'Eleni K', phone: '694 555 0001', email: 'eleni@example.com' },
      await image(),
    );
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect(res.body.data).toEqual({ saved: true });

    const row = await customerOf(t, '6945550001');
    expect(row).toMatchObject({ name: 'Eleni K', email: 'eleni@example.com' });
    expect(row!.photoUrl).toMatch(/^\/media\/shops\//);
    expect(memoryFiles.has(keyOf(row!.photoUrl!))).toBe(true);
  });

  it('never changes the name, email or photo of an existing customer, and answers the same', async () => {
    const t = await shop({ page: true, photos: true });
    await submit(t, { name: 'Real Name', phone: '6945550002' }, await image());
    const before = await customerOf(t, '6945550002');
    const filesBefore = memoryFiles.size;

    const res = await submit(
      t,
      { name: 'Impostor', phone: '6945550002', email: 'thief@example.com' },
      await image('#aa3333'),
    );
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ saved: true });

    const after = await customerOf(t, '6945550002');
    expect(after).toMatchObject({
      name: 'Real Name',
      email: null,
      photoUrl: before!.photoUrl,
    });
    // The refused photo was not kept in storage.
    expect(memoryFiles.size).toBe(filesBefore);
  });

  it('adds a photo to an existing customer who has none', async () => {
    const t = await shop({ page: true, photos: true });
    await prisma.customer.create({
      data: { shopId: t.shop.id, name: 'Known', phone: '6945550003' },
    });
    await submit(t, { name: 'Known', phone: '6945550003' }, await image());
    const row = await customerOf(t, '6945550003');
    expect(row!.photoUrl).toBeTruthy();
    expect(row!.name).toBe('Known');
  });

  it('ignores a photo when the shop has not enabled customer photos', async () => {
    const t = await shop({ page: true });
    const res = await submit(
      t,
      { name: 'No Photo', phone: '6945550004' },
      await image(),
    );
    expect(res.status).toBe(200);
    expect((await customerOf(t, '6945550004'))!.photoUrl).toBeNull();
  });

  it('with only photos enabled, adds a photo to a known customer but creates nobody', async () => {
    const t = await shop({ photos: true });
    await prisma.customer.create({
      data: { shopId: t.shop.id, name: 'Booked', phone: '6945550005' },
    });
    const known = await submit(
      t,
      { name: 'Booked', phone: '6945550005' },
      await image(),
    );
    const unknown = await submit(
      t,
      { name: 'Stranger', phone: '6945550006' },
      await image(),
    );
    expect(known.status).toBe(200);
    expect(unknown.status).toBe(200);
    expect(unknown.body).toEqual(known.body);
    expect((await customerOf(t, '6945550005'))!.photoUrl).toBeTruthy();
    expect(await customerOf(t, '6945550006')).toBeNull();
  });

  it('is 404 when the shop has both settings off, is inactive, or does not exist', async () => {
    const off = await shop({});
    expect((await submit(off, { name: 'A', phone: '6945550007' })).status).toBe(
      404,
    );
    expect(await customerOf(off, '6945550007')).toBeNull();

    const inactive = await shop({ page: true });
    await prisma.shop.update({
      where: { id: inactive.shop.id },
      data: { isActive: false },
    });
    expect(
      (await submit(inactive, { name: 'A', phone: '6945550007' })).status,
    ).toBe(404);

    const res = await api
      .post('/public/no-such-shop/profile')
      .field('name', 'A')
      .field('phone', '6945550007');
    expect(res.status).toBe(404);
  });

  it('refuses a locked shop', async () => {
    const t = await shop({ page: true });
    await prisma.shop.update({
      where: { id: t.shop.id },
      data: { subscriptionStatus: 'INACTIVE' },
    });
    const res = await submit(t, { name: 'A', phone: '6945550008' });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('SHOP_LOCKED');
  });

  it('validates the form and the file', async () => {
    const t = await shop({ page: true, photos: true });
    expect((await submit(t, { phone: '6945550009' })).status).toBe(400);
    expect((await submit(t, { name: 'A', phone: 'nope' })).status).toBe(400);
    expect(
      (await submit(t, { name: 'A', phone: '6945550009', email: 'x' })).status,
    ).toBe(400);
    const notAnImage = await submit(
      t,
      { name: 'A', phone: '6945550009' },
      Buffer.from('not an image'),
    );
    expect(notAnImage.status).toBe(400);
    expect(notAnImage.body.code).toBe('PHOTO_INVALID_TYPE');
  });
});

describe('the two shop settings', () => {
  it('are off by default, saved by the owner and shown on the public shop info', async () => {
    const t = await createTenant('Flags');
    const before = await api.get(`/public/${t.shop.slug}`);
    expect(before.body.data).toMatchObject({
      customerPhotosEnabled: false,
      customerProfilePageEnabled: false,
    });

    const res = await api
      .patch(`/api/shops/${t.shop.id}`)
      .set(authHeader(t.token))
      .send({ customerPhotosEnabled: true, customerProfilePageEnabled: true });
    expect(res.status, JSON.stringify(res.body)).toBe(200);

    const after = await api.get(`/public/${t.shop.slug}`);
    expect(after.body.data).toMatchObject({
      customerPhotosEnabled: true,
      customerProfilePageEnabled: true,
    });

    const bad = await api
      .patch(`/api/shops/${t.shop.id}`)
      .set(authHeader(t.token))
      .send({ customerPhotosEnabled: 'maybe' });
    expect(bad.status).toBe(400);
  });
});
