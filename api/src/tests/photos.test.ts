import { describe, it, expect, vi } from 'vitest';
import sharp from 'sharp';
import app from '../app';
import { serve } from './testRequest';
import { prisma } from '../utils/prisma';
import { memoryFiles } from '../services/storage.service';
import {
  addManager,
  authHeader,
  createStaffMember,
  createTenant,
  type Tenant,
} from './helpers';

vi.mock('../services/email.service');

const api = await serve(app);

const image = (
  width = 1200,
  height = 800,
  format: 'jpeg' | 'png' | 'webp' | 'gif' | 'tiff' = 'jpeg',
) =>
  sharp({
    create: { width, height, channels: 3, background: '#3366cc' },
  })
    .toFormat(format)
    .toBuffer();

const FULL = { x: 0, y: 0, width: 1, height: 1 };

const upload = (
  url: string,
  token: string,
  file: Buffer | null,
  crop: object = FULL,
  filename = 'photo.jpg',
) => {
  const req = api
    .put(url)
    .set(authHeader(token))
    .field('crop', JSON.stringify(crop));
  return file ? req.attach('photo', file, filename) : req;
};

const shopPhoto = (t: Tenant) => `/api/shops/${t.shop.id}/photo`;
const memberPhoto = (t: Tenant, memberId = t.staff.id) =>
  `/api/shops/${t.shop.id}/team/${memberId}/photo`;

const keyOf = (url: string) => url.replace('/media/', '');
const sizeOf = async (url: string) => {
  const meta = await sharp(memoryFiles.get(keyOf(url))!).metadata();
  return { width: meta.width, height: meta.height, format: meta.format };
};

