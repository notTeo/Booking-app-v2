import { afterEach, describe, it, expect, vi } from 'vitest';
import app from '../app';
import { serve } from './testRequest';
import { prisma } from '../utils/prisma';
import { deriveOpeningHours } from '../services/public.service';
import {
  addWeeklySchedule,
  authHeader,
  createStaffMember,
  createTenant,
  unique,
  type Tenant,
} from './helpers';

const api = await serve(app);

vi.mock('../services/email.service');

// "Any staff": team members' own hours are the only working hours. A slot is
// offered when at least one eligible member works then and is free; the booking
// goes to the free member with the fewest booked minutes that day (random on a tie).
//
// Frozen clock (setup.ts): 2026-12-01. Tuesday 2026-12-08, Athens (EET, +02:00).
const DATE = '2026-12-08';
const at = (hhmm: string) => `${DATE}T${hhmm}:00+02:00`;

afterEach(() => vi.restoreAllMocks());

// Owner (t.staff) plus `extra` more members, all performing the service.
async function team(extra = 1) {
  const t = await createTenant('Any');
  const members = [t.staff];
  for (let i = 0; i < extra; i++) {
    const m = await createStaffMember(t, `Member${i}`);
    await prisma.staffService.create({
      data: { userShopId: m.staff.id, serviceId: t.service.id },
    });
    members.push(m.staff);
  }
  return { t, members };
}

const work = (t: Tenant, staffId: string, open: string, close: string) =>
  addWeeklySchedule(t, { staffId, open, close });

const book = async (
  t: Tenant,
  staffId: string,
  hhmm: string,
  durationMinutes = 30,
) => {
  const customer = await prisma.customer.create({
    data: { shopId: t.shop.id, name: 'c', phone: unique() },
  });
  const startTime = new Date(at(hhmm));
  return prisma.booking.create({
    data: {
      shopId: t.shop.id,
      customerId: customer.id,
      serviceId: t.service.id,
      staffId,
      startTime,
      endTime: new Date(startTime.getTime() + durationMinutes * 60_000),
    },
  });
};

const slots = async (t: Tenant) =>
  (
    await api.get(
      `/public/${t.shop.slug}/slots?date=${DATE}&serviceId=${t.service.id}`,
    )
  ).body.data as {
    status: string;
    slots?: { time: string; available: boolean }[];
  };

const publicBook = (t: Tenant, hhmm: string, extra: object = {}) =>
  api.post(`/public/${t.shop.slug}/book`).send({
    name: 'C',
    phone: unique().replace(/\D/g, '').slice(-10).padStart(10, '6'),
    serviceId: t.service.id,
    startTime: at(hhmm),
    ...extra,
  });

const staffOf = (res: request.Response): string =>
  res.body.data.staffId ?? res.body.data.staff?.id;

describe('slots with no staff preference', () => {
  it("is the union of everyone's hours", async () => {
    const { t, members } = await team();
    await work(t, members[0].id, '09:00', '11:00');
    await work(t, members[1].id, '10:00', '13:00');
    const res = await slots(t);
    expect(res.status).toBe('ok');
    expect(res.slots!.map((s) => s.time)).toEqual([
      '09:00',
      '09:30',
      '10:00',
      '10:30',
      '11:00',
      '11:30',
      '12:00',
      '12:30',
    ]);
    expect(res.slots!.every((s) => s.available)).toBe(true);
  });

  it('a slot stays available while someone is free, and goes once everyone is booked', async () => {
    const { t, members } = await team();
    await work(t, members[0].id, '09:00', '13:00');
    await work(t, members[1].id, '09:00', '13:00');
    await book(t, members[0].id, '10:00');
    const one = await slots(t);
    expect(one.slots!.find((s) => s.time === '10:00')!.available).toBe(true);
    await book(t, members[1].id, '10:00');
    const both = await slots(t);
    expect(both.slots!.find((s) => s.time === '10:00')!.available).toBe(false);
    expect(both.slots!.find((s) => s.time === '10:30')!.available).toBe(true);
  });

  it('is closed when nobody works that day', async () => {
    const { t } = await team();
    expect(await slots(t)).toEqual({ status: 'closed' });
  });

  it('ignores a member who is not working or cannot take the service', async () => {
    const { t, members } = await team(2);
    await work(t, members[0].id, '09:00', '11:00');
    await work(t, members[1].id, '12:00', '13:00');
    await prisma.staffService.deleteMany({
      where: { userShopId: members[1].id },
    });
    const res = await slots(t);
    expect(res.slots!.map((s) => s.time)).toEqual([
      '09:00',
      '09:30',
      '10:00',
      '10:30',
    ]);
  });
});

