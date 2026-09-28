import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import app from '../app';
import { prisma } from '../utils/prisma';
import { addWeeklySchedule, authHeader, createTenant } from './helpers';

vi.mock('../services/email.service');

// The overlap check reads only bookings that START within MAX_BOOKING_MINUTES
// (24 h) before the new one, so Postgres can use a tight index range instead
// of the provider's whole history. That is only correct if no booking is ever
// longer than that — so length is capped and checked.
describe('bookings are never longer than 24 hours', () => {
  it('service duration above 1440 minutes is rejected on create (400)', async () => {
    const t = await createTenant('Len');
    const res = await request(app)
      .post(`/api/shops/${t.shop.id}/services`)
      .set(authHeader(t.token))
      .send({ name: 'Forever', duration: 1441, price: 0 });
    expect(res.status).toBe(400);
  });

  it('service duration above 1440 minutes is rejected on update (400)', async () => {
    const t = await createTenant('Len');
    const res = await request(app)
      .patch(`/api/shops/${t.shop.id}/services/${t.service.id}`)
      .set(authHeader(t.token))
      .send({ duration: 5000 });
    expect(res.status).toBe(400);
  });

  it('1440 minutes is still allowed', async () => {
    const t = await createTenant('Len');
    const res = await request(app)
      .post(`/api/shops/${t.shop.id}/services`)
      .set(authHeader(t.token))
      .send({ name: 'Day', duration: 1440, price: 0 });
    expect(res.status).toBe(201);
  });

  it('defence in depth: a legacy over-long service cannot be booked (422 BOOKING_TOO_LONG)', async () => {
    const t = await createTenant('Len');
    await addWeeklySchedule(t);
    await prisma.service.update({
      where: { id: t.service.id },
      data: { duration: 2000 },
    });
    const res = await request(app)
      .post(`/api/shops/${t.shop.id}/bookings`)
      .set(authHeader(t.token))
      .send({
        name: 'C',
        phone: '6900000001',
        serviceId: t.service.id,
        staffId: t.staff.id,
        startTime: '2026-12-08T10:00:00+02:00',
        override: true,
      });
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('BOOKING_TOO_LONG');
    expect(await prisma.booking.count()).toBe(0);
  });

  it('a 24-hour booking still blocks an overlapping one that starts 23h later', async () => {
    const t = await createTenant('Len');
    const day = await prisma.service.create({
      data: { shopId: t.shop.id, name: 'Day', duration: 1440, price: 0 },
    });
    await prisma.staffService.create({
      data: { userShopId: t.staff.id, serviceId: day.id },
    });
    const book = (serviceId: string, startTime: string, phone: string) =>
      request(app)
        .post(`/api/shops/${t.shop.id}/bookings`)
        .set(authHeader(t.token))
        .send({
          name: 'C',
          phone,
          serviceId,
          staffId: t.staff.id,
          startTime,
          override: true,
        });
    expect(
      (await book(day.id, '2026-12-08T10:00:00+02:00', '6900000001')).status,
    ).toBe(201);
    expect(
      (await book(t.service.id, '2026-12-09T09:00:00+02:00', '6900000002'))
        .status,
    ).toBe(409);
    // ...and one that starts exactly when it ends is fine
    expect(
      (await book(t.service.id, '2026-12-09T10:00:00+02:00', '6900000003'))
        .status,
    ).toBe(201);
  });
});
