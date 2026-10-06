// AU-01: staff-facing booking responses carry Booking.cancelToken, the
// customer's bearer credential for the unauthenticated /public/* self-service
// endpoints. Any active member - including staff whose customer details are
// redacted and who may not reschedule - can lift it and act as the customer.
import app from '../../../api/src/app';
import { serve } from '../../../api/src/tests/testRequest';
import {
  createTenant,
  createStaffMember,
  addWeeklySchedule,
  authHeader,
  type Tenant,
} from '../../../api/src/tests/helpers';
import { prisma } from '../../../api/src/utils/prisma';

// TEST_NOW is 2026-12-01T09:00Z; the shop is Europe/Athens (UTC+2 in winter),
// open 09:00-13:00 local. 10:00 local on the 10th, movable to 11:00 local.
const START = '2026-12-10T08:00:00.000Z';
const NEW_START = '2026-12-10T09:00:00.000Z';

async function setup() {
  const api = await serve(app);
  const t: Tenant = await createTenant('Leak');
  await addWeeklySchedule(t);
  const restricted = await createStaffMember(t, 'Restricted');
  await prisma.userShop.update({
    where: { id: restricted.staff.id },
    data: { canViewCustomerDetails: false },
  });
  const customer = await prisma.customer.create({
    data: { shopId: t.shop.id, name: 'Secret Sophia', phone: '6900000001' },
  });
  const startTime = new Date(START);
  const booking = await prisma.booking.create({
    data: {
      shopId: t.shop.id,
      customerId: customer.id,
      serviceId: t.service.id,
      staffId: t.staff.id,
      startTime,
      endTime: new Date(startTime.getTime() + 30 * 60_000),
      status: 'CONFIRMED',
      cancelToken: '7b0f6a52-3a0e-4c56-9a53-1f1d2c3b4a59',
    },
  });
  return { api, t, restricted, booking };
}

describe('AU-01 cancelToken exposed to shop members', () => {
  it('AU-01: GET /bookings does not hand staff the customer cancel token', async () => {
    const { api, t, restricted } = await setup();
    const res = await api
      .get(`/api/shops/${t.shop.id}/bookings`)
      .set(authHeader(restricted.token));
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    // Control: redaction itself works on this response.
    expect(res.body.data[0].customer.name).toBe('');
    expect(res.body.data[0].cancelToken).toBeUndefined();
  });

  it('AU-01: GET /bookings/:id does not hand staff the customer cancel token', async () => {
    const { api, t, restricted, booking } = await setup();
    const res = await api
      .get(`/api/shops/${t.shop.id}/bookings/${booking.id}`)
      .set(authHeader(restricted.token));
    expect(res.status).toBe(200);
    expect(res.body.data.cancelToken).toBeUndefined();
  });

  it('AU-01: GET /bookings/stats and GET /api/shops/upcoming do not carry it either', async () => {
    const { api, t, restricted } = await setup();
    const stats = await api
      .get(`/api/shops/${t.shop.id}/bookings/stats`)
      .set(authHeader(restricted.token));
    const upcoming = await api
      .get('/api/shops/upcoming')
      .set(authHeader(restricted.token));
    expect(stats.status).toBe(200);
    expect(upcoming.status).toBe(200);
    expect(stats.body.data.upcoming).toHaveLength(1);
    expect(upcoming.body.data).toHaveLength(1);
    expect([
      stats.body.data.upcoming[0].cancelToken,
      upcoming.body.data[0].cancelToken,
    ]).toEqual([undefined, undefined]);
  });

  it('AU-01: redacted staff cannot recover the hidden customer name through the public token lookup', async () => {
    const { api, t, restricted } = await setup();
    const list = await api
      .get(`/api/shops/${t.shop.id}/bookings`)
      .set(authHeader(restricted.token));
    const token = list.body.data[0].cancelToken;
    // Unauthenticated endpoint; the token is the only credential.
    const pub = await api.post('/public/booking').send({ token });
    expect(pub.body?.data?.customerName).not.toBe('Secret Sophia');
  });

  it('AU-01: staff (not owner/manager) cannot move a booking by replaying the token on /public/reschedule', async () => {
    const { api, t, restricted, booking } = await setup();

    // Control: the authenticated route refuses staff (manager-only).
    const direct = await api
      .patch(`/api/shops/${t.shop.id}/bookings/${booking.id}`)
      .set(authHeader(restricted.token))
      .send({ startTime: NEW_START });
    expect(direct.status).toBe(403);

    const list = await api
      .get(`/api/shops/${t.shop.id}/bookings`)
      .set(authHeader(restricted.token));
    const token = list.body.data[0].cancelToken;
    await api.post('/public/reschedule').send({ token, startTime: NEW_START });

    const moved = await prisma.booking.findFirst({
      where: { shopId: t.shop.id, rescheduledFromId: booking.id },
    });
    expect(moved).toBeNull();
  });
});
