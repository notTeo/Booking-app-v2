import { describe, it, expect, vi } from 'vitest';
import app from '../app';
import { serve } from './testRequest';
import { prisma } from '../utils/prisma';
import {
  addWeeklySchedule,
  authHeader,
  createBookingRow,
  createStaffMember,
  createTenant,
  type Tenant,
} from './helpers';

const api = await serve(app);

vi.mock('../services/email.service');

// Frozen clock (setup.ts): 2026-12-01T09:00Z = 11:00 Athens (Tuesday).
// Default test shop: Europe/Athens, 09:00–13:00, 30-minute service.
const TUE = '2026-12-08';
const SUN = '2026-12-06';

type Slot = {
  time: string;
  available: boolean;
  outsideHours?: boolean;
  past?: boolean;
  reason?: string;
};

const slotsReq = (t: Tenant, date: string, qs = '', token = t.token) =>
  api
    .get(
      `/api/shops/${t.shop.id}/bookings/slots?date=${date}&serviceId=${t.service.id}&staffId=${t.staff.id}&${qs}`,
    )
    .set(authHeader(token));
const withFlag = (t: Tenant, date = TUE) =>
  slotsReq(t, date, 'includeOutsideHours=true');
const times = (slots: Slot[]) => slots.map((s) => s.time);
const outside = (slots: Slot[]) => slots.filter((s) => s.outsideHours);

async function shop() {
  const t = await createTenant('Ooh');
  await addWeeklySchedule(t);
  return t;
}

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const;
// A schedule with explicit ranges per weekday (missing weekday = closed).
async function addSchedule(
  t: Tenant,
  opts: {
    staffId: string | null;
    startDate?: string;
    endDate?: string;
    ranges: Partial<Record<(typeof DAYS)[number], [string, string][]>>;
  },
) {
  return prisma.shopWorkingSchedule.create({
    data: {
      shopId: t.shop.id,
      staffId: opts.staffId,
      startDate: new Date(`${opts.startDate ?? '2026-01-01'}T00:00:00.000Z`),
      ...(opts.endDate && {
        endDate: new Date(`${opts.endDate}T00:00:00.000Z`),
      }),
      days: {
        create: DAYS.map((day) => {
          const r = opts.ranges[day];
          return r
            ? {
                day,
                isOpen: true,
                hours: {
                  create: r.map(([startTime, endTime]) => ({
                    startTime,
                    endTime,
                  })),
                },
              }
            : { day, isOpen: false };
        }),
      },
    },
  });
}
const everyDay = (r: [string, string][]) =>
  Object.fromEntries(DAYS.map((d) => [d, r])) as Record<
    (typeof DAYS)[number],
    [string, string][]
  >;

describe('without the flag the response is exactly what it was', () => {
  it('in-hours slots carry only {time, available}', async () => {
    const t = await shop();
    const res = await slotsReq(t, TUE);
    expect(res.body.data.status).toBe('ok');
    expect(res.body.data.slots[0]).toEqual({ time: '09:00', available: true });
    expect(res.body.data.slots).toHaveLength(8);
  });

  it('a closed day is still {status:"closed"} with no slots key', async () => {
    const t = await createTenant('Ooh');
    await addWeeklySchedule(t, { closedDays: ['SUN'] });
    expect((await slotsReq(t, SUN)).body.data).toEqual({ status: 'closed' });
  });
});

