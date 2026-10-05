import { describe, it, expect, vi } from 'vitest';
import { randomUUID } from 'crypto';
import app from '../app';
import { serve } from './testRequest';
import { prisma } from '../utils/prisma';
import {
  addService,
  addWeeklySchedule,
  ALL_OVERRIDABLE_RULES,
  authHeader,
  createBookingRow,
  createTenant,
  type Tenant,
} from './helpers';

vi.mock('../services/email.service');

const api = await serve(app);

// Frozen clock (setup.ts): 2026-12-01. Tuesday 2026-12-08 is inside the window.
const DATE = '2026-12-08';
const START = '2026-12-08T10:00:00.000Z';

// A shop whose "Cut" is public and whose "Internal" is staff-only.
async function shopWithInternalService() {
  const t = await createTenant('Internal');
  await addWeeklySchedule(t);
  const internal = await addService(t, 30, 'Internal');
  await prisma.service.update({
    where: { id: internal.id },
    data: { showOnPublicPage: false },
  });
  return { t, internal };
}

const publicSlots = (t: Tenant, serviceId: string, qs = '') =>
  api.get(
    `/public/${t.shop.slug}/slots?date=${DATE}&serviceId=${serviceId}&staffId=${t.staff.id}${qs}`,
  );

const bookingBody = (t: Tenant, serviceId: string) => ({
  name: 'Cust',
  phone: '6900000001',
  serviceId,
  staffId: t.staff.id,
  startTime: START,
});

describe('the showOnPublicPage flag', () => {
  it('defaults to true and is set through the service API', async () => {
    const t = await createTenant('Flag');
    const created = await api
      .post(`/api/shops/${t.shop.id}/services`)
      .set(authHeader(t.token))
      .send({ name: 'New', duration: 30, price: 1000 });
    expect(created.body.data.showOnPublicPage).toBe(true);

    const patched = await api
      .patch(`/api/shops/${t.shop.id}/services/${created.body.data.id}`)
      .set(authHeader(t.token))
      .send({ showOnPublicPage: false });
    expect(patched.status, JSON.stringify(patched.body)).toBe(200);
    expect(patched.body.data.showOnPublicPage).toBe(false);

    const bad = await api
      .patch(`/api/shops/${t.shop.id}/services/${created.body.data.id}`)
      .set(authHeader(t.token))
      .send({ showOnPublicPage: 'sometimes' });
    expect(bad.status).toBe(400);
  });
});

describe('an internal-only service is closed to the public page', () => {
  it('is missing from the public shop info', async () => {
    const { t } = await shopWithInternalService();
    const res = await api.get(`/public/${t.shop.slug}`);
    expect(res.body.data.services.map((s: { name: string }) => s.name)).toEqual(
      ['Cut'],
    );
  });

  it('public create -> 404', async () => {
    const { t, internal } = await shopWithInternalService();
    const res = await api
      .post(`/public/${t.shop.slug}/book`)
      .send(bookingBody(t, internal.id));
    expect(res.status).toBe(404);
    expect(await prisma.booking.count({ where: { shopId: t.shop.id } })).toBe(
      0,
    );
  });

  it('public slots are closed; the public service is unaffected', async () => {
    const { t, internal } = await shopWithInternalService();
    expect((await publicSlots(t, internal.id)).body.data).toEqual({
      status: 'closed',
    });
    expect((await publicSlots(t, t.service.id)).body.data.status).toBe('ok');
  });
});

describe('an internal-only service is bookable by the shop', () => {
  it('is listed in the wizard info, for members only', async () => {
    const { t } = await shopWithInternalService();
    const url = `/api/shops/${t.shop.id}/bookings/wizard-info`;
    const res = await api.get(url).set(authHeader(t.token));
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect(
      res.body.data.services.map((s: { name: string }) => s.name).sort(),
    ).toEqual(['Cut', 'Internal']);

    expect((await api.get(url)).status).toBe(401);
    const outsider = await createTenant('Outsider');
    expect((await api.get(url).set(authHeader(outsider.token))).status).toBe(
      404,
    );
  });

  it('owner slots are open and owner create works', async () => {
    const { t, internal } = await shopWithInternalService();
    const slots = await api
      .get(
        `/api/shops/${t.shop.id}/bookings/slots?date=${DATE}&serviceId=${internal.id}&staffId=${t.staff.id}`,
      )
      .set(authHeader(t.token));
    expect(slots.body.data.status).toBe('ok');

    const res = await api
      .post(`/api/shops/${t.shop.id}/bookings`)
      .set(authHeader(t.token))
      .send({
        ...bookingBody(t, internal.id),
        overrideRules: ALL_OVERRIDABLE_RULES,
      });
    expect(res.status, JSON.stringify(res.body)).toBe(201);
  });
});

describe('a customer can still manage a booking on an internal-only service', () => {
  it('reschedule slots open for their own booking, and the reschedule goes through', async () => {
    const { t, internal } = await shopWithInternalService();
    const booking = await createBookingRow(t, START);
    const cancelToken = randomUUID();
    await prisma.booking.update({
      where: { id: booking.id },
      data: { serviceId: internal.id, cancelToken },
    });

    const slots = await publicSlots(
      t,
      internal.id,
      `&rescheduleToken=${cancelToken}`,
    );
    expect(slots.body.data.status).toBe('ok');

    const res = await api
      .post('/public/reschedule')
      .send({ token: cancelToken, startTime: '2026-12-08T09:00:00.000Z' });
    expect(res.status, JSON.stringify(res.body)).toBe(200);
  });
});
