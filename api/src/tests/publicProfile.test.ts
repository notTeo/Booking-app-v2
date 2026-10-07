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
  fields: { name?: string; phone?: string; email?: string; newPhone?: string },
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

  it('never changes an existing customer: what differs waits as a change request, and the answer is the same', async () => {
    const t = await shop({ page: true, photos: true });
    await submit(t, { name: 'Real Name', phone: '6945550002' }, await image());
    const before = await customerOf(t, '6945550002');

    const res = await submit(
      t,
      {
        name: 'New Name',
        phone: '6945550002',
        email: 'new@example.com',
        newPhone: '694 555 0099',
      },
      await image('#aa3333'),
    );
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ saved: true });

    const after = await customerOf(t, '6945550002');
    expect(after).toMatchObject({
      name: 'Real Name',
      email: null,
      phone: '6945550002',
      photoUrl: before!.photoUrl,
    });
    const request = await prisma.customerChangeRequest.findUniqueOrThrow({
      where: { customerId: after!.id },
    });
    expect(request).toMatchObject({
      name: 'New Name',
      email: 'new@example.com',
      phone: '6945550099',
    });
    expect(request.photoUrl).not.toBe(before!.photoUrl);
    expect(memoryFiles.has(keyOf(request.photoUrl!))).toBe(true);
  });

  it('keeps one request per customer: a newer one replaces it and its photo', async () => {
    const t = await shop({ page: true, photos: true });
    await submit(t, { name: 'Real', phone: '6945550012' }, await image());
    await submit(t, { name: 'First', phone: '6945550012' }, await image());
    const customer = await customerOf(t, '6945550012');
    const first = await prisma.customerChangeRequest.findUniqueOrThrow({
      where: { customerId: customer!.id },
    });

    await submit(t, { name: 'Second', phone: '6945550012' });
    const second = await prisma.customerChangeRequest.findUniqueOrThrow({
      where: { customerId: customer!.id },
    });
    expect(second).toMatchObject({ name: 'Second', photoUrl: null });
    expect(memoryFiles.has(keyOf(first.photoUrl!))).toBe(false);
    expect(await prisma.customerChangeRequest.count()).toBeGreaterThan(0);
  });

  it('asks for nothing when what was entered is what the shop already has', async () => {
    const t = await shop({ page: true });
    await prisma.customer.create({
      data: {
        shopId: t.shop.id,
        name: 'Same',
        phone: '6945550013',
        email: 'Same@Example.com',
      },
    });
    await submit(t, {
      name: 'Same',
      phone: '6945550013',
      email: 'same@example.com',
    });
    const customer = await customerOf(t, '6945550013');
    expect(
      await prisma.customerChangeRequest.findUnique({
        where: { customerId: customer!.id },
      }),
    ).toBeNull();
  });

  it('the booking wizard’s photo-only call never asks to rename the customer', async () => {
    const t = await shop({ page: true, photos: true });
    await prisma.customer.create({
      data: {
        shopId: t.shop.id,
        name: 'Maria Papadopoulou',
        phone: '6945550014',
      },
    });
    const res = await api
      .post(`/public/${t.shop.slug}/profile`)
      .field('name', 'Maria')
      .field('phone', '6945550014')
      .field('photoOnly', 'true')
      .field('crop', JSON.stringify(FULL))
      .attach('photo', await image(), 'me.jpg');
    expect(res.status).toBe(200);
    const customer = await customerOf(t, '6945550014');
    expect(customer!.photoUrl).toBeTruthy();
    expect(customer!.name).toBe('Maria Papadopoulou');
    expect(
      await prisma.customerChangeRequest.findUnique({
        where: { customerId: customer!.id },
      }),
    ).toBeNull();
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

describe('deciding on a customer’s own changes', () => {
  const customersUrl = (t: Tenant) => `/api/shops/${t.shop.id}/customers`;

  async function withRequest(phone: string) {
    const t = await shop({ page: true, photos: true });
    await submit(t, { name: 'Old Name', phone }, await image());
    await submit(
      t,
      {
        name: 'New Name',
        phone,
        email: 'new@example.com',
        newPhone: '6945559999',
      },
      await image('#aa3333'),
    );
    const customer = (await customerOf(t, phone))!;
    const request = await prisma.customerChangeRequest.findUniqueOrThrow({
      where: { customerId: customer.id },
    });
    return { t, customer, request };
  }

  it('shows the request to the owner and managers only, and flags it in the list', async () => {
    const { t, customer } = await withRequest('6945550020');
    const manager = await addManager(t);
    const staff = await createStaffMember(t);

    const forManager = await api
      .get(`${customersUrl(t)}/${customer.id}`)
      .set(authHeader(manager.token));
    expect(forManager.body.data.changeRequest).toMatchObject({
      name: 'New Name',
      email: 'new@example.com',
      phone: '6945559999',
    });
    expect(forManager.body.data.changeRequest.photoUrl).toBeTruthy();

    const forStaff = await api
      .get(`${customersUrl(t)}/${customer.id}`)
      .set(authHeader(staff.token));
    expect(forStaff.body.data.changeRequest).toBeNull();

    const list = await api.get(customersUrl(t)).set(authHeader(t.token));
    expect(list.body.data.pendingChangesCount).toBe(1);
    expect(list.body.data.items[0].hasPendingChanges).toBe(true);
    const staffList = await api
      .get(customersUrl(t))
      .set(authHeader(staff.token));
    expect(staffList.body.data.pendingChangesCount).toBe(0);
    expect(staffList.body.data.items[0].hasPendingChanges).toBe(false);

    await prisma.customer.create({
      data: { shopId: t.shop.id, name: 'Other', phone: '6945550021' },
    });
    const filtered = await api
      .get(`${customersUrl(t)}?pendingChanges=true`)
      .set(authHeader(t.token));
    expect(filtered.body.data.items.map((c: { id: string }) => c.id)).toEqual([
      customer.id,
    ]);
  });

  it('accepting applies every change and drops the replaced photo', async () => {
    const { t, customer, request } = await withRequest('6945550022');
    const staff = await createStaffMember(t);
    const url = `${customersUrl(t)}/${customer.id}/change-request/accept`;
    expect((await api.post(url).set(authHeader(staff.token))).status).toBe(403);

    const res = await api.post(url).set(authHeader(t.token));
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect(res.body.data).toMatchObject({
      name: 'New Name',
      email: 'new@example.com',
      phone: '6945559999',
      photoUrl: request.photoUrl,
      changeRequest: null,
    });
    expect(memoryFiles.has(keyOf(customer.photoUrl!))).toBe(false);
    expect(memoryFiles.has(keyOf(request.photoUrl!))).toBe(true);
    expect((await api.post(url).set(authHeader(t.token))).status).toBe(404);
  });

  it('rejecting leaves the customer alone and removes the offered photo', async () => {
    const { t, customer, request } = await withRequest('6945550023');
    const res = await api
      .delete(`${customersUrl(t)}/${customer.id}/change-request`)
      .set(authHeader(t.token));
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      name: 'Old Name',
      phone: '6945550023',
      email: null,
      photoUrl: customer.photoUrl,
      changeRequest: null,
    });
    expect(memoryFiles.has(keyOf(request.photoUrl!))).toBe(false);
    expect(memoryFiles.has(keyOf(customer.photoUrl!))).toBe(true);
  });

  it('refuses a new phone number that another customer already has', async () => {
    const { t, customer } = await withRequest('6945550024');
    const other = await prisma.customer.create({
      data: { shopId: t.shop.id, name: 'Taken', phone: '6945559999' },
    });
    const res = await api
      .post(`${customersUrl(t)}/${customer.id}/change-request/accept`)
      .set(authHeader(t.token));
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('CUSTOMER_EXISTS');
    expect(res.body.customerId).toBe(other.id);
    // Nothing was applied, and the request is still there to reject.
    expect((await customerOf(t, '6945550024'))!.name).toBe('Old Name');
    expect(
      await prisma.customerChangeRequest.count({
        where: { customerId: customer.id },
      }),
    ).toBe(1);
  });

  it('deleting the customer removes the offered photo too', async () => {
    const { t, customer, request } = await withRequest('6945550025');
    await api
      .delete(`${customersUrl(t)}/${customer.id}`)
      .set(authHeader(t.token));
    expect(memoryFiles.has(keyOf(request.photoUrl!))).toBe(false);
  });
});
