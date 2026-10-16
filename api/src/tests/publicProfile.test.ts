import { describe, it, expect, vi } from 'vitest';
import sharp from 'sharp';
import app from '../app';
import { serve } from './testRequest';
import { prisma } from '../utils/prisma';
import { memoryFiles } from '../services/storage.service';
import {
  authHeader,
  createTenant,
  deviceCookie,
  deviceCookieFor,
  type Tenant,
} from './helpers';

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

// `cookie` is the browser sending the form: none is one the shop has not seen.
const submit = (
  t: Tenant,
  fields: { name?: string; phone?: string; email?: string; photoOnly?: string },
  photo?: Buffer,
  cookie = '',
) => {
  let req = api.post(`/public/${t.shop.slug}/profile`).set('Cookie', cookie);
  for (const [key, value] of Object.entries(fields))
    req = req.field(key, value);
  if (photo)
    req = req
      .field('crop', JSON.stringify(FULL))
      .attach('photo', photo, 'me.jpg');
  return req;
};

const customerOf = (t: Tenant, phone: string) =>
  prisma.customer.findFirst({
    where: { shopId: t.shop.id, phone },
    orderBy: { createdAt: 'asc' },
  });

/** The cookie a response handed the browser. */
const cookieOf = (res: { headers: Record<string, unknown> }) =>
  String(res.headers['set-cookie']).split(';')[0];

const me = (t: Tenant, cookie: string) =>
  api.get(`/public/${t.shop.slug}/me`).set('Cookie', cookie);

