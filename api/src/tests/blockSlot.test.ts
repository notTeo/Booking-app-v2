import { describe, it, expect, vi } from 'vitest';
import app from '../app';
import { serve } from './testRequest';
import { prisma } from '../utils/prisma';
import {
  addWeeklySchedule,
  authHeader,
  createStaffMember,
  createTenant,
  type Tenant,
} from './helpers';
import * as email from '../services/email.service';

vi.mock('../services/email.service');

const api = await serve(app);

// Frozen clock (setup.ts): 2026-12-01. Tuesday 2026-12-08 is inside the window.
// The shop is open 09:00-13:00 Athens time, i.e. 07:00-11:00 UTC.
const DATE = '2026-12-08';
const START = '2026-12-08T08:00:00.000Z'; // 10:00 local

async function shop() {
  const t = await createTenant('Block');
  await addWeeklySchedule(t);
  return t;
}

const block = (t: Tenant, body: object = {}, token = t.token) =>
  api
    .post(`/api/shops/${t.shop.id}/bookings`)
    .set(authHeader(token))
    .send({
      block: true,
      serviceId: t.service.id,
      staffId: t.staff.id,
      startTime: START,
      ...body,
    });

const systemCustomers = (t: Tenant) =>
  prisma.customer.findMany({ where: { shopId: t.shop.id, isSystem: true } });

describe('blocking a slot', () => {
  it('books the time on the shop’s one "Blocked" customer, with no customer details and no email', async () => {
    const t = await shop();
    const res = await block(t, { notes: 'Dentist' });
    expect(res.status, JSON.stringify(res.body)).toBe(201);
    expect(res.body.data).toMatchObject({
      startTime: START,
      endTime: '2026-12-08T08:30:00.000Z',
      notes: 'Dentist',
      customer: { name: 'Blocked', phone: '', email: null, isSystem: true },
    });
    expect(email.sendBookingConfirmationEmail).not.toHaveBeenCalled();

    // A second block reuses the same placeholder.
    const again = await block(t, { startTime: '2026-12-08T09:00:00.000Z' });
    expect(again.status).toBe(201);
    expect(await systemCustomers(t)).toHaveLength(1);
    expect(again.body.data.customerId).toBe(res.body.data.customerId);
  });

  it('any member may block; submitted customer details are ignored', async () => {
    const t = await shop();
    const member = await createStaffMember(t);
    const res = await block(
      t,
      { name: 'Real Person', phone: '6900000001', email: 'real@example.com' },
      member.token,
    );
    expect(res.status, JSON.stringify(res.body)).toBe(201);
    expect(res.body.data.customer.isSystem).toBe(true);
    expect(await prisma.customer.count({ where: { shopId: t.shop.id } })).toBe(
      1,
    );
  });

  it('makes the time unavailable, publicly and for the shop, until it is unblocked', async () => {
    const t = await shop();
    const { body } = await block(t);
    const slotAt10 = async () => {
      const res = await api.get(
        `/public/${t.shop.slug}/slots?date=${DATE}&serviceId=${t.service.id}&staffId=${t.staff.id}`,
      );
      return res.body.data.slots.find(
        (s: { time: string }) => s.time === '10:00',
      );
    };
    expect((await slotAt10()).available).toBe(false);

    const taken = await api.post(`/public/${t.shop.slug}/book`).send({
      name: 'Cust',
      phone: '6900000001',
      serviceId: t.service.id,
      staffId: t.staff.id,
      startTime: START,
    });
    expect(taken.status).toBe(409);
    expect((await block(t)).status).toBe(409);

    // Unblocking is canceling it.
    const unblock = await api
      .patch(`/api/shops/${t.shop.id}/bookings/${body.data.id}/status`)
      .set(authHeader(t.token))
      .send({ status: 'CANCELED' });
    expect(unblock.status, JSON.stringify(unblock.body)).toBe(200);
    expect((await slotAt10()).available).toBe(true);
  });

  it('still needs a real customer when block is not true, and the public route never blocks', async () => {
    const t = await shop();
    expect((await block(t, { block: false })).status).toBe(400);
    expect((await block(t, { block: 'true' })).status).toBe(400);

    const pub = await api.post(`/public/${t.shop.slug}/book`).send({
      block: true,
      serviceId: t.service.id,
      staffId: t.staff.id,
      startTime: START,
    });
    expect(pub.status).toBe(400);
    expect(await systemCustomers(t)).toHaveLength(0);
  });
});

