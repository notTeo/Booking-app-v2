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
const FIRST = '2026-12-08T10:00:00+02:00';
const SECOND = '2026-12-08T11:00:00+02:00';

async function shop() {
  const t = await createTenant('Upsert');
  await addWeeklySchedule(t);
  return t;
}

const pub = (
  t: Tenant,
  phone: string,
  name: string,
  startTime: string,
  email?: string,
) =>
  request(app).post(`/public/${t.shop.slug}/book`).send({
    name,
    phone,
    email,
    serviceId: t.service.id,
    staffId: t.staff.id,
    startTime,
  });

const owner = (
  t: Tenant,
  phone: string,
  name: string,
  startTime: string,
  email?: string,
) =>
  request(app)
    .post(`/api/shops/${t.shop.id}/bookings`)
    .set(authHeader(t.token))
    .send({
      name,
      phone,
      email,
      serviceId: t.service.id,
      staffId: t.staff.id,
      startTime,
    });

describe('customer upsert on booking creation', () => {
  it('public: a new phone number creates a new customer with the given details', async () => {
    const t = await shop();
    const phone = '6900000100';
    const res = await pub(t, phone, 'Nikos', FIRST, 'nikos@example.com');
    expect(res.status).toBe(201);

    const customer = await prisma.customer.findUnique({
      where: { shopId_phone: { shopId: t.shop.id, phone } },
    });
    expect(customer?.name).toBe('Nikos');
    expect(customer?.email).toBe('nikos@example.com');
  });

  it('public: an existing phone number is attached to the existing customer, whose name/email are left unchanged', async () => {
    const t = await shop();
    const phone = '6900000101';
    const first = await pub(t, phone, 'Nikos', FIRST, 'nikos@example.com');
    expect(first.status).toBe(201);

    // A second booking with the SAME phone but DIFFERENT name/email — the
    // customer's own record must not be overwritten by whatever a later
    // (anonymous, public) booker happens to type.
    const second = await pub(
      t,
      phone,
      'Someone Else',
      SECOND,
      'someone@else.com',
    );
    expect(second.status).toBe(201);

    const customer = await prisma.customer.findUnique({
      where: { shopId_phone: { shopId: t.shop.id, phone } },
    });
    expect(customer?.name).toBe('Nikos');
    expect(customer?.email).toBe('nikos@example.com');

    // Both bookings are attached to that one customer, not two different rows.
    const bookings = await prisma.booking.findMany({
      where: { shopId: t.shop.id, customerId: customer!.id },
    });
    expect(bookings).toHaveLength(2);
    expect(await prisma.customer.count({ where: { shopId: t.shop.id } })).toBe(
      1,
    );
  });

  it('public: a booking with no email never blanks out an email already on file', async () => {
    const t = await shop();
    const phone = '6900000102';
    await pub(t, phone, 'Nikos', FIRST, 'nikos@example.com');
    await pub(t, phone, 'Nikos', SECOND); // no email this time

    const customer = await prisma.customer.findUnique({
      where: { shopId_phone: { shopId: t.shop.id, phone } },
    });
    expect(customer?.email).toBe('nikos@example.com');
  });

  it('owner/staff: an existing phone number still updates the customer record (unchanged, deliberate behaviour)', async () => {
    const t = await shop();
    const phone = '6900000103';
    await owner(t, phone, 'Nikos', FIRST, 'nikos@example.com');
    const second = await owner(
      t,
      phone,
      'Corrected Name',
      SECOND,
      'corrected@example.com',
    );
    expect(second.status).toBe(201);

    const customer = await prisma.customer.findUnique({
      where: { shopId_phone: { shopId: t.shop.id, phone } },
    });
    expect(customer?.name).toBe('Corrected Name');
    expect(customer?.email).toBe('corrected@example.com');
  });
});
