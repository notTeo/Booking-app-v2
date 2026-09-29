import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import app from '../app';
import { prisma } from '../utils/prisma';
import {
  addWeeklySchedule,
  authHeader,
  createTenant,
  type Tenant,
} from './helpers';

vi.mock('../services/email.service', () => ({
  sendBookingConfirmationEmail: vi.fn().mockResolvedValue(undefined),
  sendNewBookingNotificationEmail: vi.fn().mockResolvedValue(undefined),
  sendCancellationConfirmationEmail: vi.fn().mockResolvedValue(undefined),
}));

// Frozen clock (setup.ts): 2026-12-01T09:00Z = 11:00 Athens, a Tuesday.
// Default shop: Europe/Athens, hours 09:00–13:00 daily, 30-minute service.
const SLOT = '2026-12-08T10:00:00+02:00';

async function shop() {
  const t = await createTenant('FieldValidation');
  await addWeeklySchedule(t);
  return t;
}

let phone = 6900000200;
const nextPhone = () => String(++phone);

const validBody = (t: Tenant, extra: object = {}) => ({
  name: 'Cust',
  phone: nextPhone(),
  serviceId: t.service.id,
  staffId: t.staff.id,
  startTime: SLOT,
  ...extra,
});

const pub = (t: Tenant, extra: object = {}) =>
  request(app).post(`/public/${t.shop.slug}/book`).send(validBody(t, extra));

const owner = (t: Tenant, extra: object = {}) =>
  request(app)
    .post(`/api/shops/${t.shop.id}/bookings`)
    .set(authHeader(t.token))
    .send(validBody(t, extra));

describe.each([
  ['public', pub],
  ['owner/staff', owner],
])('%s booking creation: field validation (group 7)', (_label, submit) => {
  it('rejects a name over 100 characters', async () => {
    const t = await shop();
    const res = await submit(t, { name: 'x'.repeat(101) });
    expect(res.status).toBe(400);
  });

  it('accepts a name of exactly 100 characters', async () => {
    const t = await shop();
    const res = await submit(t, { name: 'x'.repeat(100) });
    expect(res.status).toBe(201);
  });

  it('rejects a phone that is not a plausible phone number', async () => {
    const t = await shop();
    const res = await submit(t, { phone: 'not a phone number' });
    expect(res.status).toBe(400);
  });

  it('rejects notes over 1000 characters', async () => {
    const t = await shop();
    const res = await submit(t, { notes: 'x'.repeat(1001) });
    expect(res.status).toBe(400);
  });

  it('accepts notes of exactly 1000 characters', async () => {
    const t = await shop();
    const res = await submit(t, { notes: 'x'.repeat(1000) });
    expect(res.status).toBe(201);
  });

  it('rejects a non-string staffId', async () => {
    const t = await shop();
    const res = await submit(t, { staffId: 12345 });
    expect(res.status).toBe(400);
  });

  it('rejects an invalid email', async () => {
    const t = await shop();
    const res = await submit(t, { email: 'not-an-email' });
    expect(res.status).toBe(400);
  });
});

describe('PATCH customer: field validation (group 7)', () => {
  async function customer(t: Tenant) {
    return prisma.customer.create({
      data: { shopId: t.shop.id, name: 'Cust', phone: nextPhone() },
    });
  }

  it('rejects a name over 100 characters', async () => {
    const t = await shop();
    const c = await customer(t);
    const res = await request(app)
      .patch(`/api/shops/${t.shop.id}/customers/${c.id}`)
      .set(authHeader(t.token))
      .send({ name: 'x'.repeat(101) });
    expect(res.status).toBe(400);
  });

  it('rejects an implausible phone', async () => {
    const t = await shop();
    const c = await customer(t);
    const res = await request(app)
      .patch(`/api/shops/${t.shop.id}/customers/${c.id}`)
      .set(authHeader(t.token))
      .send({ phone: '???' });
    expect(res.status).toBe(400);
  });

  it('rejects notes over 1000 characters', async () => {
    const t = await shop();
    const c = await customer(t);
    const res = await request(app)
      .patch(`/api/shops/${t.shop.id}/customers/${c.id}`)
      .set(authHeader(t.token))
      .send({ notes: 'x'.repeat(1001) });
    expect(res.status).toBe(400);
  });

  it('still allows clearing notes with null (unaffected by the new length check)', async () => {
    const t = await shop();
    const c = await customer(t);
    const res = await request(app)
      .patch(`/api/shops/${t.shop.id}/customers/${c.id}`)
      .set(authHeader(t.token))
      .send({ notes: null });
    expect(res.status).toBe(200);
  });
});

describe('PATCH /user/me: field validation (group 7)', () => {
  it('rejects a name over 50 characters', async () => {
    const t = await createTenant('UserName');
    const res = await request(app)
      .patch('/user/me')
      .set(authHeader(t.token))
      .send({ name: 'x'.repeat(51) });
    expect(res.status).toBe(400);
  });

  it('accepts a valid name change', async () => {
    const t = await createTenant('UserName2');
    const res = await request(app)
      .patch('/user/me')
      .set(authHeader(t.token))
      .send({ name: 'New Name' });
    expect(res.status).toBe(200);
  });
});
