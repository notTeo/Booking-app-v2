import { describe, it, expect, vi } from 'vitest';
import app from '../app';
import { serve } from './testRequest';
import { prisma } from '../utils/prisma';
import { addWeeklySchedule, createTenant, type Tenant } from './helpers';

const api = await serve(app);

vi.mock('../services/email.service', () => ({
  sendBookingConfirmationEmail: vi.fn().mockResolvedValue(undefined),
  sendNewBookingNotificationEmail: vi.fn().mockResolvedValue(undefined),
  sendCancellationConfirmationEmail: vi.fn().mockResolvedValue(undefined),
}));

// Frozen clock (setup.ts): 2026-12-01T09:00Z. Default shop: Europe/Athens,
// hours 09:00–13:00 daily, 30-minute service.
const FIRST = '2026-12-08T10:00:00+02:00';
const SECOND = '2026-12-08T11:00:00+02:00';

const STAFF_EMAIL = 'staff-private@example.com';

async function shop() {
  const t = await createTenant('PubResp');
  await addWeeklySchedule(t);
  await prisma.userShop.update({
    where: { id: t.staff.id },
    data: { email: STAFF_EMAIL },
  });
  return t;
}

const book = (
  t: Tenant,
  body: { name: string; phone: string; email?: string },
  startTime: string,
) =>
  api.post(`/public/${t.shop.slug}/book`).send({
    ...body,
    serviceId: t.service.id,
    staffId: t.staff.id,
    startTime,
  });

describe('POST /public/:slug/book response', () => {
  it('returns only the booking itself: its id, cancel token, status, times and lines', async () => {
    const t = await shop();
    const res = await book(
      t,
      { name: 'Nikos', phone: '6900001000', email: 'nikos@example.com' },
      FIRST,
    );
    expect(res.status).toBe(201);
    expect(Object.keys(res.body.data).sort()).toEqual([
      'cancelToken',
      'endTime',
      'id',
      'products',
      'servicePrice',
      'services',
      'startTime',
      'status',
    ]);
    expect(res.body.data.products).toEqual([]);
    expect(res.body.data.status).toBe('CONFIRMED');
    expect(new Date(res.body.data.startTime).toISOString()).toBe(
      new Date(FIRST).toISOString(),
    );
  });

  it('hands the booker their own cancel token (the link works without an email), and never the staff email', async () => {
    const t = await shop();
    const res = await book(
      t,
      { name: 'Nikos', phone: '6900001001', email: 'nikos@example.com' },
      FIRST,
    );
    expect(res.status).toBe(201);

    const stored = await prisma.booking.findUniqueOrThrow({
      where: { id: res.body.data.id },
    });
    expect(stored.cancelToken).toBeTruthy();
    expect(res.body.data.cancelToken).toBe(stored.cancelToken);
    expect(JSON.stringify(res.body)).not.toContain(STAFF_EMAIL);

    // It is the token of this booking and no other.
    const other = await book(t, { name: 'Maria', phone: '6900001009' }, SECOND);
    expect(other.body.data.cancelToken).not.toBe(stored.cancelToken);
    const canceled = await api
      .post('/public/cancel')
      .send({ token: other.body.data.cancelToken });
    expect(canceled.status, JSON.stringify(canceled.body)).toBe(200);
    expect(
      (await prisma.booking.findUniqueOrThrow({ where: { id: stored.id } }))
        .status,
    ).toBe('CONFIRMED');
  });

  it('returns no customer data, even when the phone matches an existing customer', async () => {
    const t = await shop();
    const phone = '6900001002';
    await book(
      t,
      { name: 'Existing Person', phone, email: 'existing@example.com' },
      FIRST,
    );

    const res = await book(
      t,
      { name: 'Someone Else', phone, email: 'someone@else.com' },
      SECOND,
    );
    expect(res.status).toBe(201);

    const raw = JSON.stringify(res.body);
    expect(raw).not.toContain('existing@example.com');
    expect(raw).not.toContain('Existing Person');
    expect(raw).not.toContain('someone@else.com');
    expect(raw).not.toContain(phone);
    expect(res.body.data).not.toHaveProperty('customer');
    expect(res.body.data).not.toHaveProperty('customerId');
    expect(res.body.data).not.toHaveProperty('shop');
    expect(res.body.data).not.toHaveProperty('service');
    expect(res.body.data).not.toHaveProperty('staff');
  });
});
