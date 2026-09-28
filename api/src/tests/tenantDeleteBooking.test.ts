import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import app from '../app';
import { prisma } from '../utils/prisma';
import {
  authHeader,
  createBookingRow,
  createStaffMember,
  createTenant,
} from './helpers';

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

  it('lets the shop owner hard-delete a booking', async () => {
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

describe('booking permissions by role', () => {
  it('forbids a staff member from hard-deleting a booking (403)', async () => {
    const A = await createTenant('Alpha');
    const staffer = await createStaffMember(A);
    const booking = await createBookingRow(A);

    const res = await request(app)
      .delete(`/api/shops/${A.shop.id}/bookings/${booking.id}`)
      .set(authHeader(staffer.token));

    expect(res.status).toBe(403);
    expect(
      await prisma.booking.findUnique({ where: { id: booking.id } }),
    ).not.toBeNull();
  });

  it('lets a staff member change status, including cancel', async () => {
    const A = await createTenant('Alpha');
    const staffer = await createStaffMember(A);
    const booking = await createBookingRow(A);

    const res = await request(app)
      .patch(`/api/shops/${A.shop.id}/bookings/${booking.id}/status`)
      .set(authHeader(staffer.token))
      .send({ status: 'CANCELED' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('CANCELED');
  });
});
