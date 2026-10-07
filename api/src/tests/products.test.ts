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

const url = (t: Tenant, rest = '') => `/api/shops/${t.shop.id}/products${rest}`;
const create = (t: Tenant, body: object = {}, token = t.token) =>
  api
    .post(url(t))
    .set(authHeader(token))
    .send({
      name: 'Shampoo',
      price: 1250,
      stock: 4,
      description: 'Repairs dry hair',
      supplierUrl: 'https://supplier.example/shampoo',
      ...body,
    });

describe('products CRUD', () => {
  it('the owner creates, edits and deletes a product', async () => {
    const t = await createTenant('Prod');
    const made = await create(t);
    expect(made.status, JSON.stringify(made.body)).toBe(201);
    expect(made.body.data).toMatchObject({
      name: 'Shampoo',
      price: 1250,
      stock: 4,
      supplierUrl: 'https://supplier.example/shampoo',
    });
    const id = made.body.data.id;

    const edited = await api
      .patch(url(t, `/${id}`))
      .set(authHeader(t.token))
      .send({ stock: 1, name: 'Shampoo XL' });
    expect(edited.status).toBe(200);
    expect(edited.body.data).toMatchObject({
      stock: 1,
      name: 'Shampoo XL',
      price: 1250,
    });

    const list = await api.get(url(t)).set(authHeader(t.token));
    expect(list.body.data).toHaveLength(1);

    const gone = await api.delete(url(t, `/${id}`)).set(authHeader(t.token));
    expect(gone.status).toBe(200);
    expect(await prisma.product.count({ where: { shopId: t.shop.id } })).toBe(
      0,
    );
  });

  it('is for the owner and managers; staff read, without the supplier link', async () => {
    const t = await createTenant('Prod');
    const staff = await createStaffMember(t);
    const manager = await addManager(t, 'Mgr');
    const id = (await create(t)).body.data.id;

    expect((await create(t, {}, staff.token)).status).toBe(403);
    expect(
      (
        await api
          .patch(url(t, `/${id}`))
          .set(authHeader(staff.token))
          .send({ stock: 9 })
      ).status,
    ).toBe(403);
    expect(
      (await api.delete(url(t, `/${id}`)).set(authHeader(staff.token))).status,
    ).toBe(403);
    expect(
      (await create(t, { name: 'By manager' }, manager.token)).status,
    ).toBe(201);

    const asStaff = await api
      .get(url(t, `/${id}`))
      .set(authHeader(staff.token));
    expect(asStaff.status).toBe(200);
    expect(asStaff.body.data).not.toHaveProperty('supplierUrl');
    const listAsStaff = await api.get(url(t)).set(authHeader(staff.token));
    expect(JSON.stringify(listAsStaff.body)).not.toContain('supplier.example');
    const asManager = await api
      .get(url(t, `/${id}`))
      .set(authHeader(manager.token));
    expect(asManager.body.data.supplierUrl).toBe(
      'https://supplier.example/shampoo',
    );
  });

  it('validates the fields', async () => {
    const t = await createTenant('Prod');
    for (const body of [
      { name: '' },
      { price: -1 },
      { price: 1.5 },
      { stock: -1 },
      { stock: 100_001 },
      { supplierUrl: 'javascript:alert(1)' },
      { supplierUrl: 'not a url' },
      { supplierUrl: 'ftp://files.example/x' },
    ]) {
      const res = await create(t, body);
      expect(res.status, JSON.stringify(body)).toBe(400);
    }
    // An empty supplier link clears it.
    const ok = await create(t, { supplierUrl: '' });
    expect(ok.status).toBe(201);
    expect(ok.body.data.supplierUrl).toBeNull();
    const id = (await create(t)).body.data.id;
    const cleared = await api
      .patch(url(t, `/${id}`))
      .set(authHeader(t.token))
      .send({ supplierUrl: '' });
    expect(cleared.body.data.supplierUrl).toBeNull();
  });

  it("does not reach another shop's products", async () => {
    const t = await createTenant('Prod');
    const other = await createTenant('Other');
    const id = (await create(other)).body.data.id;
    expect(
      (await api.get(url(t, `/${id}`)).set(authHeader(t.token))).status,
    ).toBe(404);
    expect(
      (
        await api
          .patch(url(t, `/${id}`))
          .set(authHeader(t.token))
          .send({ stock: 0 })
      ).status,
    ).toBe(404);
    expect(
      (await api.delete(url(t, `/${id}`)).set(authHeader(t.token))).status,
    ).toBe(404);
    expect((await api.get(url(t)).set(authHeader(t.token))).body.data).toEqual(
      [],
    );
  });

  it('is on Team and Business, not Solo', async () => {
    const t = await createTenant('Prod');
    await prisma.shop.update({
      where: { id: t.shop.id },
      data: { plan: 'SOLO' },
    });
    const res = await create(t);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('PLAN_FEATURE');
    await prisma.shop.update({
      where: { id: t.shop.id },
      data: { plan: 'BUSINESS' },
    });
    expect((await create(t)).status).toBe(201);
  });

  it('a locked shop cannot change its products', async () => {
    const t = await createTenant('Prod');
    await prisma.shop.update({
      where: { id: t.shop.id },
      data: { subscriptionStatus: 'INACTIVE' },
    });
    const res = await create(t);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('SHOP_LOCKED');
  });
});

