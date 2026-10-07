import app from '../../../api/src/app';
import { serve } from '../../../api/src/tests/testRequest';
import {
  createTenant,
  authHeader,
  createBookingRow,
  addWeeklySchedule,
} from '../../../api/src/tests/helpers';
import { prisma } from '../../../api/src/utils/prisma';

// True negatives: probes that the code handles correctly today. These PASS.
// They cover id combinations the existing api/src/tests suite does not.

const api = await serve(app);
const DATE = '2026-12-08';

describe('tenant isolation: true negatives', () => {
  it("customer service-durations: another shop's serviceId is refused", async () => {
    const a = await createTenant('A');
    const b = await createTenant('B');
    const booking = await createBookingRow(a);
    const res = await api
      .put(
        `/api/shops/${a.shop.id}/customers/${booking.customerId}/service-durations`,
      )
      .set(authHeader(a.token))
      .send({ items: [{ serviceId: b.service.id, duration: 45 }] });
    expect(res.status).toBe(404);
    expect(await prisma.customerServiceDuration.count()).toBe(0);
  });

  it("customer merge: another shop's source customer is refused and survives", async () => {
    const a = await createTenant('A');
    const b = await createTenant('B');
    const mine = await createBookingRow(a);
    const theirs = await createBookingRow(b);
    const res = await api
      .post(`/api/shops/${a.shop.id}/customers/${mine.customerId}/merge`)
      .set(authHeader(a.token))
      .send({ sourceCustomerId: theirs.customerId });
    expect(res.status).toBe(404);
    const still = await prisma.booking.findUnique({ where: { id: theirs.id } });
    expect(still?.customerId).toBe(theirs.customerId);
  });

  it("time off: another shop's member is refused in the body and in the list filter", async () => {
    const a = await createTenant('A');
    const b = await createTenant('B');
    const create = await api
      .post(`/api/shops/${a.shop.id}/time-off`)
      .set(authHeader(a.token))
      .send({ staffId: b.staff.id, startDate: DATE, endDate: DATE });
    expect(create.status).toBe(404);
    expect(await prisma.timeOff.count()).toBe(0);

    const list = await api
      .get(`/api/shops/${a.shop.id}/time-off?memberId=${b.staff.id}`)
      .set(authHeader(a.token));
    expect(list.status).toBe(404);
  });

  it("bookings list: filtering by another shop's staffId returns nothing", async () => {
    const a = await createTenant('A');
    const b = await createTenant('B');
    await createBookingRow(b);
    const res = await api
      .get(`/api/shops/${a.shop.id}/bookings?staffId=${b.staff.id}`)
      .set(authHeader(a.token));
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it("booking product line: another shop's booking AND line together are refused", async () => {
    const a = await createTenant('A');
    const b = await createTenant('B');
    const bBooking = await createBookingRow(b);
    const product = await prisma.product.create({
      data: { shopId: b.shop.id, name: 'Wax', price: 500, stock: 3 },
    });
    const line = await prisma.bookingProduct.create({
      data: {
        bookingId: bBooking.id,
        productId: product.id,
        name: 'Wax',
        unitPrice: 500,
        quantity: 1,
      },
    });
    const path = `/api/shops/${a.shop.id}/bookings/${bBooking.id}/products/${line.id}`;
    const patch = await api
      .patch(path)
      .set(authHeader(a.token))
      .send({ saleStatus: 'SOLD' });
    expect(patch.status).toBe(404);
    const del = await api.delete(path).set(authHeader(a.token));
    expect(del.status).toBe(404);
    const after = await prisma.bookingProduct.findUnique({
      where: { id: line.id },
    });
    expect(after?.saleStatus).toBe('RESERVED');
    expect(
      (await prisma.product.findUnique({ where: { id: product.id } }))?.stock,
    ).toBe(3);
  });

  it("owner slots: another shop's customerId or forBookingId changes nothing", async () => {
    const a = await createTenant('A');
    const b = await createTenant('B');
    await addWeeklySchedule(a);
    const bBooking = await createBookingRow(b);
    await prisma.customerServiceDuration.create({
      data: {
        customerId: bBooking.customerId,
        serviceId: b.service.id,
        duration: 120,
      },
    });
    const base = `/api/shops/${a.shop.id}/bookings/slots?date=${DATE}&serviceId=${a.service.id}&staffId=${a.staff.id}`;
    const plain = await api.get(base).set(authHeader(a.token));
    const probed = await api
      .get(`${base}&customerId=${bBooking.customerId}&forBookingId=${bBooking.id}`)
      .set(authHeader(a.token));
    expect(plain.status).toBe(200);
    expect(probed.body.data).toEqual(plain.body.data);
  });

  it("public booking: another shop's product is refused", async () => {
    const a = await createTenant('A');
    const b = await createTenant('B');
    await addWeeklySchedule(a);
    const product = await prisma.product.create({
      data: { shopId: b.shop.id, name: 'Wax', price: 500, stock: 3 },
    });
    const res = await api.post(`/public/${a.shop.slug}/book`).send({
      name: 'Cust',
      phone: '6900000001',
      serviceId: a.service.id,
      staffId: a.staff.id,
      startTime: `${DATE}T10:00:00.000Z`,
      products: [{ productId: product.id, quantity: 1 }],
    });
    expect(res.status).toBe(404);
    expect(await prisma.booking.count()).toBe(0);
  });

  it("public reschedule: another shop's staff member is refused", async () => {
    const a = await createTenant('A');
    const b = await createTenant('B');
    await addWeeklySchedule(a);
    await addWeeklySchedule(b);
    const booking = await createBookingRow(a, `${DATE}T10:00:00.000Z`);
    const token = crypto.randomUUID();
    await prisma.booking.update({
      where: { id: booking.id },
      data: { cancelToken: token },
    });
    const res = await api.post('/public/reschedule').send({
      token,
      startTime: `${DATE}T11:00:00.000Z`,
      staffId: b.staff.id,
    });
    expect(res.status).toBe(400);
    expect(await prisma.booking.count({ where: { staffId: b.staff.id } })).toBe(
      0,
    );
  });
});
