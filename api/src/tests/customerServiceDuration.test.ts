import { describe, it, expect, vi } from 'vitest';
import { randomUUID } from 'crypto';
import app from '../app';
import { serve } from './testRequest';
import { prisma } from '../utils/prisma';
import {
  addService,
  addWeeklySchedule,
  authHeader,
  createTenant,
  type Tenant,
} from './helpers';

vi.mock('../services/email.service');

const api = await serve(app);

// Frozen clock (setup.ts): 2026-12-01. Tuesday 2026-12-08 is inside the window.
// The shop is open 09:00-13:00 Athens time, i.e. 07:00-11:00 UTC.
const DATE = '2026-12-08';
const START = '2026-12-08T08:00:00.000Z';
const PHONE = '6900000001';
const minutes = (b: { startTime: Date; endTime: Date }) =>
  (b.endTime.getTime() - b.startTime.getTime()) / 60_000;

// A shop whose customer takes 60 minutes for the 30-minute "Cut".
async function shopWithSlowCustomer() {
  const t = await createTenant('Durations');
  await addWeeklySchedule(t);
  const customer = await prisma.customer.create({
    data: { shopId: t.shop.id, name: 'Slow', phone: PHONE },
  });
  await prisma.customerServiceDuration.create({
    data: { customerId: customer.id, serviceId: t.service.id, duration: 60 },
  });
  return { t, customer };
}

const putDurations = (t: Tenant, customerId: string, items: unknown) =>
  api
    .put(`/api/shops/${t.shop.id}/customers/${customerId}/service-durations`)
    .set(authHeader(t.token))
    .send({ items });

const ownerBook = (t: Tenant, phone: string, startTime = START) =>
  api.post(`/api/shops/${t.shop.id}/bookings`).set(authHeader(t.token)).send({
    name: 'Slow',
    phone,
    serviceId: t.service.id,
    staffId: t.staff.id,
    startTime,
  });

const lastSlot = (body: { data: { slots: { time: string }[] } }) =>
  body.data.slots[body.data.slots.length - 1]!.time;

describe('setting a customer’s service durations', () => {
  it('replaces the list and is returned with the customer', async () => {
    const { t, customer } = await shopWithSlowCustomer();
    const other = await addService(t, 20, 'Beard');

    const res = await putDurations(t, customer.id, [
      { serviceId: other.id, duration: 35 },
    ]);
    expect(res.status, JSON.stringify(res.body)).toBe(200);

    const got = await api
      .get(`/api/shops/${t.shop.id}/customers/${customer.id}`)
      .set(authHeader(t.token));
    expect(got.body.data.serviceDurations).toEqual([
      { serviceId: other.id, duration: 35 },
    ]);

    await putDurations(t, customer.id, []);
    expect(await prisma.customerServiceDuration.count()).toBe(0);
  });

  it('rejects bad durations, duplicates and another shop’s service', async () => {
    const { t, customer } = await shopWithSlowCustomer();
    const elsewhere = await createTenant('Elsewhere');
    const id = t.service.id;

    for (const items of [
      [{ serviceId: id, duration: 0 }],
      [{ serviceId: id, duration: 1441 }],
      [{ serviceId: id, duration: 'long' }],
      [
        { serviceId: id, duration: 40 },
        { serviceId: id, duration: 50 },
      ],
    ])
      expect((await putDurations(t, customer.id, items)).status).toBe(400);

    const foreign = await putDurations(t, customer.id, [
      { serviceId: elsewhere.service.id, duration: 40 },
    ]);
    expect(foreign.status).toBe(404);

    // Nothing above changed what was stored.
    expect(
      await prisma.customerServiceDuration.findMany({
        select: { duration: true },
      }),
    ).toEqual([{ duration: 60 }]);
  });
});

describe('a custom duration sets the length of new bookings', () => {
  it('owner create uses it; another customer gets the standard length', async () => {
    const { t } = await shopWithSlowCustomer();
    const own = await ownerBook(t, PHONE);
    expect(own.status, JSON.stringify(own.body)).toBe(201);
    expect(own.body.data.endTime).toBe('2026-12-08T09:00:00.000Z');

    const std = await ownerBook(t, '6900000002', '2026-12-08T09:00:00.000Z');
    expect(std.body.data.endTime).toBe('2026-12-08T09:30:00.000Z');
  });

  it('public create uses it, matched by phone', async () => {
    const { t } = await shopWithSlowCustomer();
    const res = await api.post(`/public/${t.shop.slug}/book`).send({
      name: 'Slow',
      phone: PHONE,
      serviceId: t.service.id,
      staffId: t.staff.id,
      startTime: START,
    });
    expect(res.status, JSON.stringify(res.body)).toBe(201);
    expect(res.body.data.endTime).toBe('2026-12-08T09:00:00.000Z');
  });

  it('a longer booking that no longer fits before closing is refused publicly', async () => {
    const { t } = await shopWithSlowCustomer();
    // 12:30-13:30 local: fine at 30 minutes, past closing at 60.
    const res = await api.post(`/public/${t.shop.slug}/book`).send({
      name: 'Slow',
      phone: PHONE,
      serviceId: t.service.id,
      staffId: t.staff.id,
      startTime: '2026-12-08T10:30:00.000Z',
    });
    expect(res.status).toBe(422);
  });
});