describe('includeOutsideHours=true on a working day', () => {
  it('keeps the in-hours grid and adds a 15-minute out-of-hours grid capped at -3h / +4h', async () => {
    const t = await shop();
    const res = await withFlag(t);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('ok');
    const slots: Slot[] = res.body.data.slots;

    // in-hours: the same 8 opening-anchored 30-minute slots, flagged in-hours
    const inHours = slots.filter((s) => !s.outsideHours);
    expect(times(inHours)).toEqual([
      '09:00',
      '09:30',
      '10:00',
      '10:30',
      '11:00',
      '11:30',
      '12:00',
      '12:30',
    ]);

    const t0 = times(outside(slots));
    // 3 h before 09:00 => 06:00 is the first; nothing earlier
    expect(t0[0]).toBe('06:00');
    expect(t0).not.toContain('05:45');
    // 4 h after 13:00 => 17:00 is the last; nothing later
    expect(t0[t0.length - 1]).toBe('17:00');
    expect(t0).not.toContain('17:15');
    // midnight-anchored 15-minute grid
    expect(t0.every((x) => ['00', '15', '30', '45'].includes(x.slice(3)))).toBe(
      true,
    );
    expect(t0).toContain('08:45');
    expect(t0).toContain('13:15');
    // every slot appears once and the list is in time order
    expect(new Set(times(slots)).size).toBe(slots.length);
    expect(times(slots)).toEqual([...times(slots)].sort());
  });

  it('labels the reason: before opening / after closing', async () => {
    const t = await shop();
    const slots: Slot[] = (await withFlag(t)).body.data.slots;
    const by = (time: string) => slots.find((s) => s.time === time)!;
    expect(by('06:00').reason).toBe('BEFORE_OPENING');
    expect(by('08:45').reason).toBe('BEFORE_OPENING');
    expect(by('13:00').reason).toBe('AFTER_CLOSING');
    expect(by('17:00').reason).toBe('AFTER_CLOSING');
    expect(by('09:00').reason).toBeUndefined();
  });

  it('a start inside opening hours that would run past closing is outside hours; an on-hours off-grid start is not listed', async () => {
    const t = await shop();
    const slots: Slot[] = (await withFlag(t)).body.data.slots;
    // 12:45 + 30 min ends 13:15, after closing
    const late = slots.find((s) => s.time === '12:45')!;
    expect(late.outsideHours).toBe(true);
    expect(late.reason).toBe('AFTER_CLOSING');
    // 09:15 / 12:15 fit inside hours but are off the 30-minute grid:
    // reachable via "Other time…", not part of the out-of-hours list
    expect(times(slots)).not.toContain('09:15');
    expect(times(slots)).not.toContain('12:15');
  });

  it('shows breaks between opening ranges in full', async () => {
    const t = await createTenant('Ooh');
    await addSchedule(t, {
      staffId: t.staff.id,
      ranges: everyDay([
        ['09:00', '12:00'],
        ['15:00', '19:00'],
      ]),
    });
    const slots: Slot[] = (await withFlag(t)).body.data.slots;
    for (const x of ['12:00', '12:15', '13:00', '14:00', '14:30', '14:45']) {
      const s = slots.find((y) => y.time === x);
      expect(s, x).toBeDefined();
      expect(s!.outsideHours, x).toBe(true);
      expect(s!.reason, x).toBe('BREAK');
    }
    // 11:45 + 30 min crosses into the break
    expect(slots.find((s) => s.time === '11:45')!.reason).toBe('BREAK');
    // the second shift's own grid is in-hours again
    expect(slots.find((s) => s.time === '15:00')!.outsideHours).toBe(false);
    // caps are measured from the FIRST opening and LAST closing
    const out = times(outside(slots));
    expect(out[0]).toBe('06:00');
    expect(out[out.length - 1]).toBe('23:00');
  });

  it('marks booked slots unavailable (out-of-hours too) and ignores canceled ones', async () => {
    const t = await createTenant('Ooh');
    await addSchedule(t, {
      staffId: t.staff.id,
      ranges: everyDay([['09:00', '17:00']]), // grid reaches 21:00
    });
    await createBookingRow(t, '2026-12-08T18:00:00+02:00'); // 18:00–18:30, out of hours
    await createBookingRow(t, '2026-12-08T16:00:00+02:00', 'CANCELED');
    const slots: Slot[] = (await withFlag(t)).body.data.slots;
    const av = (x: string) => slots.find((s) => s.time === x)!.available;
    expect(av('17:30')).toBe(true); // 17:30–18:00 touches, does not overlap
    expect(av('17:45')).toBe(false);
    expect(av('18:00')).toBe(false);
    expect(av('18:15')).toBe(false);
    expect(av('18:30')).toBe(true);
    expect(av('16:00')).toBe(true); // canceled booking frees it
  });

  it('flags slots that are already in the past (today, shop time)', async () => {
    const t = await shop();
    // frozen clock: 11:00 Athens on 2026-12-01
    const slots: Slot[] = (await withFlag(t, '2026-12-01')).body.data.slots;
    const past = (x: string) => slots.find((s) => s.time === x)!.past;
    expect(past('06:00')).toBe(true);
    expect(past('10:30')).toBe(true);
    expect(past('11:30')).toBe(false);
    expect(past('12:30')).toBe(false);
    // a later day has nothing in the past
    const later: Slot[] = (await withFlag(t)).body.data.slots;
    expect(later.every((s) => s.past === false)).toBe(true);
  });
});

