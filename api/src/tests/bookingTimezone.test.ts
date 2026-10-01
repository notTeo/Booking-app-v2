import { describe, it, expect, vi, afterEach } from 'vitest';
import { prisma } from '../utils/prisma';
import {
  getAvailableSlots,
  getBookingStats,
  listBookings,
} from '../services/booking.service';
import { createTenant, unique, type Tenant } from './helpers';

vi.mock('../services/email.service');

type Day = 'MON' | 'SUN';

// Shop-wide schedule (staffId null) with one opening window, plus a service.
async function shopWithHours(opts: {
  timezone: string;
  day: Day;
  open: string;
  close: string;
  duration: number;
}) {
  const t = await createTenant('Tz');
  await prisma.shop.update({
    where: { id: t.shop.id },
    data: { timezone: opts.timezone },
  });
  await prisma.service.update({
    where: { id: t.service.id },
    data: { duration: opts.duration },
  });
  await prisma.shopWorkingSchedule.create({
    data: {
      shopId: t.shop.id,
      staffId: t.staff.id,
      startDate: new Date(Date.UTC(2027, 0, 1)),
      days: {
        create: [
          {
            day: opts.day,
            isOpen: true,
            hours: { create: [{ startTime: opts.open, endTime: opts.close }] },
          },
        ],
      },
    },
  });
  return t;
}

async function bookAt(t: Tenant, startIso: string, minutes: number) {
  const customer = await prisma.customer.create({
    data: { shopId: t.shop.id, name: 'c', phone: unique() },
  });
  const startTime = new Date(startIso);
  return prisma.booking.create({
    data: {
      shopId: t.shop.id,
      customerId: customer.id,
      serviceId: t.service.id,
      staffId: t.staff.id,
      startTime,
      endTime: new Date(startTime.getTime() + minutes * 60_000),
    },
  });
}

async function slotsFor(t: Tenant, date: string) {
  const res = await getAvailableSlots(t.shop.id, date, null, t.service.id);
  if (res.status !== 'ok') throw new Error(`expected ok, got ${res.status}`);
  return res.slots;
}

const times = (slots: { time: string }[]) => slots.map((s) => s.time);
const blocked = (slots: { time: string; available: boolean }[]) =>
  slots.filter((s) => !s.available).map((s) => s.time);

const ALL_9_TO_13 = [
  '09:00',
  '09:30',
  '10:00',
  '10:30',
  '11:00',
  '11:30',
  '12:00',
];

describe('slots are wall-clock in the SHOP timezone (Europe/Athens)', () => {
  // A booking at 10:00 Athens wall-clock, given as an unambiguous offset
  // instant, must block the 10:00-based slots on every date — including the
  // two DST-transition Sundays — no matter what TZ the server process has.
  const cases: [string, string, Day, string][] = [
    ['winter (EET, +02:00)', '2027-02-01', 'MON', '2027-02-01T10:00:00+02:00'],
    ['summer (EEST, +03:00)', '2027-07-05', 'MON', '2027-07-05T10:00:00+03:00'],
    [
      'DST-start day 2027-03-28',
      '2027-03-28',
      'SUN',
      '2027-03-28T10:00:00+03:00',
    ],
    [
      'DST-end day 2027-10-31',
      '2027-10-31',
      'SUN',
      '2027-10-31T10:00:00+02:00',
    ],
  ];

  for (const [label, date, day, bookingIso] of cases) {
    it(`${label}: 10:00 booking blocks 09:30/10:00/10:30 of a 60-min service`, async () => {
      const t = await shopWithHours({
        timezone: 'Europe/Athens',
        day,
        open: '09:00',
        close: '13:00',
        duration: 60,
      });
      await bookAt(t, bookingIso, 60);

      const slots = await slotsFor(t, date);

      expect(times(slots)).toEqual(ALL_9_TO_13);
      expect(blocked(slots)).toEqual(['09:30', '10:00', '10:30']);
    });
  }

  it('opening hours are not shifted by an hour across the DST boundary', async () => {
    const t = await shopWithHours({
      timezone: 'Europe/Athens',
      day: 'SUN',
      open: '09:00',
      close: '10:00',
      duration: 30,
    });
    // Book 09:00 Athens on the DST-start Sunday (EEST, +03:00 => 06:00Z).
    await bookAt(t, '2027-03-28T09:00:00+03:00', 30);

    const slots = await slotsFor(t, '2027-03-28');

    expect(times(slots)).toEqual(['09:00', '09:30']);
    expect(blocked(slots)).toEqual(['09:00']);
  });
});