describe('the "Blocked" placeholder is not a customer', () => {
  it('is missing from the list, search and export, and cannot be opened, edited, merged or deleted', async () => {
    const t = await shop();
    const { body } = await block(t);
    const blockedId = body.data.customerId as string;
    const real = await prisma.customer.create({
      data: { shopId: t.shop.id, name: 'Real', phone: '6900000001' },
    });
    const base = `/api/shops/${t.shop.id}/customers`;
    const get = (path = '') =>
      api.get(`${base}${path}`).set(authHeader(t.token));

    const list = await get();
    expect(list.body.data.total).toBe(1);
    expect(list.body.data.items[0].id).toBe(real.id);
    expect((await get('?search=Blocked')).body.data.total).toBe(0);
    expect(
      (await get('/export-all')).body.data.map((c: { name: string }) => c.name),
    ).toEqual(['Real']);

    expect((await get(`/${blockedId}`)).status).toBe(404);
    expect((await get(`/${blockedId}/bookings`)).status).toBe(404);
    expect((await get(`/${blockedId}/export`)).status).toBe(404);
    const write = (
      method: 'patch' | 'delete' | 'post' | 'put',
      path: string,
      payload?: object,
    ) => api[method](`${base}${path}`).set(authHeader(t.token)).send(payload);
    expect((await write('patch', `/${blockedId}`, { name: 'X' })).status).toBe(
      404,
    );
    expect((await write('delete', `/${blockedId}`)).status).toBe(404);
    expect(
      (await write('put', `/${blockedId}/service-durations`, { items: [] }))
        .status,
    ).toBe(404);
    // Neither as the record kept nor as the one merged away.
    expect(
      (
        await write('post', `/${blockedId}/merge`, {
          sourceCustomerId: real.id,
        })
      ).status,
    ).toBe(404);
    expect(
      (
        await write('post', `/${real.id}/merge`, {
          sourceCustomerId: blockedId,
        })
      ).status,
    ).toBe(404);
    expect(await systemCustomers(t)).toHaveLength(1);
    expect(await prisma.booking.count({ where: { shopId: t.shop.id } })).toBe(
      1,
    );
  });
});

describe('blocked slots are not appointments', () => {
  it('are on the calendar list but in no count or upcoming list', async () => {
    const t = await shop();
    await block(t);
    const get = (path: string) => api.get(path).set(authHeader(t.token));

    const day = await get(`/api/shops/${t.shop.id}/bookings?date=${DATE}`);
    expect(day.body.data).toHaveLength(1);
    expect(day.body.data[0].customer.isSystem).toBe(true);

    const stats = await get(`/api/shops/${t.shop.id}/bookings/stats`);
    expect(stats.body.data).toMatchObject({
      todayCount: 0,
      upcomingCount: 0,
      upcoming: [],
    });

    const overview = await get(`/api/shops/${t.shop.id}/overview?range=month`);
    expect(overview.status, JSON.stringify(overview.body)).toBe(200);
    expect(overview.body.data.totals.all).toBe(0);
    expect(overview.body.data.hasAnyBookings).toBe(false);
    expect(
      overview.body.data.buckets.reduce(
        (sum: number, b: { count: number }) => sum + b.count,
        0,
      ),
    ).toBe(0);

    expect((await get('/api/shops/upcoming')).body.data).toEqual([]);
  });
});