describe('includeOutsideHours=true on a closed day / a provider day off', () => {
  it('no regular hours anywhere => 08:00–22:00 at 15 minutes, all CLOSED_DAY', async () => {
    const t = await createTenant('Ooh');
    await addWeeklySchedule(t, { closedDays: ['SUN'] });
    const res = await withFlag(t, SUN);
    expect(res.body.data.status).toBe('closed');
    const slots: Slot[] = res.body.data.slots;
    expect(slots[0].time).toBe('08:00');
    expect(slots[slots.length - 1].time).toBe('21:45');
    expect(slots).toHaveLength(56);
    expect(
      slots.every((s) => s.outsideHours && s.reason === 'CLOSED_DAY'),
    ).toBe(true);
  });

  // A second team member who performs the service, with their own schedules.
  async function colleague(t: Tenant) {
    const q = await createStaffMember(t, 'Colleague');
    await prisma.staffService.create({
      data: { userShopId: q.staff.id, serviceId: t.service.id },
    });
    return q.staff;
  }

  it("uses the team's hours for that weekday when the provider's own day is off", async () => {
    const t = await createTenant('Ooh');
    const q = await colleague(t);
    await addSchedule(t, {
      staffId: t.staff.id,
      ranges: { MON: [['09:00', '17:00']] }, // provider: only Mondays
    });
    await addSchedule(t, {
      staffId: q.id,
      ranges: { SUN: [['10:00', '14:00']] },
    });
    const slots: Slot[] = (await withFlag(t, SUN)).body.data.slots;
    expect(slots[0].time).toBe('10:00');
    expect(slots[slots.length - 1].time).toBe('13:45');
    expect(slots.every((s) => s.reason === 'CLOSED_DAY')).toBe(true);
  });

  it("takes each member's latest-starting schedule that is open that weekday, even one not yet active on the date", async () => {
    const t = await createTenant('Ooh');
    const q = await colleague(t);
    await addSchedule(t, {
      staffId: t.staff.id,
      ranges: { MON: [['09:00', '17:00']] },
    });
    await addSchedule(t, {
      staffId: q.id,
      startDate: '2026-01-01',
      endDate: '2027-06-01', // active schedules can't overlap (DB constraint)
      ranges: { SUN: [['10:00', '14:00']] },
    });
    await addSchedule(t, {
      staffId: q.id,
      startDate: '2027-06-01', // starts after the requested date
      endDate: '2028-01-01',
      ranges: { SUN: [['11:00', '15:00']] },
    });
    await addSchedule(t, {
      staffId: q.id,
      startDate: '2028-01-01', // latest, but closed on Sunday: skipped
      ranges: { MON: [['09:00', '17:00']] },
    });
    const slots: Slot[] = (await withFlag(t, SUN)).body.data.slots;
    expect(slots[0].time).toBe('11:00');
    expect(slots[slots.length - 1].time).toBe('14:45');
  });

  it('booked slots on a closed day are unavailable', async () => {
    const t = await createTenant('Ooh');
    await addWeeklySchedule(t, { closedDays: ['SUN'] });
    await createBookingRow(t, '2026-12-06T10:00:00+02:00');
    const slots: Slot[] = (await withFlag(t, SUN)).body.data.slots;
    expect(slots.find((s) => s.time === '10:00')!.available).toBe(false);
    expect(slots.find((s) => s.time === '10:30')!.available).toBe(true);
  });
});

