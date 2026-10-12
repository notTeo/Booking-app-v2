import { describe, it, expect, vi } from 'vitest';
import app from '../app';
import { serve } from './testRequest';
import { prisma } from '../utils/prisma';
import {
  addWeeklySchedule,
  authHeader,
  createTenant,
  type Tenant,
} from './helpers';

const api = await serve(app);

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
  api.post(`/public/${t.shop.slug}/book`).send({
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
  api.post(`/api/shops/${t.shop.id}/bookings`).set(authHeader(t.token)).send({
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
    const phone = '+306900000100';
    const res = await pub(t, phone, 'Nikos', FIRST, 'nikos@example.com');
    expect(res.status).toBe(201);

    const customer = await prisma.customer.findFirst({
      where: { shopId: t.shop.id, phone },
    });
    expect(customer?.name).toBe('Nikos');
    expect(customer?.email).toBe('nikos@example.com');
  });

  it('public: a phone the shop already has, from a browser it has not seen, is a new customer beside the first', async () => {
    const t = await shop();
    const phone = '+306900000101';
    const first = await pub(t, phone, 'Nikos', FIRST, 'nikos@example.com');
    expect(first.status).toBe(201);

    // Anyone can type a phone number: it must neither rewrite the customer it
    // belongs to nor put a booking on their record.
    const second = await pub(
      t,
      phone,
      'Someone Else',
      SECOND,
      'someone@else.com',
    );
    expect(second.status).toBe(201);

    const customers = await prisma.customer.findMany({
      where: { shopId: t.shop.id, phone },
      orderBy: { name: 'asc' },
      include: { _count: { select: { bookings: true } } },
    });
    expect(customers.map((c) => [c.name, c.email, c._count.bookings])).toEqual([
      ['Nikos', 'nikos@example.com', 1],
      ['Someone Else', 'someone@else.com', 1],
    ]);
  });

  it('public: the browser a customer booked from is that customer the next time, and a booking never changes their details', async () => {
    const t = await shop();
    const phone = '+306900000102';
    const first = await pub(t, phone, 'Nikos', FIRST, 'nikos@example.com');
    expect(first.status).toBe(201);
    const cookie = String(first.headers['set-cookie']).split(';')[0];
    expect(cookie).toMatch(/^customerKey=[\w-]{43}$/);
    expect(String(first.headers['set-cookie'])).toMatch(/HttpOnly/i);

    const again = await pub(t, phone, 'Nick', SECOND).set('Cookie', cookie);
    expect(again.status).toBe(201);

    const customers = await prisma.customer.findMany({
      where: { shopId: t.shop.id },
      include: { _count: { select: { bookings: true } } },
    });
    expect(customers.map((c) => [c.name, c.email, c._count.bookings])).toEqual([
      ['Nikos', 'nikos@example.com', 2],
    ]);
  });

  it('public: booking for someone else (another phone) or as "not you" is a new customer, and the browser stays who it was', async () => {
    const t = await shop();
    const first = await pub(t, '+306900000110', 'Parent', FIRST);
    const cookie = String(first.headers['set-cookie']).split(';')[0];

    const child = await pub(t, '+306900000111', 'Child', SECOND).set(
      'Cookie',
      cookie,
    );
    expect(child.status).toBe(201);
    const guest = await api
      .post(`/public/${t.shop.slug}/book`)
      .set('Cookie', cookie)
      .send({
        name: 'Friend',
        phone: '+306900000110',
        guest: true,
        serviceId: t.service.id,
        staffId: t.staff.id,
        startTime: '2026-12-08T12:00:00+02:00',
      });
    expect(guest.status).toBe(201);

    expect(
      (
        await prisma.customer.findMany({
          where: { shopId: t.shop.id },
          orderBy: { name: 'asc' },
        })
      ).map((c) => c.name),
    ).toEqual(['Child', 'Friend', 'Parent']);
    const me = await api.get(`/public/${t.shop.slug}/me`).set('Cookie', cookie);
    expect(me.body.data.customer).toMatchObject({
      name: 'Parent',
      phone: '+306900000110',
    });
  });

  it('owner/staff: an existing phone number still updates the customer record (unchanged, deliberate behaviour)', async () => {
    const t = await shop();
    const phone = '+306900000103';
    await owner(t, phone, 'Nikos', FIRST, 'nikos@example.com');
    const second = await owner(
      t,
      phone,
      'Corrected Name',
      SECOND,
      'corrected@example.com',
    );
    expect(second.status).toBe(201);

    const customer = await prisma.customer.findFirst({
      where: { shopId: t.shop.id, phone },
    });
    expect(customer?.name).toBe('Corrected Name');
    expect(customer?.email).toBe('corrected@example.com');
  });
});
