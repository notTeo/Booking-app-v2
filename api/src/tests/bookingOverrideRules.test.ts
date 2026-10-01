import { describe, it, expect, vi } from 'vitest';
import app from '../app';
import { serve } from './testRequest';
import { prisma } from '../utils/prisma';
import {
  addWeeklySchedule,
  authHeader,
  createTenant,
  type Tenant,
} from './helpers';

const api = await serve(app);

vi.mock('../services/email.service');

// Frozen clock (setup.ts): 2026-12-01T09:00Z = 11:00 Athens, a Tuesday.
// Shop hours 09:00–13:00 daily, 30-minute service, maxAdvanceDays 60.
const OK = '2026-12-08T10:00:00+02:00';
const BEFORE_OPEN = '2026-12-08T08:00:00+02:00'; // OUTSIDE_OPENING_HOURS only
const PAST_AND_EARLY = '2026-11-30T08:00:00+02:00'; // past + outside hours
const PAST_ON_SUNDAY = '2026-11-29T10:00:00+02:00'; // past + closed day
const BEYOND = '2027-02-02T10:00:00+02:00'; // a Tuesday beyond the window only

const ALL_OVERRIDABLE = [
  'OUTSIDE_OPENING_HOURS',
  'SHOP_CLOSED',
  'BOOKING_IN_PAST',
  'OFF_SLOT_GRID',
];

async function shop() {
  const t = await createTenant('Override');
  await addWeeklySchedule(t, { closedDays: ['SUN'] });
  return t;
}

let phone = 6800000000;
const payload = (t: Tenant, startTime: string, extra: object = {}) => ({
  name: 'Cust',
  phone: String(++phone),
  serviceId: t.service.id,
  staffId: t.staff.id,
  startTime,
  ...extra,
});
const owner = (t: Tenant, startTime: string, extra: object = {}) =>
  api
    .post(`/api/shops/${t.shop.id}/bookings`)
    .set(authHeader(t.token))
    .send(payload(t, startTime, extra));
const pub = (t: Tenant, startTime: string, extra: object = {}) =>
  api.post(`/public/${t.shop.slug}/book`).send(payload(t, startTime, extra));
const patch = (t: Tenant, id: string, data: object) =>
  api
    .patch(`/api/shops/${t.shop.id}/bookings/${id}`)
    .set(authHeader(t.token))
    .send(data);

const codesOf = (res: { body: { violations?: { code: string }[] } }) =>
  (res.body.violations ?? []).map((v) => v.code).sort();
const stored = (id: string) =>
  prisma.booking.findUniqueOrThrow({ where: { id } });