describe('DST days: no duplicates, no nonexistent slots, no crash', () => {
  it('2027-03-28 (Athens 03:00–04:00 does not exist)', async () => {
    const t = await createTenant('Ooh');
    await addSchedule(t, {
      staffId: t.staff.id,
      ranges: everyDay([['05:00', '10:00']]),
    });
    const res = await withFlag(t, '2027-03-28');
    expect(res.status).toBe(200);
    const list = times(res.body.data.slots);
    expect(new Set(list).size).toBe(list.length);
    for (const gap of ['03:00', '03:15', '03:30', '03:45'])
      expect(list, gap).not.toContain(gap);
    expect(list).toContain('02:45');
    expect(list).toContain('04:00');
  });

  it('2027-10-31 (Athens 03:00–04:00 occurs twice)', async () => {
    const t = await createTenant('Ooh');
    await addSchedule(t, {
      staffId: t.staff.id,
      ranges: everyDay([['05:00', '10:00']]),
    });
    const res = await withFlag(t, '2027-10-31');
    expect(res.status).toBe(200);
    const list = times(res.body.data.slots);
    expect(new Set(list).size).toBe(list.length);
    for (const amb of ['03:00', '03:15', '03:30', '03:45'])
      expect(
        list.filter((x) => x === amb),
        amb,
      ).toHaveLength(1);
  });
});

describe('access, scope and the public endpoint', () => {
  it('requires authentication and membership', async () => {
    const t = await shop();
    const other = await createTenant('Other');
    const anon = await api.get(
      `/api/shops/${t.shop.id}/bookings/slots?date=${TUE}&serviceId=${t.service.id}&includeOutsideHours=true`,
    );
    expect(anon.status).toBe(401);
    expect((await withFlag(t)).status).toBe(200);
    expect(
      (await slotsReq(t, TUE, 'includeOutsideHours=true', other.token)).status,
    ).toBe(404);
  });

  it('respects bookableInternally=false and active=false (closed, no slots)', async () => {
    const t = await shop();
    await prisma.userShop.update({
      where: { id: t.staff.id },
      data: { bookableInternally: false },
    });
    expect((await withFlag(t)).body.data).toEqual({
      status: 'closed',
      slots: [],
    });
    await prisma.userShop.update({
      where: { id: t.staff.id },
      data: { bookableInternally: true, active: false },
    });
    expect((await withFlag(t)).body.data).toEqual({
      status: 'closed',
      slots: [],
    });
  });

  it("does not leak across tenants: another shop's service yields closed with no slots", async () => {
    const A = await shop();
    const B = await shop();
    const res = await api
      .get(
        `/api/shops/${A.shop.id}/bookings/slots?date=${TUE}&serviceId=${B.service.id}&staffId=${A.staff.id}&includeOutsideHours=true`,
      )
      .set(authHeader(A.token));
    expect(res.body.data).toEqual({ status: 'closed', slots: [] });
  });

  it('rejects a non-boolean includeOutsideHours with 400', async () => {
    const t = await shop();
    expect((await slotsReq(t, TUE, 'includeOutsideHours=maybe')).status).toBe(
      400,
    );
  });

  it('the public endpoint never offers out-of-hours slots, whatever the query says', async () => {
    const t = await shop();
    const q = `date=${TUE}&serviceId=${t.service.id}&staffId=${t.staff.id}`;
    const plain = await api.get(`/public/${t.shop.slug}/slots?${q}`);
    const flagged = await api.get(
      `/public/${t.shop.slug}/slots?${q}&includeOutsideHours=true`,
    );
    expect(flagged.body.data).toEqual(plain.body.data);
    const list: Slot[] = flagged.body.data.slots;
    expect(list.every((s) => s.time >= '09:00' && s.time <= '12:30')).toBe(
      true,
    );
    expect(list.every((s) => s.outsideHours === undefined)).toBe(true);

    // a closed day stays a plain closed on the public page
    const closedShop = await createTenant('Ooh');
    await addWeeklySchedule(closedShop, { closedDays: ['SUN'] });
    const sun = await api.get(
      `/public/${closedShop.shop.slug}/slots?date=${SUN}&serviceId=${closedShop.service.id}&staffId=${closedShop.staff.id}&includeOutsideHours=true`,
    );
    expect(Object.keys(sun.body.data)).toEqual(['status']);
  });
});
