// Shared setup for the public-booking audit tests. Not a test file.
import { randomUUID } from 'crypto';
import app from '../../../api/src/app';
import { serve } from '../../../api/src/tests/testRequest';
import {
  addWeeklySchedule,
  createTenant,
  unique,
  type Tenant,
} from '../../../api/src/tests/helpers';
import { prisma } from '../../../api/src/utils/prisma';

export { prisma, unique, addWeeklySchedule, createTenant };
export type { Tenant };

// Frozen clock (api/src/tests/setup.ts): 2026-12-01T09:00:00Z = 11:00 in
// Europe/Athens (UTC+2 in winter), a Tuesday.
export const DAY = '2026-12-08'; // a Tuesday, one week ahead
export const at = (hhmm: string, day = DAY) => `${day}T${hhmm}:00+02:00`;

let agent: Awaited<ReturnType<typeof serve>> | undefined;
export const getApi = async () => (agent ??= await serve(app));

let phoneCounter = 0;
export const phone = () => `+30694${String(1_000_000 + ++phoneCounter)}`;

/** A tenant whose owner works 09:00-13:00 (shop time) every day. */
export async function shop(label = 'Audit', open = '09:00', close = '13:00') {
  const t = await createTenant(label);
  await addWeeklySchedule(t, { open, close });
  return t;
}

/** One more customer-bookable member, working the same hours, doing `serviceIds`. */
export async function addMember(
  t: Tenant,
  name: string,
  serviceIds: string[],
  opts: { open?: string; close?: string; schedule?: boolean } = {},
) {
  const member = await prisma.userShop.create({
    data: { shopId: t.shop.id, role: 'staff', name },
  });
  for (const serviceId of serviceIds)
    await prisma.staffService.create({
      data: { userShopId: member.id, serviceId },
    });
  if (opts.schedule !== false)
    await addWeeklySchedule(t, {
      staffId: member.id,
      open: opts.open,
      close: opts.close,
    });
  return member;
}

export async function book(
  t: Tenant,
  body: Record<string, unknown> = {},
  headers: Record<string, string> = {},
) {
  const api = await getApi();
  return api
    .post(`/public/${t.shop.slug}/book`)
    .set(headers)
    .send({
      name: 'Customer',
      phone: phone(),
      serviceId: t.service.id,
      staffId: t.staff.id,
      startTime: at('10:00'),
      ...body,
    });
}

export async function slots(t: Tenant, query: string, headers = {}) {
  const api = await getApi();
  return api.get(`/public/${t.shop.slug}/slots?${query}`).set(headers);
}

/** A booking row with a cancel token, inserted directly. */
export async function bookingWithToken(
  t: Tenant,
  opts: {
    start?: string;
    staffId?: string;
    serviceId?: string;
    minutes?: number;
    email?: string;
  } = {},
) {
  const customer = await prisma.customer.create({
    data: {
      shopId: t.shop.id,
      name: 'Cust',
      phone: phone(),
      email: opts.email,
    },
  });
  const startTime = new Date(opts.start ?? at('10:00'));
  const token = randomUUID();
  const serviceId = opts.serviceId ?? t.service.id;
  const minutes = opts.minutes ?? 30;
  const booking = await prisma.booking.create({
    data: {
      shopId: t.shop.id,
      customerId: customer.id,
      serviceId,
      staffId: opts.staffId ?? t.staff.id,
      startTime,
      endTime: new Date(startTime.getTime() + minutes * 60_000),
      cancelToken: token,
      services: {
        create: [
          { serviceId, name: 'Cut', duration: minutes, price: 2000, position: 0 },
        ],
      },
    },
  });
  return { booking, token, customer };
}

export const holding = (staffId: string) =>
  prisma.booking.findMany({
    where: { staffId, status: { notIn: ['CANCELED', 'NO_SHOW'] } },
    orderBy: { startTime: 'asc' },
  });

export const tally = (statuses: number[]) =>
  statuses.reduce<Record<number, number>>((acc, s) => {
    acc[s] = (acc[s] ?? 0) + 1;
    return acc;
  }, {});