describe('a custom duration decides which slots fit', () => {
  it('owner slots for the customer end earlier', async () => {
    const { t, customer } = await shopWithSlowCustomer();
    const slots = (qs = '') =>
      api
        .get(
          `/api/shops/${t.shop.id}/bookings/slots?date=${DATE}&serviceId=${t.service.id}&staffId=${t.staff.id}${qs}`,
        )
        .set(authHeader(t.token));

    expect(lastSlot((await slots()).body)).toBe('12:30');
    expect(lastSlot((await slots(`&customerId=${customer.id}`)).body)).toBe(
      '12:00',
    );

    // Another shop's customer id changes nothing.
    const elsewhere = await shopWithSlowCustomer();
    expect(
      lastSlot((await slots(`&customerId=${elsewhere.customer.id}`)).body),
    ).toBe('12:30');
  });
});

describe('public slots for a returning customer', () => {
  it('fit their duration when they send their phone, and reveal nothing otherwise', async () => {
    const { t } = await shopWithSlowCustomer();
    const slots = (phone?: string) => {
      const req = api.get(
        `/public/${t.shop.slug}/slots?date=${DATE}&serviceId=${t.service.id}&staffId=${t.staff.id}`,
      );
      return phone === undefined ? req : req.set('X-Customer-Phone', phone);
    };

    expect(lastSlot((await slots()).body)).toBe('12:30');
    expect(lastSlot((await slots(PHONE)).body)).toBe('12:00');

    // An unknown or malformed phone gets the standard times, same shape.
    for (const phone of ['6900000099', 'not-a-phone', '']) {
      const res = await slots(phone);
      expect(res.status).toBe(200);
      expect(lastSlot(res.body)).toBe('12:30');
    }
  });
});

describe('rescheduling keeps the customer’s own duration', () => {
  it('owner reschedule and the customer’s own link both do', async () => {
    const { t } = await shopWithSlowCustomer();
    const created = await ownerBook(t, PHONE);
    const cancelToken = randomUUID();
    await prisma.booking.update({
      where: { id: created.body.data.id },
      data: { cancelToken },
    });

    const slots = await api.get(
      `/public/${t.shop.slug}/slots?date=${DATE}&serviceId=${t.service.id}&staffId=${t.staff.id}&rescheduleToken=${cancelToken}`,
    );
    expect(lastSlot(slots.body)).toBe('12:00');

    const byLink = await api
      .post('/public/reschedule')
      .send({ token: cancelToken, startTime: '2026-12-08T07:00:00.000Z' });
    expect(byLink.status, JSON.stringify(byLink.body)).toBe(200);
    const moved = await prisma.booking.findFirstOrThrow({
      where: { shopId: t.shop.id, status: 'CONFIRMED' },
    });
    expect(minutes(moved)).toBe(60);

    const byOwner = await api
      .patch(`/api/shops/${t.shop.id}/bookings/${moved.id}`)
      .set(authHeader(t.token))
      .send({ startTime: '2026-12-08T09:00:00.000Z' });
    expect(byOwner.status, JSON.stringify(byOwner.body)).toBe(200);
    expect(
      minutes(
        await prisma.booking.findUniqueOrThrow({
          where: { id: byOwner.body.data.id },
        }),
      ),
    ).toBe(60);
  });
});

describe('customers with custom durations in lists, merges and exports', () => {
  it('the list flags them and can filter to them', async () => {
    const { t, customer } = await shopWithSlowCustomer();
    await prisma.customer.create({
      data: { shopId: t.shop.id, name: 'Plain', phone: '6900000002' },
    });
    const list = (qs = '') =>
      api
        .get(`/api/shops/${t.shop.id}/customers${qs}`)
        .set(authHeader(t.token));

    const all = await list();
    expect(all.body.data.total).toBe(2);
    expect(
      all.body.data.items.map(
        (c: { name: string; hasCustomDurations: boolean }) => [
          c.name,
          c.hasCustomDurations,
        ],
      ),
    ).toEqual(
      expect.arrayContaining([
        ['Slow', true],
        ['Plain', false],
      ]),
    );

    const only = await list('?hasCustomDurations=true');
    expect(only.body.data.total).toBe(1);
    expect(only.body.data.items[0].id).toBe(customer.id);
    expect((await list('?hasCustomDurations=maybe')).status).toBe(400);
  });

  it('a merge carries them over, the target’s own winning', async () => {
    const { t, customer: source } = await shopWithSlowCustomer();
    const beard = await addService(t, 20, 'Beard');
    await prisma.customerServiceDuration.create({
      data: { customerId: source.id, serviceId: beard.id, duration: 25 },
    });
    const target = await prisma.customer.create({
      data: { shopId: t.shop.id, name: 'Target', phone: '6900000002' },
    });
    await prisma.customerServiceDuration.create({
      data: { customerId: target.id, serviceId: t.service.id, duration: 45 },
    });

    const res = await api
      .post(`/api/shops/${t.shop.id}/customers/${target.id}/merge`)
      .set(authHeader(t.token))
      .send({ sourceCustomerId: source.id });
    expect(res.status, JSON.stringify(res.body)).toBe(200);

    const kept = await prisma.customerServiceDuration.findMany({
      orderBy: { duration: 'asc' },
      select: { customerId: true, serviceId: true, duration: true },
    });
    expect(kept).toEqual([
      { customerId: target.id, serviceId: beard.id, duration: 25 },
      { customerId: target.id, serviceId: t.service.id, duration: 45 },
    ]);
  });

  it('the data export lists them', async () => {
    const { t, customer } = await shopWithSlowCustomer();
    const res = await api
      .get(`/api/shops/${t.shop.id}/customers/${customer.id}/export`)
      .set(authHeader(t.token));
    expect(res.body.data.serviceDurations).toEqual([
      { service: 'Cut', minutes: 60 },
    ]);
  });
});
