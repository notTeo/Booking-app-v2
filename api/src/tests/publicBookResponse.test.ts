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
  it('returns only id, status, startTime and endTime', async () => {
    const t = await shop();
    const res = await book(
      t,
      { name: 'Nikos', phone: '6900001000', email: 'nikos@example.com' },
      FIRST,
    );
    expect(res.status).toBe(201);
    expect(Object.keys(res.body.data).sort()).toEqual([
      'endTime',
      'id',
      'startTime',
      'status',
    ]);
    expect(res.body.data.status).toBe('CONFIRMED');
    expect(new Date(res.body.data.startTime).toISOString()).toBe(
      new Date(FIRST).toISOString(),
    );
  });

  it('never exposes the cancel token or the staff email', async () => {
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
    // The token is still stored (the confirmation email needs it)…
    expect(stored.cancelToken).toBeTruthy();
    // …but nothing in the response body may contain it or the staff email.
    const raw = JSON.stringify(res.body);
    expect(raw).not.toContain(stored.cancelToken!);
    expect(raw).not.toContain('cancelToken');
    expect(raw).not.toContain(STAFF_EMAIL);
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
