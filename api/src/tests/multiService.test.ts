import { describe, it, expect, vi, beforeEach } from 'vitest';
import app from '../app';
import { serve } from './testRequest';
import { prisma } from '../utils/prisma';
import {
  addService,
  addWeeklySchedule,
  authHeader,
  createStaffMember,
  createTenant,
  type Tenant,
} from './helpers';
import { sendBookingConfirmationEmail } from '../services/email.service';

const api = await serve(app);

vi.mock('../services/email.service', () => ({
  sendBookingConfirmationEmail: vi.fn().mockResolvedValue(undefined),
  sendNewBookingNotificationEmail: vi.fn().mockResolvedValue(undefined),
  sendBookingRescheduledEmail: vi.fn().mockResolvedValue(undefined),
  sendBookingRescheduledNotificationEmail: vi.fn().mockResolvedValue(undefined),
  sendCancellationConfirmationEmail: vi.fn().mockResolvedValue(undefined),
}));
beforeEach(() => vi.clearAllMocks());

// Frozen clock 2026-12-01T09:00Z; hours 09:00–13:00 Athens. "Cut" is 30 min and
// 20.00; "Beard" is 60 min and 10.00.
const TEN = '2026-12-08T10:00:00+02:00';
const ELEVEN = '2026-12-08T11:00:00+02:00';
const minutes = (a: string | Date, b: string | Date) =>
  (new Date(b).getTime() - new Date(a).getTime()) / 60_000;

async function shop() {
  const t = await createTenant('Multi');
  await addWeeklySchedule(t);
  const beard = await addService(t, 60, 'Beard');
  return { t, cut: t.service, beard };
}

const publicBook = (t: Tenant, body: object) =>
  api.post(`/public/${t.shop.slug}/book`).send({
    name: 'Nikos',
    phone: '6900001000',
    email: 'nikos@example.com',
    staffId: t.staff.id,
    startTime: TEN,
    ...body,
  });

const staffBook = (t: Tenant, body: object, token = t.token) =>
  api
    .post(`/api/shops/${t.shop.id}/bookings`)
    .set(authHeader(token))
    .send({
      name: 'Nikos',
      phone: '6900001000',
      staffId: t.staff.id,
      startTime: TEN,
      ...body,
    });

