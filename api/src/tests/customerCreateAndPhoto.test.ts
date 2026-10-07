import { describe, it, expect, vi } from 'vitest';
import sharp from 'sharp';
import app from '../app';
import { serve } from './testRequest';
import { prisma } from '../utils/prisma';
import { memoryFiles } from '../services/storage.service';
import {
  addManager,
  authHeader,
  createBookingRow,
  createStaffMember,
  createTenant,
  type Tenant,
} from './helpers';

vi.mock('../services/email.service');

const api = await serve(app);

const image = () =>
  sharp({
    create: { width: 900, height: 600, channels: 3, background: '#cc6633' },
  })
    .jpeg()
    .toBuffer();

const FULL = { x: 0, y: 0, width: 1, height: 1 };
const keyOf = (url: string) => url.replace('/media/', '');

const customers = (t: Tenant) => `/api/shops/${t.shop.id}/customers`;
const create = (t: Tenant, token: string, body: object) =>
  api.post(customers(t)).set(authHeader(token)).send(body);
const setPhoto = async (t: Tenant, token: string, customerId: string) =>
  api
    .put(`${customers(t)}/${customerId}/photo`)
    .set(authHeader(token))
    .field('crop', JSON.stringify(FULL))
    .attach('photo', await image(), 'me.jpg');

describe('POST /api/shops/:shopId/customers', () => {
  it('creates a customer with a normalised phone', async () => {
    const t = await createTenant('Create');
    const res = await create(t, t.token, {
      name: ' Maria P ',
      phone: '694 123 4567',
      email: 'maria@example.com',
      notes: 'Prefers mornings',
    });
    expect(res.status, JSON.stringify(res.body)).toBe(201);
    expect(res.body.data).toMatchObject({
      name: 'Maria P',
      phone: '6941234567',
      email: 'maria@example.com',
      notes: 'Prefers mornings',
      photoUrl: null,
    });
    const row = await prisma.customer.findUniqueOrThrow({
      where: { id: res.body.data.id },
    });
    expect(row.shopId).toBe(t.shop.id);
  });

  it('answers 409 with the existing customer for a phone the shop already has', async () => {
    const t = await createTenant('Dupe');
    const first = await create(t, t.token, {
      name: 'One',
      phone: '6941234567',
    });
    const again = await create(t, t.token, {
      name: 'Two',
      phone: '694-123-4567',
    });
    expect(again.status).toBe(409);
    expect(again.body.code).toBe('CUSTOMER_EXISTS');
    expect(again.body.customerId).toBe(first.body.data.id);
    const row = await prisma.customer.findUniqueOrThrow({
      where: { id: first.body.data.id },
    });
    expect(row.name).toBe('One');
  });

  it('lets the same phone exist in two shops', async () => {
    const a = await createTenant('ShopA');
    const b = await createTenant('ShopB');
    await create(a, a.token, { name: 'Same', phone: '6941234567' });
    const res = await create(b, b.token, { name: 'Same', phone: '6941234567' });
    expect(res.status).toBe(201);
  });

  it('requires a name and a plausible phone', async () => {
    const t = await createTenant('Invalid');
    expect((await create(t, t.token, { phone: '6941234567' })).status).toBe(
      400,
    );
    expect((await create(t, t.token, { name: 'No phone' })).status).toBe(400);
    expect(
      (await create(t, t.token, { name: 'Bad', phone: 'abc' })).status,
    ).toBe(400);
  });

  it('refuses staff who may not see customer details, and non-members', async () => {
    const t = await createTenant('Perm');
    const other = await createTenant('Other');
    const staff = await createStaffMember(t);
    expect(
      (await create(t, staff.token, { name: 'Ok', phone: '6941234560' }))
        .status,
    ).toBe(201);
    await prisma.userShop.update({
      where: { id: staff.staff.id },
      data: { canViewCustomerDetails: false },
    });
    expect(
      (await create(t, staff.token, { name: 'No', phone: '6941234561' }))
        .status,
    ).toBe(403);
    expect(
      (await create(t, other.token, { name: 'No', phone: '6941234562' }))
        .status,
    ).toBe(404);
  });
});

