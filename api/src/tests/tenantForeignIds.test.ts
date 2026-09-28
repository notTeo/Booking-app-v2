import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import app from '../app';
import { prisma } from '../utils/prisma';
import { authHeader, createBookingRow, createTenant } from './helpers';

vi.mock('../services/email.service');

const START = '2027-07-03T09:00:00.000Z';

describe('booking references must belong to the same shop', () => {
  it("rejects PATCH re-pointing a booking at another tenant's staff", async () => {
    const A = await createTenant('Alpha');
    const B = await createTenant('Beta');
    const aBooking = await createBookingRow(A);

    const res = await request(app)
      .patch(`/api/shops/${A.shop.id}/bookings/${aBooking.id}`)
      .set(authHeader(A.token))
      .send({ staffId: B.staff.id });

    expect(res.status).toBe(404);
    const after = await prisma.booking.findUnique({
      where: { id: aBooking.id },
    });
    expect(after?.staffId).toBe(A.staff.id);
  });

  it("rejects PATCH re-pointing a booking at another tenant's service", async () => {
    const A = await createTenant('Alpha');
    const B = await createTenant('Beta');
    const aBooking = await createBookingRow(A);

    const res = await request(app)
      .patch(`/api/shops/${A.shop.id}/bookings/${aBooking.id}`)
      .set(authHeader(A.token))
      .send({ serviceId: B.service.id });

    expect(res.status).toBe(404);
    const after = await prisma.booking.findUnique({
      where: { id: aBooking.id },
    });
    expect(after?.serviceId).toBe(A.service.id);
  });

  it("rejects PATCH combining a new time with another tenant's service", async () => {
    const A = await createTenant('Alpha');
    const B = await createTenant('Beta');
    const aBooking = await createBookingRow(A);

    const res = await request(app)
      .patch(`/api/shops/${A.shop.id}/bookings/${aBooking.id}`)
      .set(authHeader(A.token))
      .send({ serviceId: B.service.id, startTime: START });

    expect(res.status).toBe(404);
  });

  it("rejects a public booking that uses another tenant's service", async () => {
    const A = await createTenant('Alpha');
    const B = await createTenant('Beta');

    const res = await request(app).post(`/public/${A.shop.slug}/book`).send({
      name: 'X',
      phone: '6900000001',
      serviceId: B.service.id,
      staffId: A.staff.id,
      startTime: START,
    });

    expect(res.status).toBe(404);
    expect(await prisma.booking.count({ where: { shopId: A.shop.id } })).toBe(
      0,
    );
  });

  it("rejects an owner booking that uses another tenant's service", async () => {
    const A = await createTenant('Alpha');
    const B = await createTenant('Beta');

    const res = await request(app)
      .post(`/api/shops/${A.shop.id}/bookings`)
      .set(authHeader(A.token))
      .send({
        name: 'X',
        phone: '6900000002',
        serviceId: B.service.id,
        staffId: A.staff.id,
        startTime: START,
      });

    expect(res.status).toBe(404);
    expect(await prisma.booking.count({ where: { shopId: A.shop.id } })).toBe(
      0,
    );
  });

  it("rejects public and owner bookings that use another tenant's staff", async () => {
    const A = await createTenant('Alpha');
    const B = await createTenant('Beta');
    const body = {
      name: 'X',
      phone: '6900000003',
      serviceId: A.service.id,
      staffId: B.staff.id,
      startTime: START,
    };

    const pub = await request(app)
      .post(`/public/${A.shop.slug}/book`)
      .send(body);
    const owner = await request(app)
      .post(`/api/shops/${A.shop.id}/bookings`)
      .set(authHeader(A.token))
      .send(body);

    expect(pub.status).toBe(400);
    expect(owner.status).toBe(400);
    expect(await prisma.booking.count({ where: { shopId: A.shop.id } })).toBe(
      0,
    );
  });

  it("does not offer slots for another tenant's service", async () => {
    const A = await createTenant('Alpha');
    const B = await createTenant('Beta');

    const res = await request(app).get(
      `/public/${A.shop.slug}/slots?date=2027-02-01&serviceId=${B.service.id}`,
    );

    expect(res.body.data).toEqual({ status: 'closed' });
  });

  it('still allows same-shop staff and service changes on PATCH', async () => {
    const A = await createTenant('Alpha');
    const aBooking = await createBookingRow(A);
    const service2 = await prisma.service.create({
      data: { shopId: A.shop.id, name: 'Beard', duration: 15, price: 1000 },
    });

    const res = await request(app)
      .patch(`/api/shops/${A.shop.id}/bookings/${aBooking.id}`)
      .set(authHeader(A.token))
      .send({ serviceId: service2.id, staffId: A.staff.id });

    expect(res.status).toBe(200);
    expect(res.body.data.serviceId).toBe(service2.id);
  });
});