describe('shop photo', () => {
  it('stores a resized wide photo and only its URL in the database', async () => {
    const t = await createTenant('Photo');
    const res = await upload(shopPhoto(t), t.token, await image(3000, 2000));
    expect(res.status, JSON.stringify(res.body)).toBe(200);

    const { photoUrl, photoOriginalUrl, photoCrop } = res.body.data;
    expect(photoUrl).toMatch(
      new RegExp(`^/media/shops/${t.shop.id}/shop-[a-f0-9]+\\.webp$`),
    );
    expect(photoCrop).toEqual(FULL);
    expect(await sizeOf(photoUrl)).toEqual({
      width: 1600,
      height: 900,
      format: 'webp',
    });
    // The original is kept for re-editing, scaled down to 2048 on its long side.
    expect(await sizeOf(photoOriginalUrl)).toEqual({
      width: 2048,
      height: 1365,
      format: 'webp',
    });

    const row = await prisma.shop.findUniqueOrThrow({
      where: { id: t.shop.id },
    });
    expect(row.photoUrl).toBe(photoUrl);
  });

  it('follows the shop-settings permission', async () => {
    const t = await createTenant('Photo');
    const staff = await createStaffMember(t);
    const limited = await addManager(t, 'Limited', {
      canEditShopSettings: false,
    });
    const manager = await addManager(t, 'Full');
    const file = await image();

    expect((await upload(shopPhoto(t), staff.token, file)).status).toBe(403);
    expect((await upload(shopPhoto(t), limited.token, file)).status).toBe(403);
    expect(
      (await api.delete(shopPhoto(t)).set(authHeader(staff.token))).status,
    ).toBe(403);
    expect(memoryFiles.size).toBe(0);
    expect((await upload(shopPhoto(t), manager.token, file)).status).toBe(200);
  });

  it('accepts JPEG, PNG and WebP, and judges the file by its content', async () => {
    const t = await createTenant('Photo');
    for (const format of ['jpeg', 'png', 'webp'] as const) {
      const res = await upload(
        shopPhoto(t),
        t.token,
        await image(800, 600, format),
      );
      expect(res.status, format).toBe(200);
    }
    // A PNG named .jpg is still a fine image.
    expect(
      (
        await upload(
          shopPhoto(t),
          t.token,
          await image(800, 600, 'png'),
          FULL,
          'x.jpg',
        )
      ).status,
    ).toBe(200);

    const before = (
      await prisma.shop.findUniqueOrThrow({ where: { id: t.shop.id } })
    ).photoUrl;
    const refused = [
      [await image(800, 600, 'gif'), 'photo.jpg'],
      [await image(800, 600, 'tiff'), 'photo.png'],
      [Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'), 'photo.png'],
      [Buffer.from('just some text'), 'photo.png'],
    ] as const;
    for (const [file, name] of refused) {
      const res = await upload(shopPhoto(t), t.token, file, FULL, name);
      expect(res.status, name).toBe(400);
      expect(res.body.code).toBe('PHOTO_INVALID_TYPE');
    }
    expect(
      (await prisma.shop.findUniqueOrThrow({ where: { id: t.shop.id } }))
        .photoUrl,
    ).toBe(before);
  });

  it('refuses a file over 8 MB', async () => {
    const t = await createTenant('Photo');
    const res = await upload(
      shopPhoto(t),
      t.token,
      Buffer.alloc(8 * 1024 * 1024 + 1),
    );
    expect(res.status).toBe(413);
    expect(res.body.code).toBe('PHOTO_TOO_LARGE');
  });

  it('refuses a missing or impossible crop', async () => {
    const t = await createTenant('Photo');
    const file = await image();
    for (const crop of [
      { x: 0, y: 0, width: 0, height: 1 },
      { x: 0.5, y: 0, width: 0.6, height: 1 },
      { x: -0.2, y: 0, width: 1, height: 1 },
      { x: 'a', y: 0, width: 1, height: 1 },
    ]) {
      const res = await upload(shopPhoto(t), t.token, file, crop);
      expect(res.status, JSON.stringify(crop)).toBe(400);
      expect(res.body.code).toBe('PHOTO_INVALID_CROP');
    }
    const none = await api
      .put(shopPhoto(t))
      .set(authHeader(t.token))
      .attach('photo', file, 'photo.jpg');
    expect(none.status).toBe(400);
  });

  it('replacing deletes the old files; re-cropping keeps the original', async () => {
    const t = await createTenant('Photo');
    const first = (await upload(shopPhoto(t), t.token, await image())).body
      .data;
    expect(memoryFiles.size).toBe(2);

    const second = (await upload(shopPhoto(t), t.token, await image(900, 900)))
      .body.data;
    expect(memoryFiles.size).toBe(2);
    expect(memoryFiles.has(keyOf(first.photoUrl))).toBe(false);
    expect(memoryFiles.has(keyOf(first.photoOriginalUrl))).toBe(false);

    // No file: a new crop of the stored original.
    const crop = { x: 0.25, y: 0.25, width: 0.5, height: 0.5 };
    const recrop = await upload(shopPhoto(t), t.token, null, crop);
    expect(recrop.status, JSON.stringify(recrop.body)).toBe(200);
    expect(recrop.body.data.photoOriginalUrl).toBe(second.photoOriginalUrl);
    expect(recrop.body.data.photoUrl).not.toBe(second.photoUrl);
    expect(recrop.body.data.photoCrop).toEqual(crop);
    expect(memoryFiles.size).toBe(2);
    expect(memoryFiles.has(keyOf(second.photoUrl))).toBe(false);
  });

  it('a re-crop without a stored photo asks for a file', async () => {
    const t = await createTenant('Photo');
    const res = await upload(shopPhoto(t), t.token, null);
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('PHOTO_REQUIRED');
  });

  it('removing clears the columns and deletes the files', async () => {
    const t = await createTenant('Photo');
    await upload(shopPhoto(t), t.token, await image());
    const res = await api.delete(shopPhoto(t)).set(authHeader(t.token));
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      photoUrl: null,
      photoOriginalUrl: null,
      photoCrop: null,
    });
    expect(memoryFiles.size).toBe(0);
  });

  it('deleting the shop deletes its files', async () => {
    const t = await createTenant('Photo');
    const other = await createTenant('Other');
    await upload(shopPhoto(t), t.token, await image());
    await upload(memberPhoto(t), t.token, await image());
    await upload(shopPhoto(other), other.token, await image());
    expect(memoryFiles.size).toBe(6);

    await api.delete(`/api/shops/${t.shop.id}`).set(authHeader(t.token));
    expect(
      [...memoryFiles.keys()].every((k) => k.includes(other.shop.id)),
    ).toBe(true);
    expect(memoryFiles.size).toBe(2);
  });

  it('a locked shop cannot upload', async () => {
    const t = await createTenant('Photo');
    await prisma.shop.update({
      where: { id: t.shop.id },
      data: { subscriptionStatus: 'INACTIVE' },
    });
    const res = await upload(shopPhoto(t), t.token, await image());
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('SHOP_LOCKED');
  });
});