describe('assignment with no staff preference', () => {
  it('gives the booking to the member with the fewest booked minutes, not the fewest bookings', async () => {
    const { t, members } = await team();
    await work(t, members[0].id, '09:00', '17:00');
    await work(t, members[1].id, '09:00', '17:00');
    // member 0: one 120-minute booking; member 1: three 30-minute bookings (90 min)
    await book(t, members[0].id, '09:00', 120);
    await book(t, members[1].id, '09:00');
    await book(t, members[1].id, '09:30');
    await book(t, members[1].id, '10:00');
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const res = await publicBook(t, '13:00');
    expect(res.status).toBe(201);
    expect(staffOf(res)).toBe(members[1].id);
  });

  it('gives the booking to the member with the fewest booked minutes when service lengths match', async () => {
    const { t, members } = await team();
    await work(t, members[0].id, '09:00', '17:00');
    await work(t, members[1].id, '09:00', '17:00');
    await book(t, members[0].id, '09:00');
    await book(t, members[0].id, '09:30');
    await book(t, members[1].id, '09:00');
    const res = await publicBook(t, '11:00');
    expect(res.status).toBe(201);
    expect(staffOf(res)).toBe(members[1].id);
  });

  it('picks randomly among members tied on booked minutes', async () => {
    const { t, members } = await team();
    await work(t, members[0].id, '09:00', '17:00');
    await work(t, members[1].id, '09:00', '17:00');
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const first = await publicBook(t, '11:00');
    const firstId = staffOf(first);
    expect(members.map((m) => m.id)).toContain(firstId);
    // Reset to a tie, then the other end of the random range picks the other one.
    await prisma.booking.deleteMany({ where: { shopId: t.shop.id } });
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    const second = await publicBook(t, '11:00');
    expect(staffOf(second)).not.toBe(firstId);
  });

  it('only considers members who work at that time', async () => {
    const { t, members } = await team();
    await work(t, members[0].id, '09:00', '11:00');
    await work(t, members[1].id, '12:00', '14:00');
    const res = await publicBook(t, '12:30');
    expect(res.status).toBe(201);
    expect(staffOf(res)).toBe(members[1].id);
  });

  it('skips a member who is already booked then, even with fewer bookings that day', async () => {
    const { t, members } = await team();
    await work(t, members[0].id, '09:00', '17:00');
    await work(t, members[1].id, '09:00', '17:00');
    await book(t, members[0].id, '09:00');
    await book(t, members[0].id, '09:30');
    await book(t, members[1].id, '11:00'); // member 1 is busy exactly then
    const res = await publicBook(t, '11:00');
    expect(res.status).toBe(201);
    expect(staffOf(res)).toBe(members[0].id);
  });

  it('does not count canceled bookings as load', async () => {
    const { t, members } = await team();
    await work(t, members[0].id, '09:00', '17:00');
    await work(t, members[1].id, '09:00', '17:00');
    const canceled = await book(t, members[1].id, '09:00');
    await prisma.booking.update({
      where: { id: canceled.id },
      data: { status: 'CANCELED' },
    });
    await book(t, members[0].id, '09:00');
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    // member 0 has 1 active booking, member 1 has 0: member 1 wins regardless of the roll
    const res = await publicBook(t, '11:00');
    expect(staffOf(res)).toBe(members[1].id);
  });

  it('409 when everyone working then is already booked', async () => {
    const { t, members } = await team();
    await work(t, members[0].id, '09:00', '13:00');
    await work(t, members[1].id, '09:00', '13:00');
    await book(t, members[0].id, '10:00');
    await book(t, members[1].id, '10:00');
    const res = await publicBook(t, '10:00');
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('SLOT_TAKEN');
  });

  it('422 SHOP_CLOSED when nobody works then', async () => {
    const { t, members } = await team();
    await work(t, members[0].id, '09:00', '11:00');
    await work(t, members[1].id, '09:00', '11:00');
    const res = await publicBook(t, '15:00');
    expect(res.status).toBe(422);
    expect(['SHOP_CLOSED', 'OUTSIDE_OPENING_HOURS']).toContain(res.body.code);
  });

  it('an explicit staff choice is still honoured', async () => {
    const { t, members } = await team();
    await work(t, members[0].id, '09:00', '17:00');
    await work(t, members[1].id, '09:00', '17:00');
    await book(t, members[1].id, '09:00');
    const res = await publicBook(t, '11:00', { staffId: members[1].id });
    expect(res.status).toBe(201);
    expect(staffOf(res)).toBe(members[1].id);
  });

  it('owner/staff booking with no staff and an accepted override picks a free member', async () => {
    const { t, members } = await team();
    await work(t, members[0].id, '09:00', '11:00');
    await work(t, members[1].id, '09:00', '11:00');
    await book(t, members[0].id, '15:00');
    const res = await api
      .post(`/api/shops/${t.shop.id}/bookings`)
      .set(authHeader(t.token))
      .send({
        name: 'C',
        phone: '6900000001',
        serviceId: t.service.id,
        startTime: at('15:00'),
        overrideRules: ['OUTSIDE_OPENING_HOURS', 'SHOP_CLOSED'],
      });
    expect(res.status).toBe(201);
    expect(staffOf(res)).toBe(members[1].id); // member 0 is busy at 15:00
  });
});