describe('owner create: the explicit overrideRules contract', () => {
  it('a 422 lists ALL violations, not just the first', async () => {
    const t = await shop();
    const res = await owner(t, PAST_AND_EARLY);
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('BOOKING_IN_PAST');
    expect(codesOf(res)).toEqual(['BOOKING_IN_PAST', 'OUTSIDE_OPENING_HOURS']);
    expect(
      res.body.violations.every((v: { overridable: boolean }) => v.overridable),
    ).toBe(true);
    expect(res.body.violations[0].message).toEqual(expect.any(String));

    const closed = await owner(t, PAST_ON_SUNDAY);
    expect(codesOf(closed)).toEqual(['BOOKING_IN_PAST', 'SHOP_CLOSED']);
  });

  it('an incomplete overrideRules is still 422 and still lists every violation', async () => {
    const t = await shop();
    const res = await owner(t, PAST_AND_EARLY, {
      overrideRules: ['OUTSIDE_OPENING_HOURS'],
    });
    expect(res.status).toBe(422);
    // the primary code is the first violation that was NOT accepted
    expect(res.body.code).toBe('BOOKING_IN_PAST');
    expect(codesOf(res)).toEqual(['BOOKING_IN_PAST', 'OUTSIDE_OPENING_HOURS']);
    expect(await prisma.booking.count({ where: { shopId: t.shop.id } })).toBe(
      0,
    );
  });

  it('accepting every violated code creates the booking and stores exactly those', async () => {
    const t = await shop();
    const res = await owner(t, PAST_AND_EARLY, {
      overrideRules: ALL_OVERRIDABLE,
    });
    expect(res.status).toBe(201);
    expect([...res.body.data.overriddenRules].sort()).toEqual([
      'BOOKING_IN_PAST',
      'OUTSIDE_OPENING_HOURS',
    ]);
    expect(res.body.data.createdById).toBe(t.user.id);
    const row = await stored(res.body.data.id);
    expect([...row.overriddenRules].sort()).toEqual([
      'BOOKING_IN_PAST',
      'OUTSIDE_OPENING_HOURS',
    ]);
  });

  it('codes that were accepted but not violated are NOT stored', async () => {
    const t = await shop();
    const inHours = await owner(t, OK, { overrideRules: ALL_OVERRIDABLE });
    expect(inHours.status).toBe(201);
    expect(inHours.body.data.overriddenRules).toEqual([]);

    const early = await owner(t, BEFORE_OPEN, {
      overrideRules: ALL_OVERRIDABLE,
    });
    expect(early.status).toBe(201);
    expect(early.body.data.overriddenRules).toEqual(['OUTSIDE_OPENING_HOURS']);
  });

  it('a booking made without any override stores [] and still records its creator', async () => {
    const t = await shop();
    const res = await owner(t, OK);
    expect(res.status).toBe(201);
    expect(res.body.data.overriddenRules).toEqual([]);
    expect(res.body.data.createdById).toBe(t.user.id);
  });

  it.each([true, false, 'yes'])(
    'the old blanket override (%s) is rejected with 400 and creates nothing',
    async (value) => {
      const t = await shop();
      const res = await owner(t, BEFORE_OPEN, { override: value });
      expect(res.status).toBe(400);
      expect(await prisma.booking.count({ where: { shopId: t.shop.id } })).toBe(
        0,
      );
    },
  );

  it.each([
    ['BOOKING_BEYOND_ADVANCE_WINDOW'],
    ['NOT_A_RULE'],
    ['BOOKING_IN_PAST', 'nope'],
  ])('overrideRules containing %s is rejected with 400', async (...codes) => {
    const t = await shop();
    const res = await owner(t, OK, { overrideRules: codes });
    expect(res.status).toBe(400);
  });

  it.each(['OUTSIDE_OPENING_HOURS', { a: 1 }, 7, [1]])(
    'overrideRules must be an array of strings (%j)',
    async (bad) => {
      const t = await shop();
      const res = await owner(t, OK, { overrideRules: bad });
      expect(res.status).toBe(400);
    },
  );

  it('BOOKING_BEYOND_ADVANCE_WINDOW can never be overridden', async () => {
    const t = await shop();
    const res = await owner(t, BEYOND, { overrideRules: ALL_OVERRIDABLE });
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('BOOKING_BEYOND_ADVANCE_WINDOW');
    expect(res.body.violations).toEqual([
      expect.objectContaining({
        code: 'BOOKING_BEYOND_ADVANCE_WINDOW',
        overridable: false,
      }),
    ]);
    expect(await prisma.booking.count({ where: { shopId: t.shop.id } })).toBe(
      0,
    );
  });

  it('the stored codes do not change when the shop schedule is edited later', async () => {
    const t = await shop();
    const res = await owner(t, BEFORE_OPEN, {
      overrideRules: ['OUTSIDE_OPENING_HOURS'],
    });
    expect(res.status).toBe(201);
    // Owner now opens at 06:00: the booking would no longer be out-of-hours.
    await prisma.shopWorkingHourRange.updateMany({
      where: { day: { schedule: { shopId: t.shop.id } } },
      data: { startTime: '06:00' },
    });
    const row = await stored(res.body.data.id);
    expect(row.overriddenRules).toEqual(['OUTSIDE_OPENING_HOURS']);
  });

  it('overlap is never bypassable, with overrideRules set', async () => {
    const t = await shop();
    const rules = { overrideRules: ALL_OVERRIDABLE };
    expect((await owner(t, PAST_AND_EARLY, rules)).status).toBe(201);
    const again = await owner(t, PAST_AND_EARLY, rules);
    expect(again.status).toBe(409);
    expect(again.body.code).toBe('SLOT_TAKEN');
  });
});