describe('booking several services at once', () => {
  it('adds their lengths up and stores each service with its name, minutes and price', async () => {
    const { t, cut, beard } = await shop();
    const res = await publicBook(t, { serviceIds: [cut.id, beard.id] });
    expect(res.status, JSON.stringify(res.body)).toBe(201);
    expect(res.body.data.servicePrice).toBe(3000);
    expect(res.body.data.services).toEqual([
      { name: 'Cut', duration: 30, price: 2000 },
      { name: 'Beard', duration: 60, price: 1000 },
    ]);
    expect(minutes(res.body.data.startTime, res.body.data.endTime)).toBe(90);

    const booking = await prisma.booking.findUniqueOrThrow({
      where: { id: res.body.data.id },
      include: { services: { orderBy: { position: 'asc' } } },
    });
    // The first service is the booking's primary one.
    expect(booking.serviceId).toBe(cut.id);
    expect(
      booking.services.map((s) => [s.name, s.duration, s.price, s.position]),
    ).toEqual([
      ['Cut', 30, 2000, 0],
      ['Beard', 60, 1000, 1],
    ]);
  });

  it('keeps the order chosen, and a single serviceId still works', async () => {
    const { t, cut, beard } = await shop();
    const res = await publicBook(t, { serviceIds: [beard.id, cut.id] });
    expect(res.body.data.services.map((s: { name: string }) => s.name)).toEqual(
      ['Beard', 'Cut'],
    );
    const booking = await prisma.booking.findUniqueOrThrow({
      where: { id: res.body.data.id },
    });
    expect(booking.serviceId).toBe(beard.id);

    const single = await publicBook(t, {
      serviceId: cut.id,
      phone: '6900001001',
      startTime: '2026-12-08T12:00:00+02:00',
    });
    expect(single.status).toBe(201);
    expect(single.body.data.services).toHaveLength(1);
  });

  it('holds the whole length: the next booking cannot start inside it', async () => {
    const { t, cut, beard } = await shop();
    await publicBook(t, { serviceIds: [cut.id, beard.id] });
    const clash = await publicBook(t, {
      serviceId: cut.id,
      phone: '6900001002',
      startTime: '2026-12-08T11:00:00+02:00',
    });
    expect(clash.status).toBe(409);
    const after = await publicBook(t, {
      serviceId: cut.id,
      phone: '6900001003',
      startTime: '2026-12-08T11:30:00+02:00',
    });
    expect(after.status).toBe(201);
  });

  it("uses the customer's own duration for each service", async () => {
    const { t, cut, beard } = await shop();
    const customer = await prisma.customer.create({
      data: { shopId: t.shop.id, name: 'Regular', phone: '6900001000' },
    });
    await prisma.customerServiceDuration.create({
      data: { customerId: customer.id, serviceId: beard.id, duration: 20 },
    });
    const res = await publicBook(t, { serviceIds: [cut.id, beard.id] });
    expect(
      res.body.data.services.map((s: { duration: number }) => s.duration),
    ).toEqual([30, 20]);
    expect(minutes(res.body.data.startTime, res.body.data.endTime)).toBe(50);
  });

  it('refuses duplicates, too many, unknown and hidden services', async () => {
    const { t, cut, beard } = await shop();
    expect((await publicBook(t, { serviceIds: [cut.id, cut.id] })).status).toBe(
      400,
    );
    expect((await publicBook(t, { serviceIds: [] })).status).toBe(400);
    expect((await publicBook(t, { serviceIds: [cut.id, 'nope'] })).status).toBe(
      404,
    );
    const many = [cut.id, beard.id];
    for (let i = 0; i < 4; i++)
      many.push((await addService(t, 15, `Extra ${i}`)).id);
    expect((await publicBook(t, { serviceIds: many })).status).toBe(400);

    // Internal-only: not for the public page, but fine for the staff wizard.
    const hidden = await prisma.service.update({
      where: { id: beard.id },
      data: { showOnPublicPage: false },
    });
    expect(
      (await publicBook(t, { serviceIds: [cut.id, hidden.id] })).status,
    ).toBe(404);
    expect(
      (await staffBook(t, { serviceIds: [cut.id, hidden.id] })).status,
    ).toBe(201);
    expect(await prisma.booking.count({ where: { shopId: t.shop.id } })).toBe(
      1,
    );
  });

  it('needs a provider who does every service', async () => {
    const { t, cut, beard } = await shop();
    const other = await createStaffMember(t, 'OnlyCuts');
    await prisma.staffService.create({
      data: { userShopId: other.staff.id, serviceId: cut.id },
    });
    await addWeeklySchedule(t, { staffId: other.staff.id });

    const refused = await publicBook(t, {
      serviceIds: [cut.id, beard.id],
      staffId: other.staff.id,
    });
    expect(refused.status).toBe(400);
    // With no preference, only the member who does both is picked.
    const any = await publicBook(t, {
      serviceIds: [cut.id, beard.id],
      staffId: undefined,
    });
    expect(any.status, JSON.stringify(any.body)).toBe(201);
    const booking = await prisma.booking.findUniqueOrThrow({
      where: { id: any.body.data.id },
    });
    expect(booking.staffId).toBe(t.staff.id);
  });

  it('works from the staff wizard, and a blocked slot only holds the first service', async () => {
    const { t, cut, beard } = await shop();
    const made = await staffBook(t, { serviceIds: [cut.id, beard.id] });
    expect(made.status, JSON.stringify(made.body)).toBe(201);
    expect(made.body.data.services).toHaveLength(2);
    expect(minutes(made.body.data.startTime, made.body.data.endTime)).toBe(90);

    const block = await staffBook(t, {
      block: true,
      serviceIds: [cut.id, beard.id],
      startTime: '2026-12-09T10:00:00+02:00',
    });
    expect(block.status, JSON.stringify(block.body)).toBe(201);
    expect(minutes(block.body.data.startTime, block.body.data.endTime)).toBe(
      30,
    );
    expect(
      await prisma.bookingService.count({
        where: { bookingId: block.body.data.id },
      }),
    ).toBe(1);
  });

  it('puts every service in the confirmation email, with the total price', async () => {
    const { t, cut, beard } = await shop();
    await publicBook(t, { serviceIds: [cut.id, beard.id] });
    await vi.waitFor(() =>
      expect(sendBookingConfirmationEmail).toHaveBeenCalled(),
    );
    expect(sendBookingConfirmationEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        serviceName: 'Cut + Beard',
        servicePrice: 3000,
      }),
    );
  });
});

describe('slots for several services', () => {
  const slots = (t: Tenant, query: string) =>
    api.get(
      `/public/${t.shop.slug}/slots?date=2026-12-08&staffId=${t.staff.id}&${query}`,
    );
  const times = (res: { body: { data: { slots: { time: string }[] } } }) =>
    res.body.data.slots.map((s) => s.time);

  it('fit the services added up', async () => {
    const { t, cut, beard } = await shop();
    const one = times(await slots(t, `serviceId=${cut.id}`));
    expect(one).toContain('12:30');
    const both = times(
      await slots(t, `serviceId=${cut.id}&serviceIds=${cut.id},${beard.id}`),
    );
    // 90 minutes in a 09:00–13:00 day: the last start is 11:30.
    expect(both).toContain('11:30');
    expect(both).not.toContain('12:00');
    expect(both).not.toContain('12:30');
  });

  it('are closed when nobody does all of them', async () => {
    const { t, cut, beard } = await shop();
    await prisma.staffService.deleteMany({ where: { serviceId: beard.id } });
    const res = await api.get(
      `/public/${t.shop.slug}/slots?date=2026-12-08&serviceId=${cut.id}&serviceIds=${cut.id},${beard.id}`,
    );
    expect(res.body.data.status).toBe('closed');
  });

  it('the staff view takes serviceIds too', async () => {
    const { t, cut, beard } = await shop();
    const res = await api
      .get(
        `/api/shops/${t.shop.id}/bookings/slots?date=2026-12-08&staffId=${t.staff.id}&serviceId=${cut.id}&serviceIds=${cut.id},${beard.id}`,
      )
      .set(authHeader(t.token));
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    const t2 = res.body.data.slots
      .filter((s: { available: boolean }) => s.available)
      .map((s: { time: string }) => s.time);
    expect(t2).toContain('11:30');
    expect(t2).not.toContain('12:00');
  });
});