describe('customer photo', () => {
  it('lets the owner and a manager set and remove it, and staff neither', async () => {
    const t = await createTenant('CPhoto');
    const manager = await addManager(t);
    const staff = await createStaffMember(t);
    const { customerId } = await createBookingRow(t);

    expect((await setPhoto(t, staff.token, customerId)).status).toBe(403);

    const set = await setPhoto(t, manager.token, customerId);
    expect(set.status, JSON.stringify(set.body)).toBe(200);
    const { photoUrl, photoOriginalUrl } = set.body.data;
    expect(photoUrl).toMatch(/^\/media\/shops\/.+\/customer-[a-f0-9]+\.webp$/);
    expect(memoryFiles.has(keyOf(photoUrl))).toBe(true);
    expect((await api.get(photoUrl)).status).toBe(200);

    const url = `${customers(t)}/${customerId}/photo`;
    expect((await api.delete(url).set(authHeader(staff.token))).status).toBe(
      403,
    );
    const removed = await api.delete(url).set(authHeader(t.token));
    expect(removed.status).toBe(200);
    expect(removed.body.data.photoUrl).toBeNull();
    expect(memoryFiles.has(keyOf(photoUrl))).toBe(false);
    expect(memoryFiles.has(keyOf(photoOriginalUrl))).toBe(false);
  });

  it('shows the photo on the customer list and on bookings, but not to staff who may not see customers', async () => {
    const t = await createTenant('CSee');
    const staff = await createStaffMember(t);
    const booking = await createBookingRow(t);
    const set = await setPhoto(t, t.token, booking.customerId);
    const { photoUrl } = set.body.data;

    const list = await api.get(customers(t)).set(authHeader(staff.token));
    expect(list.body.data.items[0].photoUrl).toBe(photoUrl);
    const one = await api
      .get(`/api/shops/${t.shop.id}/bookings/${booking.id}`)
      .set(authHeader(staff.token));
    expect(one.body.data.customer.photoUrl).toBe(photoUrl);

    await prisma.userShop.update({
      where: { id: staff.staff.id },
      data: { canViewCustomerDetails: false },
    });
    const hiddenList = await api.get(customers(t)).set(authHeader(staff.token));
    expect(hiddenList.body.data.items[0]).toMatchObject({
      contactHidden: true,
      photoUrl: null,
      photoOriginalUrl: null,
    });
    const hiddenOne = await api
      .get(`/api/shops/${t.shop.id}/bookings/${booking.id}`)
      .set(authHeader(staff.token));
    expect(hiddenOne.body.data.customer.photoUrl).toBeNull();
  });

  it('deletes the files with the customer', async () => {
    const t = await createTenant('CDel');
    const { customerId } = await createBookingRow(t);
    const { photoUrl, photoOriginalUrl } = (
      await setPhoto(t, t.token, customerId)
    ).body.data;
    const res = await api
      .delete(`${customers(t)}/${customerId}`)
      .set(authHeader(t.token));
    expect(res.status).toBe(204);
    expect(memoryFiles.has(keyOf(photoUrl))).toBe(false);
    expect(memoryFiles.has(keyOf(photoOriginalUrl))).toBe(false);
  });

  it('on a merge the target keeps its photo, or takes the source’s when it has none', async () => {
    const t = await createTenant('CMerge');
    const mk = (phone: string) =>
      prisma.customer.create({
        data: { shopId: t.shop.id, name: phone, phone },
      });
    const merge = (targetId: string, sourceId: string) =>
      api
        .post(`${customers(t)}/${targetId}/merge`)
        .set(authHeader(t.token))
        .send({ sourceCustomerId: sourceId });

    // Target without a photo takes the source's.
    const [a, b] = [await mk('6940000001'), await mk('6940000002')];
    const bPhoto = (await setPhoto(t, t.token, b.id)).body.data.photoUrl;
    const first = await merge(a.id, b.id);
    expect(first.status, JSON.stringify(first.body)).toBe(200);
    expect(first.body.data.photoUrl).toBe(bPhoto);
    expect(memoryFiles.has(keyOf(bPhoto))).toBe(true);

    // Target with a photo keeps it; the source's files are removed.
    const c = await mk('6940000003');
    const cPhoto = (await setPhoto(t, t.token, c.id)).body.data.photoUrl;
    const second = await merge(a.id, c.id);
    expect(second.body.data.photoUrl).toBe(bPhoto);
    expect(memoryFiles.has(keyOf(cPhoto))).toBe(false);
    expect(memoryFiles.has(keyOf(bPhoto))).toBe(true);
  });
});