describe('POST /public/:slug/profile', () => {
  it('creates a customer with their photo, and the browser is that customer from then on', async () => {
    const t = await shop({ page: true, photos: true });
    const res = await submit(
      t,
      { name: 'Eleni K', phone: '694 555 0001', email: 'eleni@example.com' },
      await image(),
    );
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect(res.body.data).toEqual({ saved: true });

    const row = await customerOf(t, '+306945550001');
    expect(row).toMatchObject({ name: 'Eleni K', email: 'eleni@example.com' });
    expect(row!.photoUrl).toMatch(/^\/media\/shops\//);
    expect(memoryFiles.has(keyOf(row!.photoUrl!))).toBe(true);

    const own = await me(t, cookieOf(res));
    expect(own.status).toBe(200);
    expect(own.headers['cache-control']).toBe('no-store');
    expect(own.body.data.customer).toEqual({
      name: 'Eleni K',
      phone: '+306945550001',
      email: 'eleni@example.com',
      photoUrl: row!.photoUrl,
    });
  });

  it('lets the browser that is the customer change their name, phone, email and photo at once', async () => {
    const t = await shop({ page: true, photos: true });
    const first = await submit(
      t,
      { name: 'Old Name', phone: '+306945550002', email: 'old@example.com' },
      await image(),
    );
    const cookie = cookieOf(first);
    const before = (await customerOf(t, '+306945550002'))!;

    const res = await submit(
      t,
      { name: 'New Name', phone: '694 555 0099' },
      await image('#aa3366'),
      cookie,
    );
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect(res.body).toEqual(first.body);

    const after = await prisma.customer.findUniqueOrThrow({
      where: { id: before.id },
    });
    // An email left empty is an email taken off.
    expect(after).toMatchObject({
      name: 'New Name',
      phone: '+306945550099',
      email: null,
    });
    expect(after.photoUrl).not.toBe(before.photoUrl);
    expect(memoryFiles.has(keyOf(after.photoUrl!))).toBe(true);
    expect(memoryFiles.has(keyOf(before.photoUrl!))).toBe(false);
    expect(await prisma.customer.count({ where: { shopId: t.shop.id } })).toBe(
      1,
    );
  });

  it('makes another browser a new customer, even with a phone the shop has: the first is not touched', async () => {
    const t = await shop({ page: true, photos: true });
    const existing = await prisma.customer.create({
      data: {
        shopId: t.shop.id,
        name: 'Real Name',
        phone: '+306945550003',
        email: 'real@example.com',
      },
    });

    const res = await submit(
      t,
      { name: 'Someone', phone: '+306945550003', email: 'other@example.com' },
      await image(),
      deviceCookie(),
    );
    expect(res.status).toBe(200);

    expect(
      await prisma.customer.findUniqueOrThrow({ where: { id: existing.id } }),
    ).toMatchObject({
      name: 'Real Name',
      email: 'real@example.com',
      photoUrl: null,
    });
    const rows = await prisma.customer.findMany({
      where: { shopId: t.shop.id, phone: '+306945550003' },
      orderBy: { name: 'asc' },
    });
    expect(rows.map((c) => c.name)).toEqual(['Real Name', 'Someone']);
    expect((await me(t, cookieOf(res))).body.data.customer.name).toBe(
      'Someone',
    );
  });

  it('the booking wizard’s photo-only call sets the photo of the customer this browser is, and nothing else', async () => {
    const t = await shop({ photos: true });
    const customer = await prisma.customer.create({
      data: { shopId: t.shop.id, name: 'Booked', phone: '+306945550005' },
    });
    const cookie = await deviceCookieFor(t.shop.id, customer.id);
    // A booking for a friend (another phone): the photo is not this customer's.
    const friend = await submit(
      t,
      { name: 'Friend', phone: '+306945550006', photoOnly: 'true' },
      await image(),
      cookie,
    );
    // A browser the shop has not seen: nobody to give it to, and nobody is created.
    const stranger = await submit(
      t,
      { name: 'Stranger', phone: '+306945550005', photoOnly: 'true' },
      await image(),
      deviceCookie(),
    );
    expect(friend.status).toBe(200);
    expect(stranger.body).toEqual(friend.body);
    expect((await customerOf(t, '+306945550005'))!.photoUrl).toBeNull();

    const own = await submit(
      t,
      { name: 'Typed Differently', phone: '+306945550005', photoOnly: 'true' },
      await image(),
      cookie,
    );
    expect(own.body).toEqual(friend.body);
    const after = (await customerOf(t, '+306945550005'))!;
    expect(after.photoUrl).toMatch(/^\/media\/shops\//);
    expect(after.name).toBe('Booked');
    expect(await prisma.customer.count({ where: { shopId: t.shop.id } })).toBe(
      1,
    );
  });

  it('ignores a photo when the shop has not enabled customer photos', async () => {
    const t = await shop({ page: true });
    const res = await submit(
      t,
      { name: 'No Photo', phone: '+306945550004' },
      await image(),
    );
    expect(res.status).toBe(200);
    expect((await customerOf(t, '+306945550004'))!.photoUrl).toBeNull();
  });

  it('is 404 when the shop has both settings off, is inactive, or does not exist', async () => {
    const off = await shop({});
    expect(
      (await submit(off, { name: 'A', phone: '+306945550007' })).status,
    ).toBe(404);
    expect(await customerOf(off, '+306945550007')).toBeNull();

    const inactive = await shop({ page: true });
    await prisma.shop.update({
      where: { id: inactive.shop.id },
      data: { isActive: false },
    });
    expect(
      (await submit(inactive, { name: 'A', phone: '+306945550007' })).status,
    ).toBe(404);

    const res = await api
      .post('/public/no-such-shop/profile')
      .field('name', 'A')
      .field('phone', '+306945550007');
    expect(res.status).toBe(404);
  });

  it('refuses a locked shop', async () => {
    const t = await shop({ page: true });
    await prisma.shop.update({
      where: { id: t.shop.id },
      data: { subscriptionStatus: 'INACTIVE' },
    });
    const res = await submit(t, { name: 'A', phone: '+306945550008' });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('SHOP_LOCKED');
  });

  it('validates the form and the file', async () => {
    const t = await shop({ page: true, photos: true });
    expect((await submit(t, { phone: '+306945550009' })).status).toBe(400);
    expect((await submit(t, { name: 'A', phone: 'nope' })).status).toBe(400);
    expect(
      (await submit(t, { name: 'A', phone: '+306945550009', email: 'x' }))
        .status,
    ).toBe(400);
    const notAnImage = await submit(
      t,
      { name: 'A', phone: '+306945550009' },
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

describe('GET /public/:slug/me', () => {
  it('is nobody for a browser the shop has not seen, and a customer of one shop is nobody at another', async () => {
    const t = await shop({ page: true });
    const other = await shop({ page: true });
    const res = await submit(t, { name: 'Mine', phone: '+306945550030' });
    const cookie = cookieOf(res);

    expect((await me(t, cookie)).body.data.customer).toMatchObject({
      name: 'Mine',
    });
    for (const [where, from] of [
      [t, ''],
      [t, deviceCookie()],
      [t, 'customerKey=nonsense'],
      [other, cookie],
    ] as const) {
      const nobody = await me(where, from);
      expect(nobody.status).toBe(200);
      expect(nobody.body.data).toEqual({ customer: null });
    }
    expect(
      (await me({ ...t, shop: { ...t.shop, slug: 'no-such-shop' } }, cookie))
        .status,
    ).toBe(404);
  });

  it('follows a merge: the browser of the record merged away is the customer that stays', async () => {
    const t = await shop({ page: true });
    const older = await prisma.customer.create({
      data: { shopId: t.shop.id, name: 'Older', phone: '+306945550031' },
    });
    const res = await submit(t, { name: 'Newer', phone: '+306945550031' });
    const newer = (await prisma.customer.findFirstOrThrow({
      where: { shopId: t.shop.id, name: 'Newer' },
    }))!;

    const merged = await api
      .post(`/api/shops/${t.shop.id}/customers/${older.id}/merge`)
      .set(authHeader(t.token))
      .send({ sourceCustomerId: newer.id });
    expect(merged.status, JSON.stringify(merged.body)).toBe(200);

    expect((await me(t, cookieOf(res))).body.data.customer).toMatchObject({
      name: 'Older',
      phone: '+306945550031',
    });
  });
});