describe('public shop info hours', () => {
  it('derives opening hours from the team (union, merged)', () => {
    const range = (startTime: string, endTime: string) => ({
      startTime,
      endTime,
    });
    const sched = (days: [string, [string, string][]][]) => ({
      startDate: new Date('2026-01-01T00:00:00Z'),
      endDate: null,
      days: days.map(([day, hours]) => ({
        day: day as 'MON',
        isOpen: true,
        hours: hours.map(([a, b]) => range(a, b)),
      })),
    });
    const hours = deriveOpeningHours(
      [
        sched([['MON', [['09:00', '12:00']]]]),
        sched([
          [
            'MON',
            [
              ['11:00', '15:00'],
              ['17:00', '19:00'],
            ],
          ],
          ['TUE', [['10:00', '14:00']]],
        ]),
      ],
      '2026-12-08',
    );
    expect(hours.find((d) => d.day === 'MON')!.hours).toEqual([
      range('09:00', '15:00'),
      range('17:00', '19:00'),
    ]);
    expect(hours.find((d) => d.day === 'TUE')!.hours).toEqual([
      range('10:00', '14:00'),
    ]);
    expect(hours.find((d) => d.day === 'SUN')!.hours).toEqual([]);
  });

  it('ignores schedules not in force today', () => {
    const hours = deriveOpeningHours(
      [
        {
          startDate: new Date('2027-01-01T00:00:00Z'),
          endDate: null,
          days: [
            {
              day: 'MON',
              isOpen: true,
              hours: [{ startTime: '09:00', endTime: '17:00' }],
            },
          ],
        },
      ],
      '2026-12-08',
    );
    expect(hours.every((d) => d.hours.length === 0)).toBe(true);
  });

  it('GET /public/:slug returns openingHours and no shop-level schedules', async () => {
    const t = await createTenant('Pub');
    await addWeeklySchedule(t); // owner 09:00-13:00 every day
    const res = await api.get(`/public/${t.shop.slug}`);
    expect(res.status).toBe(200);
    expect(res.body.data.shopWorkingSchedules).toBeUndefined();
    expect(res.body.data.openingHours).toHaveLength(7);
    expect(res.body.data.openingHours[0]).toEqual({
      day: 'MON',
      hours: [{ startTime: '09:00', endTime: '13:00' }],
    });
  });
});