describe('public path: unchanged and strict', () => {
  it('stores [] and no creator', async () => {
    const t = await shop();
    const res = await pub(t, OK);
    expect(res.status).toBe(201);
    const row = await stored(res.body.data.id);
    expect(row.overriddenRules).toEqual([]);
    expect(row.createdById).toBeNull();
  });

  it('ignores overrideRules and override: still 422, nothing created', async () => {
    const t = await shop();
    for (const extra of [
      { overrideRules: ALL_OVERRIDABLE },
      { override: true },
    ]) {
      const res = await pub(t, BEFORE_OPEN, extra);
      expect(res.status).toBe(422);
      expect(res.body.code).toBe('OUTSIDE_OPENING_HOURS');
    }
    expect(await prisma.booking.count({ where: { shopId: t.shop.id } })).toBe(
      0,
    );
  });
});

describe('PATCH: the same contract when scheduling changes', () => {
  async function booked(t: Tenant, start = OK) {
    const res = await owner(t, start);
    expect(res.status).toBe(201);
    return res.body.data.id as string;
  }

  it('rescheduling out of hours needs overrideRules and stores them', async () => {
    const t = await shop();
    const id = await booked(t);
    const denied = await patch(t, id, { startTime: BEFORE_OPEN });
    expect(denied.status).toBe(422);
    expect(codesOf(denied)).toEqual(['OUTSIDE_OPENING_HOURS']);

    const ok = await patch(t, id, {
      startTime: BEFORE_OPEN,
      overrideRules: ['OUTSIDE_OPENING_HOURS'],
    });
    expect(ok.status).toBe(200);
    expect((await stored(id)).overriddenRules).toEqual([
      'OUTSIDE_OPENING_HOURS',
    ]);
  });

  it('a reschedule back into hours replaces the stored codes with []', async () => {
    const t = await shop();
    const id = await booked(t);
    await patch(t, id, {
      startTime: BEFORE_OPEN,
      overrideRules: ['OUTSIDE_OPENING_HOURS'],
    });
    expect((await stored(id)).overriddenRules).toEqual([
      'OUTSIDE_OPENING_HOURS',
    ]);
    expect((await patch(t, id, { startTime: OK })).status).toBe(200);
    expect((await stored(id)).overriddenRules).toEqual([]);
  });

  it('a notes-only edit leaves the stored codes and the creator untouched', async () => {
    const t = await shop();
    const id = await booked(t);
    await patch(t, id, {
      startTime: BEFORE_OPEN,
      overrideRules: ['OUTSIDE_OPENING_HOURS'],
    });
    const before = await stored(id);
    const res = await patch(t, id, { notes: 'regular' });
    expect(res.status).toBe(200);
    const after = await stored(id);
    expect(after.overriddenRules).toEqual(before.overriddenRules);
    expect(after.createdById).toBe(t.user.id);
  });

  it('the blanket override is rejected with 400 and changes nothing', async () => {
    const t = await shop();
    const id = await booked(t);
    const res = await patch(t, id, { startTime: BEFORE_OPEN, override: true });
    expect(res.status).toBe(400);
    expect((await stored(id)).startTime.toISOString()).toBe(
      new Date(OK).toISOString(),
    );
  });

  it('a non-overridable code is rejected with 400', async () => {
    const t = await shop();
    const id = await booked(t);
    const res = await patch(t, id, {
      startTime: BEFORE_OPEN,
      overrideRules: ['BOOKING_BEYOND_ADVANCE_WINDOW'],
    });
    expect(res.status).toBe(400);
  });

  it('overlap is never bypassable on PATCH either', async () => {
    const t = await shop();
    const a = await booked(t, OK);
    await booked(t, '2026-12-08T11:00:00+02:00');
    const res = await patch(t, a, {
      startTime: '2026-12-08T11:00:00+02:00',
      overrideRules: ALL_OVERRIDABLE,
    });
    expect(res.status).toBe(409);
  });
});