describe('product photo', () => {
  const photo = () =>
    sharp({
      create: { width: 900, height: 600, channels: 3, background: '#2a9d8f' },
    })
      .jpeg()
      .toBuffer();

  it('stores a square photo, replaces it and deletes the files with the product', async () => {
    const t = await createTenant('Prod');
    const id = (await create(t)).body.data.id;
    const put = async () =>
      api
        .put(url(t, `/${id}/photo`))
        .set(authHeader(t.token))
        .field('crop', JSON.stringify({ x: 0, y: 0, width: 0.66, height: 1 }))
        .attach('photo', await photo(), 'p.jpg');

    const first = await put();
    expect(first.status, JSON.stringify(first.body)).toBe(200);
    const key = first.body.data.photoUrl.replace('/media/', '');
    const meta = await sharp(memoryFiles.get(key)!).metadata();
    expect([meta.width, meta.height]).toEqual([640, 640]);
    expect(memoryFiles.size).toBe(2);

    await put();
    expect(memoryFiles.size).toBe(2);
    expect(memoryFiles.has(key)).toBe(false);

    await api.delete(url(t, `/${id}`)).set(authHeader(t.token));
    expect(memoryFiles.size).toBe(0);
  });

  it('only the owner and managers may change it', async () => {
    const t = await createTenant('Prod');
    const staff = await createStaffMember(t);
    const id = (await create(t)).body.data.id;
    const res = await api
      .put(url(t, `/${id}/photo`))
      .set(authHeader(staff.token))
      .field('crop', JSON.stringify({ x: 0, y: 0, width: 1, height: 1 }))
      .attach('photo', await photo(), 'p.jpg');
    expect(res.status).toBe(403);
    expect(memoryFiles.size).toBe(0);
  });
});

describe('products on the public page', () => {
  it('lists name, description, price, stock and photo, never the supplier link', async () => {
    const t = await createTenant('Prod');
    await create(t);
    const res = await api.get(`/public/${t.shop.slug}`);
    expect(res.status).toBe(200);
    expect(res.body.data.products).toEqual([
      expect.objectContaining({
        name: 'Shampoo',
        description: 'Repairs dry hair',
        price: 1250,
        stock: 4,
        photoUrl: null,
      }),
    ]);
    expect(JSON.stringify(res.body)).not.toContain('supplier');
  });

  it('leaves out a deactivated product, for customers and for staff', async () => {
    const t = await createTenant('Prod');
    const shown = await create(t);
    const hidden = await create(t, { name: 'Wax', isActive: false });
    expect(shown.body.data.isActive).toBe(true);
    expect(hidden.body.data.isActive).toBe(false);

    const names = (res: { body: { data: { products: { name: string }[] } } }) =>
      res.body.data.products.map((p) => p.name);
    expect(names(await api.get(`/public/${t.shop.slug}`))).toEqual(['Shampoo']);
    const info = () =>
      api
        .get(`/api/shops/${t.shop.id}/bookings/wizard-info`)
        .set(authHeader(t.token));
    expect(names(await info())).toEqual(['Shampoo']);

    // The shop's own list keeps it, and it can be switched back on.
    const list = await api.get(url(t)).set(authHeader(t.token));
    expect(list.body.data).toHaveLength(2);
    const on = await api
      .patch(url(t, `/${hidden.body.data.id}`))
      .set(authHeader(t.token))
      .send({ isActive: true });
    expect(on.status).toBe(200);
    expect(names(await info())).toEqual(['Shampoo', 'Wax']);

    const bad = await api
      .patch(url(t, `/${hidden.body.data.id}`))
      .set(authHeader(t.token))
      .send({ isActive: 'no' });
    expect(bad.status).toBe(400);
  });

  it('is empty on a plan without products', async () => {
    const t = await createTenant('Prod');
    await create(t);
    await prisma.shop.update({
      where: { id: t.shop.id },
      data: { plan: 'SOLO' },
    });
    const res = await api.get(`/public/${t.shop.slug}`);
    expect(res.body.data.products).toEqual([]);
  });

  it("the staff booking page's info has them too, without the supplier link", async () => {
    const t = await createTenant('Prod');
    await create(t);
    const res = await api
      .get(`/api/shops/${t.shop.id}/bookings/wizard-info`)
      .set(authHeader(t.token));
    expect(res.body.data.products).toHaveLength(1);
    expect(JSON.stringify(res.body)).not.toContain('supplier');
  });
});
