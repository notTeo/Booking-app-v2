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

const api = await serve(app);

vi.mock('../services/email.service', () => ({
  sendBookingConfirmationEmail: vi.fn().mockResolvedValue(undefined),
  sendNewBookingNotificationEmail: vi.fn().mockResolvedValue(undefined),
}));

// Frozen clock (setup.ts): 2026-12-01T09:00Z. Default shop: Europe/Athens,
// hours 09:00–13:00 daily, 30-minute service.
const FIRST = '2026-12-08T10:00:00+02:00';
const PHONE = '+306940001000';

async function shop() {
  const t = await createTenant('DupPhone');
  await addWeeklySchedule(t);
  return t;
}

// Two customers with PHONE (the older one first) and one with a phone of its own.
async function withDuplicates(t: Tenant) {
  const older = await prisma.customer.create({
    data: {
      shopId: t.shop.id,
      name: 'Older',
      phone: PHONE,
      createdAt: new Date('2026-01-01T00:00:00Z'),
    },
  });
  const newer = await prisma.customer.create({
    data: { shopId: t.shop.id, name: 'Newer', phone: PHONE },
  });
  const alone = await prisma.customer.create({
    data: { shopId: t.shop.id, name: 'Alone', phone: '+306940001001' },
  });
  return { older, newer, alone };
}

const list = (t: Tenant, token: string, query = '') =>
  api.get(`/api/shops/${t.shop.id}/customers${query}`).set(authHeader(token));

describe('customers who share a phone number', () => {
  it('are flagged in the list, counted, and found by the filter with the oldest first', async () => {
    const t = await shop();
    const { older, newer, alone } = await withDuplicates(t);

    const all = await list(t, t.token);
    expect(all.status).toBe(200);
    expect(all.body.data.duplicatePhoneCount).toBe(2);
    const flag = (id: string) =>
      all.body.data.items.find((c: { id: string }) => c.id === id)
        .duplicatePhone;
    expect([flag(older.id), flag(newer.id), flag(alone.id)]).toEqual([
      true,
      true,
      false,
    ]);

    const only = await list(t, t.token, '?duplicatePhone=true');
    expect(only.body.data.items.map((c: { id: string }) => c.id)).toEqual([
      older.id,
      newer.id,
    ]);
    expect(only.body.data.total).toBe(2);
  });

  it('are not pointed out to a member who may not see contact details', async () => {
    const t = await shop();
    await withDuplicates(t);
    const hidden = await createStaffMember(t, 'Hidden');
    await prisma.userShop.update({
      where: { id: hidden.staff.id },
      data: { canViewCustomerDetails: false },
    });

    const res = await list(t, hidden.token);
    expect(res.body.data.duplicatePhoneCount).toBe(0);
    expect(
      res.body.data.items.every(
        (c: { duplicatePhone: boolean }) => c.duplicatePhone === false,
      ),
    ).toBe(true);
    const filtered = await list(t, hidden.token, '?duplicatePhone=true');
    expect(filtered.body.data.items).toEqual([]);
  });

  it('each name the others on their own page, oldest first', async () => {
    const t = await shop();
    const { older, newer, alone } = await withDuplicates(t);
    const get = (id: string) =>
      api
        .get(`/api/shops/${t.shop.id}/customers/${id}`)
        .set(authHeader(t.token));

    expect((await get(newer.id)).body.data.samePhone).toMatchObject([
      { id: older.id, name: 'Older' },
    ]);
    expect((await get(older.id)).body.data.samePhone).toMatchObject([
      { id: newer.id, name: 'Newer' },
    ]);
    expect((await get(alone.id)).body.data.samePhone).toEqual([]);
  });

  it('flag their bookings too', async () => {
    const t = await shop();
    const { newer, alone } = await withDuplicates(t);
    const book = (customerId: string, startTime: string) =>
      prisma.booking.create({
        data: {
          shopId: t.shop.id,
          customerId,
          serviceId: t.service.id,
          staffId: t.staff.id,
          startTime: new Date(startTime),
          endTime: new Date(new Date(startTime).getTime() + 30 * 60_000),
        },
      });
    const shared = await book(newer.id, FIRST);
    const single = await book(alone.id, '2026-12-08T11:00:00+02:00');

    const res = await api
      .get(`/api/shops/${t.shop.id}/bookings?date=2026-12-08`)
      .set(authHeader(t.token));
    expect(res.status).toBe(200);
    const flag = (id: string) =>
      res.body.data.find((b: { id: string }) => b.id === id).customer
        .duplicatePhone;
    expect([flag(shared.id), flag(single.id)]).toEqual([true, false]);

    const one = await api
      .get(`/api/shops/${t.shop.id}/bookings/${shared.id}`)
      .set(authHeader(t.token));
    expect(one.body.data.customer.duplicatePhone).toBe(true);
  });

  it('a booking or a customer added by the shop goes to the oldest of them', async () => {
    const t = await shop();
    const { older } = await withDuplicates(t);

    const booked = await api
      .post(`/api/shops/${t.shop.id}/bookings`)
      .set(authHeader(t.token))
      .send({
        name: 'Older',
        phone: PHONE,
        serviceId: t.service.id,
        staffId: t.staff.id,
        startTime: FIRST,
      });
    expect(booked.status).toBe(201);
    expect(booked.body.data.customerId).toBe(older.id);

    const added = await api
      .post(`/api/shops/${t.shop.id}/customers`)
      .set(authHeader(t.token))
      .send({ name: 'Again', phone: PHONE });
    expect(added.status).toBe(409);
    expect(added.body.customerId).toBe(older.id);
  });

  it('a customer may be given a phone another one has', async () => {
    const t = await shop();
    const { alone } = await withDuplicates(t);
    const res = await api
      .patch(`/api/shops/${t.shop.id}/customers/${alone.id}`)
      .set(authHeader(t.token))
      .send({ phone: PHONE });
    expect(res.status).toBe(200);
    expect(
      await prisma.customer.count({
        where: { shopId: t.shop.id, phone: PHONE },
      }),
    ).toBe(3);
  });
});