describe('team member photo', () => {
  it('stores a square photo, shown on the member', async () => {
    const t = await createTenant('Photo');
    const member = await createStaffMember(t);
    const res = await upload(
      memberPhoto(t, member.staff.id),
      t.token,
      await image(1000, 1000),
    );
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect(await sizeOf(res.body.data.photoUrl)).toMatchObject({
      width: 640,
      height: 640,
    });

    const list = await api
      .get(`/api/shops/${t.shop.id}/team`)
      .set(authHeader(member.token));
    expect(
      list.body.data.find((m: { id: string }) => m.id === member.staff.id)
        .photoUrl,
    ).toBe(res.body.data.photoUrl);
  });

  it('is for the owner and managers, with the rules for editing that member', async () => {
    const t = await createTenant('Photo');
    const staff = await createStaffMember(t);
    const manager = await addManager(t, 'Mgr');
    const plain = await addManager(t, 'Plain', { canManageManagers: false });
    const file = await image();

    // Not even their own.
    expect(
      (await upload(memberPhoto(t, staff.staff.id), staff.token, file)).status,
    ).toBe(403);
    expect(
      (await upload(memberPhoto(t, staff.staff.id), plain.token, file)).status,
    ).toBe(200);
    // A manager's photo needs the manage-managers permission…
    expect(
      (await upload(memberPhoto(t, manager.staff.id), plain.token, file))
        .status,
    ).toBe(403);
    expect(
      (await upload(memberPhoto(t, plain.staff.id), manager.token, file))
        .status,
    ).toBe(200);
    // …and the owner's is the owner's alone.
    expect((await upload(memberPhoto(t), manager.token, file)).status).toBe(
      403,
    );
    expect((await upload(memberPhoto(t), t.token, file)).status).toBe(200);
  });

  it('removing a photo, or the member, deletes the files', async () => {
    const t = await createTenant('Photo');
    const a = await createStaffMember(t, 'A');
    const b = await createStaffMember(t, 'B');
    await upload(memberPhoto(t, a.staff.id), t.token, await image());
    await upload(memberPhoto(t, b.staff.id), t.token, await image());
    expect(memoryFiles.size).toBe(4);

    const removed = await api
      .delete(memberPhoto(t, a.staff.id))
      .set(authHeader(t.token));
    expect(removed.body.data.photoUrl).toBeNull();
    expect(memoryFiles.size).toBe(2);

    await api
      .delete(`/api/shops/${t.shop.id}/team/${b.staff.id}`)
      .set(authHeader(t.token));
    expect(memoryFiles.size).toBe(0);
  });

  it("another shop's member is not found", async () => {
    const t = await createTenant('Photo');
    const other = await createTenant('Other');
    const res = await upload(
      `/api/shops/${t.shop.id}/team/${other.staff.id}/photo`,
      t.token,
      await image(),
    );
    expect(res.status).toBe(404);
  });
});

describe('serving and the public page', () => {
  it('serves a stored photo to anyone, cacheable and loadable cross-origin', async () => {
    const t = await createTenant('Photo');
    const { photoUrl } = (await upload(shopPhoto(t), t.token, await image()))
      .body.data;
    const res = await api.get(photoUrl);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('image/webp');
    expect(res.headers['cache-control']).toBe(
      'public, max-age=31536000, immutable',
    );
    expect(res.headers['cross-origin-resource-policy']).toBe('cross-origin');
    expect((await sharp(res.body).metadata()).width).toBe(1600);
  });

  it('answers 404 for anything that is not a stored photo', async () => {
    for (const path of [
      '/media/shops/abc/shop-0123.webp',
      '/media/shops/abc/../../package.json',
      '/media/%2e%2e/%2e%2e/package.json',
      '/media/shops/abc/shop.png',
      '/media/',
    ]) {
      expect((await api.get(path)).status, path).toBe(404);
    }
  });

  it('the public page gets the shown photos only', async () => {
    const t = await createTenant('Photo');
    const shop = (await upload(shopPhoto(t), t.token, await image())).body.data;
    const member = (await upload(memberPhoto(t), t.token, await image())).body
      .data;

    const res = await api.get(`/public/${t.shop.slug}`);
    expect(res.body.data.photoUrl).toBe(shop.photoUrl);
    expect(res.body.data.members[0].photoUrl).toBe(member.photoUrl);
    expect(JSON.stringify(res.body.data)).not.toContain('original');
    expect(res.body.data).not.toHaveProperty('photoCrop');
  });
});