describe('DST transition days generate sane slot lists', () => {
  it('2027-03-28: the nonexistent 03:00–03:59 hour produces no slots', async () => {
    const t = await shopWithHours({
      timezone: 'Europe/Athens',
      day: 'SUN',
      open: '02:00',
      close: '05:00',
      duration: 30,
    });

    const slots = await slotsFor(t, '2027-03-28');

    expect(times(slots)).toEqual(['02:00', '02:30', '04:00', '04:30']);
  });

  it('2027-03-28: a slot spanning the gap uses real elapsed time', async () => {
    const t = await shopWithHours({
      timezone: 'Europe/Athens',
      day: 'SUN',
      open: '02:00',
      close: '05:00',
      duration: 30,
    });
    // 02:30 EET = 00:30Z, 30 real minutes => ends 01:00Z = 04:00 EEST.
    await bookAt(t, '2027-03-28T02:30:00+02:00', 30);

    const slots = await slotsFor(t, '2027-03-28');

    expect(blocked(slots)).toEqual(['02:30']);
  });

  it('2027-10-31: the repeated 03:00–03:59 hour yields each label exactly once', async () => {
    const t = await shopWithHours({
      timezone: 'Europe/Athens',
      day: 'SUN',
      open: '02:00',
      close: '05:00',
      duration: 30,
    });

    const slots = await slotsFor(t, '2027-10-31');
    const labels = times(slots);

    expect(labels).toEqual([
      '02:00',
      '02:30',
      '03:00',
      '03:30',
      '04:00',
      '04:30',
    ]);
    expect(new Set(labels).size).toBe(labels.length);
  });
});

describe('a shop in another timezone uses THAT zone, not a hardcoded one', () => {
  it('America/New_York: 10:00 local booking (15:00Z in winter) blocks the 10:00 slot', async () => {
    const t = await shopWithHours({
      timezone: 'America/New_York',
      day: 'MON',
      open: '09:00',
      close: '13:00',
      duration: 60,
    });
    await bookAt(t, '2027-02-01T10:00:00-05:00', 60);

    const slots = await slotsFor(t, '2027-02-01');

    expect(times(slots)).toEqual(ALL_9_TO_13);
    expect(blocked(slots)).toEqual(['09:30', '10:00', '10:30']);
  });

  it('weekday is computed from the calendar date, independent of process TZ', async () => {
    // 2027-02-01 is a Monday. `new Date("2027-02-01").getDay()` returns Sunday
    // in any zone west of UTC.
    const t = await shopWithHours({
      timezone: 'America/New_York',
      day: 'MON',
      open: '09:00',
      close: '10:00',
      duration: 30,
    });

    const res = await getAvailableSlots(
      t.shop.id,
      '2027-02-01',
      null,
      t.service.id,
    );

    expect(res.status).toBe('ok');
  });
});

describe('day ranges are the shop-local day (half-open)', () => {
  it('listBookings(date) uses local midnight-to-midnight in Athens', async () => {
    const t = await createTenant('Range');
    const inLate = await bookAt(t, '2027-02-01T23:30:00+02:00', 30); // 21:30Z
    const inEarly = await bookAt(t, '2027-02-01T00:00:00+02:00', 30); // 22:00Z prev day
    // 1 minute, so it ends exactly when inEarly starts (a longer one would
    // overlap it, which the database now refuses).
    const outBefore = await bookAt(t, '2027-01-31T23:59:00+02:00', 1);
    const outAfter = await bookAt(t, '2027-02-02T00:00:00+02:00', 30);

    const got = (
      await listBookings(t.user.id, t.shop.id, { date: '2027-02-01' })
    ).map((b) => b.id);

    expect(got.sort()).toEqual([inLate.id, inEarly.id].sort());
    expect(got).not.toContain(outBefore.id);
    expect(got).not.toContain(outAfter.id);
  });

  it('the DST-start day is only 23 hours long', async () => {
    const t = await createTenant('Range');
    const first = await bookAt(t, '2027-03-28T00:00:00+02:00', 30); // 22:00Z
    const last = await bookAt(t, '2027-03-28T23:30:00+03:00', 30);
    const next = await bookAt(t, '2027-03-29T00:00:00+03:00', 30); // 21:00Z

    const got = (
      await listBookings(t.user.id, t.shop.id, { date: '2027-03-28' })
    ).map((b) => b.id);

    expect(got.sort()).toEqual([first.id, last.id].sort());
    expect(got).not.toContain(next.id);
  });
});

describe('"today" in stats is the shop-local day', () => {
  afterEach(() => vi.useRealTimers());

  it('at 22:30Z on Feb 1 it is already Feb 2 in Athens', async () => {
    const t = await createTenant('Stats');
    // Two bookings on Athens Feb 2, one on Athens Feb 1.
    await bookAt(t, '2027-02-02T09:00:00+02:00', 30);
    await bookAt(t, '2027-02-02T23:00:00+02:00', 30);
    await bookAt(t, '2027-02-01T12:00:00+02:00', 30);
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2027-02-01T22:30:00Z'));

    const stats = await getBookingStats(t.user.id, t.shop.id);

    expect(stats.todayCount).toBe(2);
  });
});
