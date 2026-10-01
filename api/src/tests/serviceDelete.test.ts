import { describe, it, expect, vi } from 'vitest';
import app from '../app';
import { serve } from './testRequest';
import { prisma } from '../utils/prisma';
import {
  addService,
  authHeader,
  createBookingRow,
  createTenant,
} from './helpers';

vi.mock('../services/email.service');

const api = await serve(app);

const del = (t: { shop: { id: string }; token: string }, serviceId: string) =>
  api
    .delete(`/api/shops/${t.shop.id}/services/${serviceId}`)
    .set(authHeader(t.token));

describe('DELETE /api/shops/:shopId/services/:serviceId', () => {
  it('deletes a service with no bookings', async () => {
    const t = await createTenant('Del');
    const svc = await addService(t, 30);
    const res = await del(t, svc.id);
    expect(res.status).toBeLessThan(300);
    expect(
      await prisma.service.findUnique({ where: { id: svc.id } }),
    ).toBeNull();
  });

  it.each([
    ['a past booking', '2026-11-01T09:00:00.000Z'],
    ['a future booking', '2027-07-01T09:00:00.000Z'],
  ])(
    'refuses with 409 SERVICE_HAS_BOOKINGS when it has %s, and touches nothing',
    async (_l, start) => {
      const t = await createTenant('Del');
      const booking = await createBookingRow(t, start);

      const res = await del(t, t.service.id);

      expect(res.status).toBe(409);
      expect(res.body.code).toBe('SERVICE_HAS_BOOKINGS');
      expect(res.body.message).toMatch(/has bookings.*deactivate/i);
      expect(
        await prisma.service.findUnique({ where: { id: t.service.id } }),
      ).not.toBeNull();
      expect(
        await prisma.booking.findUnique({ where: { id: booking.id } }),
      ).toEqual(booking);
    },
  );

  it('a canceled booking still blocks deletion (history is kept)', async () => {
    const t = await createTenant('Del');
    await createBookingRow(t, '2027-07-01T09:00:00.000Z', 'CANCELED');
    expect((await del(t, t.service.id)).status).toBe(409);
  });
});
