import { describe, it, expect, vi } from 'vitest';
import { randomUUID } from 'crypto';
import app from '../app';
import { serve } from './testRequest';
import { prisma } from '../utils/prisma';
import { createTenant, unique, type Tenant } from './helpers';
import type { BookingStatus } from '../../dist/generated/prisma';

const api = await serve(app);

vi.mock('../services/email.service', () => ({
  sendBookingConfirmationEmail: vi.fn().mockResolvedValue(undefined),
  sendNewBookingNotificationEmail: vi.fn().mockResolvedValue(undefined),
  sendCancellationConfirmationEmail: vi.fn().mockResolvedValue(undefined),
}));

// Frozen clock (setup.ts): 2026-12-01T09:00Z.
const FUTURE = '2026-12-10T09:00:00.000Z';
const PAST = '2026-11-30T09:00:00.000Z';

async function bookingWith(
  t: Tenant,
  opts: { status?: BookingStatus; start?: string } = {},
) {
  const customer = await prisma.customer.create({
    data: { shopId: t.shop.id, name: 'Cust', phone: unique() },
  });
  const startTime = new Date(opts.start ?? FUTURE);
  const cancelToken = randomUUID();
  const booking = await prisma.booking.create({
    data: {
      shopId: t.shop.id,
      customerId: customer.id,
      serviceId: t.service.id,
      staffId: t.staff.id,
      startTime,
      endTime: new Date(startTime.getTime() + 30 * 60_000),
      cancelToken,
      ...(opts.status && { status: opts.status }),
    },
  });
  return { booking, cancelToken };
}

const cancel = (token: unknown) => api.post('/public/cancel').send({ token });
const statusOf = async (id: string) =>
  (await prisma.booking.findUniqueOrThrow({ where: { id } })).status;

describe('POST /public/cancel', () => {
  it('cancels a future CONFIRMED booking', async () => {
    const t = await createTenant('CancelOk');
    const { booking, cancelToken } = await bookingWith(t);
    const res = await cancel(cancelToken);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('CANCELED');
    expect(await statusOf(booking.id)).toBe('CANCELED');
  });

  it('cancels a future PENDING booking', async () => {
    const t = await createTenant('CancelPend');
    const { booking, cancelToken } = await bookingWith(t, {
      status: 'PENDING',
    });
    const res = await cancel(cancelToken);
    expect(res.status).toBe(200);
    expect(await statusOf(booking.id)).toBe('CANCELED');
  });

  it.each([
    ['COMPLETED', 'BOOKING_COMPLETED'],
    ['NO_SHOW', 'BOOKING_NO_SHOW'],
    ['CANCELED', 'BOOKING_ALREADY_CANCELED'],
  ] as const)('rejects a %s booking with %s', async (status, code) => {
    const t = await createTenant('CancelBad');
    const { booking, cancelToken } = await bookingWith(t, { status });
    const res = await cancel(cancelToken);
    expect(res.status).toBe(409);
    expect(res.body.code).toBe(code);
    expect(await statusOf(booking.id)).toBe(status);
  });

  it('rejects a booking whose start time has passed', async () => {
    const t = await createTenant('CancelPast');
    const { booking, cancelToken } = await bookingWith(t, { start: PAST });
    const res = await cancel(cancelToken);
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('BOOKING_IN_PAST');
    expect(await statusOf(booking.id)).toBe('CONFIRMED');
  });

  it('rejects a booking starting exactly now (no grace window)', async () => {
    const t = await createTenant('CancelNow');
    const { booking, cancelToken } = await bookingWith(t, {
      start: new Date().toISOString(),
    });
    const res = await cancel(cancelToken);
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('BOOKING_IN_PAST');
    expect(await statusOf(booking.id)).toBe('CONFIRMED');
  });

  it('reports a past CANCELED booking as already canceled', async () => {
    const t = await createTenant('CancelOrder');
    const { cancelToken } = await bookingWith(t, {
      status: 'CANCELED',
      start: PAST,
    });
    const res = await cancel(cancelToken);
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('BOOKING_ALREADY_CANCELED');
  });

  it('returns 404 BOOKING_NOT_FOUND for an unknown token', async () => {
    const res = await cancel(randomUUID());
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('BOOKING_NOT_FOUND');
  });

  it.each([
    ['missing', undefined],
    ['empty', ''],
    ['not a string', 12345],
    ['an object', { $ne: null }],
    ['not a UUID', 'not-a-uuid'],
  ])('rejects a token that is %s with 400', async (_label, token) => {
    const res = await cancel(token);
    expect(res.status).toBe(400);
  });
});
