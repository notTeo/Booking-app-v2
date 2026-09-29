import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app';
import { prisma } from '../utils/prisma';
import {
  authHeader,
  createBookingRow,
  createStaffMember,
  createTenant,
} from './helpers';

const url = (t: { shop: { id: string } }, customerId: string, suffix = '') =>
  `/api/shops/${t.shop.id}/customers/${customerId}${suffix}`;

async function setup() {
  const t = await createTenant('Gdpr');
  const booking = await createBookingRow(t);
  await prisma.customer.update({
    where: { id: booking.customerId },
    data: { name: 'Maria', email: 'maria@example.com', notes: 'prefers Anna' },
  });
  return { t, customerId: booking.customerId, bookingId: booking.id };
}

describe('GET /api/shops/:shopId/customers/:customerId/export', () => {
  it('returns everything held about the customer as a JSON download', async () => {
    const { t, customerId, bookingId } = await setup();

    const res = await request(app)
      .get(url(t, customerId, '/export'))
      .set(authHeader(t.token));

    expect(res.status).toBe(200);
    expect(res.headers['content-disposition']).toContain('attachment');
    const { customer, bookings, exportedAt } = res.body.data;
    expect(exportedAt).toBeTruthy();
    expect(customer).toMatchObject({
      id: customerId,
      name: 'Maria',
      email: 'maria@example.com',
      notes: 'prefers Anna',
    });
    expect(bookings).toHaveLength(1);
    expect(bookings[0]).toMatchObject({
      id: bookingId,
      service: 'Cut',
      staff: 'Gdpr',
      status: 'CONFIRMED',
    });
    // internal token must never leave through an export
    expect(JSON.stringify(res.body)).not.toContain('cancelToken');
  });

  it('is owner-only: staff get 403 even with customer-detail access', async () => {
    const { t, customerId } = await setup();
    const staff = await createStaffMember(t);

    const res = await request(app)
      .get(url(t, customerId, '/export'))
      .set(authHeader(staff.token));

    expect(res.status).toBe(403);
  });

  it("404s for another shop's customer and for a non-member", async () => {
    const { t, customerId } = await setup();
    const other = await createTenant('Other');

    const wrongShop = await request(app)
      .get(`/api/shops/${other.shop.id}/customers/${customerId}/export`)
      .set(authHeader(other.token));
    expect(wrongShop.status).toBe(404);

    const nonMember = await request(app)
      .get(url(t, customerId, '/export'))
      .set(authHeader(other.token));
    expect(nonMember.status).toBe(404);
  });

  it('requires authentication', async () => {
    const { t, customerId } = await setup();
    const res = await request(app).get(url(t, customerId, '/export'));
    expect(res.status).toBe(401);
  });
});

describe('DELETE /api/shops/:shopId/customers/:customerId', () => {
  it('erases the customer and their bookings, and nothing else', async () => {
    const { t, customerId } = await setup();
    const keep = await createBookingRow(t, '2027-07-02T09:00:00.000Z');

    const res = await request(app)
      .delete(url(t, customerId))
      .set(authHeader(t.token));

    expect(res.status).toBe(204);
    expect(
      await prisma.customer.findUnique({ where: { id: customerId } }),
    ).toBeNull();
    expect(await prisma.booking.count({ where: { customerId } })).toBe(0);
    // another customer's booking in the same shop is untouched
    expect(
      await prisma.booking.findUnique({ where: { id: keep.id } }),
    ).not.toBeNull();
  });

  it('is owner-only: staff get 403 and nothing is deleted', async () => {
    const { t, customerId } = await setup();
    const staff = await createStaffMember(t);

    const res = await request(app)
      .delete(url(t, customerId))
      .set(authHeader(staff.token));

    expect(res.status).toBe(403);
    expect(
      await prisma.customer.findUnique({ where: { id: customerId } }),
    ).not.toBeNull();
  });

  it("cannot delete another shop's customer", async () => {
    const { customerId } = await setup();
    const other = await createTenant('Other');

    const res = await request(app)
      .delete(`/api/shops/${other.shop.id}/customers/${customerId}`)
      .set(authHeader(other.token));

    expect(res.status).toBe(404);
    expect(
      await prisma.customer.findUnique({ where: { id: customerId } }),
    ).not.toBeNull();
  });

  it('404s when already deleted', async () => {
    const { t, customerId } = await setup();
    await request(app).delete(url(t, customerId)).set(authHeader(t.token));
    const again = await request(app)
      .delete(url(t, customerId))
      .set(authHeader(t.token));
    expect(again.status).toBe(404);
  });
});