describe('moving a booking with several services', () => {
  async function booked() {
    const s = await shop();
    const made = await staffBook(s.t, { serviceIds: [s.cut.id, s.beard.id] });
    return { ...s, id: made.body.data.id as string };
  }

  it('keeps the services, their lengths and the products', async () => {
    const { t, id } = await booked();
    const product = await prisma.product.create({
      data: { shopId: t.shop.id, name: 'Gel', price: 500, stock: 3 },
    });
    await prisma.bookingProduct.create({
      data: {
        bookingId: id,
        productId: product.id,
        name: 'Gel',
        unitPrice: 500,
        quantity: 1,
      },
    });
    const moved = await api
      .patch(`/api/shops/${t.shop.id}/bookings/${id}`)
      .set(authHeader(t.token))
      .send({ startTime: '2026-12-09T10:00:00+02:00' });
    expect(moved.status, JSON.stringify(moved.body)).toBe(200);
    expect(minutes(moved.body.data.startTime, moved.body.data.endTime)).toBe(
      90,
    );
    expect(
      moved.body.data.services.map((s: { name: string }) => s.name),
    ).toEqual(['Cut', 'Beard']);
    expect(moved.body.data.products).toHaveLength(1);
  });

  it('a different service replaces them', async () => {
    const { t, id } = await booked();
    const other = await addService(t, 45, 'Colour');
    const moved = await api
      .patch(`/api/shops/${t.shop.id}/bookings/${id}`)
      .set(authHeader(t.token))
      .send({ serviceId: other.id });
    expect(moved.status, JSON.stringify(moved.body)).toBe(200);
    expect(moved.body.data.services).toEqual([
      expect.objectContaining({ name: 'Colour', duration: 45 }),
    ]);
    expect(minutes(moved.body.data.startTime, moved.body.data.endTime)).toBe(
      45,
    );
  });

  it("the customer's own link moves it and keeps the length", async () => {
    const { t, id } = await booked();
    const token = (await prisma.booking.findUniqueOrThrow({ where: { id } }))
      .cancelToken;
    const moved = await api
      .post('/public/reschedule')
      .send({ token, startTime: '2026-12-09T09:30:00+02:00' });
    expect(moved.status, JSON.stringify(moved.body)).toBe(200);
    const fresh = await prisma.booking.findFirstOrThrow({
      where: { shopId: t.shop.id, rescheduledFromId: id },
      include: { services: true },
    });
    expect(minutes(fresh.startTime, fresh.endTime)).toBe(90);
    expect(fresh.services).toHaveLength(2);
  });

  it('the reschedule slots keep fitting all the services', async () => {
    const { t, cut, id } = await booked();
    const res = await api
      .get(
        `/api/shops/${t.shop.id}/bookings/slots?date=2026-12-09&staffId=${t.staff.id}&serviceId=${cut.id}&forBookingId=${id}`,
      )
      .set(authHeader(t.token));
    const open = res.body.data.slots
      .filter((s: { available: boolean }) => s.available)
      .map((s: { time: string }) => s.time);
    expect(open).toContain('11:30');
    expect(open).not.toContain('12:00');
  });
});

describe('bookings with several services elsewhere', () => {
  it('a service that is in a booking cannot be deleted, even when it is not the first', async () => {
    const { t, cut, beard } = await shop();
    await staffBook(t, { serviceIds: [cut.id, beard.id] });
    const res = await api
      .delete(`/api/shops/${t.shop.id}/services/${beard.id}`)
      .set(authHeader(t.token));
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('SERVICE_HAS_BOOKINGS');
  });

  it("a customer's total spent adds every service of a completed booking", async () => {
    const { t, cut, beard } = await shop();
    const made = await staffBook(t, { serviceIds: [cut.id, beard.id] });
    await api
      .patch(`/api/shops/${t.shop.id}/bookings/${made.body.data.id}/status`)
      .set(authHeader(t.token))
      .send({ status: 'COMPLETED' });
    const detail = await api
      .get(`/api/shops/${t.shop.id}/customers/${made.body.data.customerId}`)
      .set(authHeader(t.token));
    expect(detail.body.data.totalSpent).toBe(3000);
  });

  it('the booking lists show every service', async () => {
    const { t, cut, beard } = await shop();
    await staffBook(t, { serviceIds: [cut.id, beard.id] });
    const list = await api
      .get(`/api/shops/${t.shop.id}/bookings`)
      .set(authHeader(t.token));
    expect(
      list.body.data[0].services.map((s: { name: string }) => s.name),
    ).toEqual(['Cut', 'Beard']);
    expect(list.body.data[0].service.name).toBe('Cut');
  });
});
