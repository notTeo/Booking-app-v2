import { describe, it, expect } from 'vitest';
import app from '../app';
import { serve } from './testRequest';
import { prisma } from '../utils/prisma';
import {
  authHeader,
  createBookingRow,
  createTenant,
  type Tenant,
} from './helpers';

const api = await serve(app);

const STATUSES = [
  'COMPLETED',
  'COMPLETED',
  'COMPLETED',
  'CONFIRMED',
  'PENDING',
  'CANCELED',
  'CANCELED',
  'NO_SHOW',
  'COMPLETED',
  'COMPLETED',
  'COMPLETED',
  'CONFIRMED',
] as const;

// One customer with twelve bookings, a day apart, oldest first.
async function setup() {
  const t = await createTenant('History');
  const first = await createBookingRow(
    t,
    '2027-03-01T09:00:00.000Z',
    STATUSES[0],
  );
  for (const [i, status] of STATUSES.entries()) {
    if (i === 0) continue;
    const startTime = new Date(Date.UTC(2027, 2, 1 + i, 9));
    await prisma.booking.create({
      data: {
        shopId: t.shop.id,
        customerId: first.customerId,
        serviceId: t.service.id,
        staffId: t.staff.id,
        startTime,
        endTime: new Date(startTime.getTime() + 30 * 60 * 1000),
        status,
      },
    });
  }
  return { t, customerId: first.customerId };
}

const url = (t: Tenant, customerId: string, suffix = '') =>
  `/api/shops/${t.shop.id}/customers/${customerId}${suffix}`;

describe('GET /api/shops/:shopId/customers/:customerId/bookings', () => {
  it('pages through the whole history, newest first, ten at a time', async () => {
    const { t, customerId } = await setup();

    const first = await api
      .get(url(t, customerId, '/bookings'))
      .set(authHeader(t.token));
    expect(first.status).toBe(200);
    expect(first.body.data).toMatchObject({ total: 12, page: 1, limit: 10 });
    expect(first.body.data.items).toHaveLength(10);
    expect(first.body.data.items[0].startTime).toBe('2027-03-12T09:00:00.000Z');
    expect(first.body.data.items[0]).toMatchObject({
      status: 'CONFIRMED',
      service: { name: 'Cut' },
      staff: { name: 'History' },
    });

    const second = await api
      .get(url(t, customerId, '/bookings?page=2'))
      .set(authHeader(t.token));
    expect(
      second.body.data.items.map((b: { startTime: string }) => b.startTime),
    ).toEqual(['2027-03-02T09:00:00.000Z', '2027-03-01T09:00:00.000Z']);
    // internal token must never leave through the history
    expect(JSON.stringify(first.body)).not.toContain('cancelToken');
  });

  it("404s for another shop's customer, and rejects a page size over 50", async () => {
    const { t, customerId } = await setup();
    const other = await createTenant('Other');

    const wrongShop = await api
      .get(`/api/shops/${other.shop.id}/customers/${customerId}/bookings`)
      .set(authHeader(other.token));
    expect(wrongShop.status).toBe(404);

    const tooBig = await api
      .get(url(t, customerId, '/bookings?limit=51'))
      .set(authHeader(t.token));
    expect(tooBig.status).toBe(400);
  });
});

describe('GET /api/shops/:shopId/customers/:customerId', () => {
  it('returns lifetime totals by status, with canceled left out of `all`', async () => {
    const { t, customerId } = await setup();

    const res = await api.get(url(t, customerId)).set(authHeader(t.token));

    expect(res.status).toBe(200);
    expect(res.body.data.totals).toEqual({
      all: 10,
      pending: 1,
      confirmed: 2,
      completed: 6,
      canceled: 2,
      noShow: 1,
    });
    expect(res.body.data.totalVisits).toBe(6);
  });
});
