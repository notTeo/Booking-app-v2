import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import app from '../app';
import { prisma } from '../utils/prisma';
import { authHeader, createBookingRow, createTenant } from './helpers';

vi.mock('../services/email.service');

describe('DELETE /api/shops/:shopId/bookings/:bookingId — tenant isolation', () => {
  it("does not let tenant A delete tenant B's booking", async () => {
    const A = await createTenant('Alpha');
    const B = await createTenant('Beta');
    const bBooking = await createBookingRow(B);

    const res = await request(app)
      .delete(`/api/shops/${B.shop.id}/bookings/${bBooking.id}`)
      .set(authHeader(A.token));

    expect(res.status).toBe(404);
    expect(
      await prisma.booking.findUnique({ where: { id: bBooking.id } }),
    ).not.toBeNull();
  });

  it('rejects unauthenticated deletes', async () => {
    const B = await createTenant('Beta');
    const bBooking = await createBookingRow(B);

    const res = await request(app).delete(
      `/api/shops/${B.shop.id}/bookings/${bBooking.id}`,
    );

    expect(res.status).toBe(401);
    expect(
      await prisma.booking.findUnique({ where: { id: bBooking.id } }),
    ).not.toBeNull();
  });

  it('still lets a member of the shop delete its own booking', async () => {
    const B = await createTenant('Beta');
    const bBooking = await createBookingRow(B);

    const res = await request(app)
      .delete(`/api/shops/${B.shop.id}/bookings/${bBooking.id}`)
      .set(authHeader(B.token));

    expect(res.status).toBe(200);
    expect(
      await prisma.booking.findUnique({ where: { id: bBooking.id } }),
    ).toBeNull();
  });
});
