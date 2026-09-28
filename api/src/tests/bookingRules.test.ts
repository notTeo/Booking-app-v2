import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import app from '../app';
import { prisma } from '../utils/prisma';
import {
  addService,
  addWeeklySchedule,
  authHeader,
  createTenant,
  type Tenant,
} from './helpers';

vi.mock('../services/email.service');

// Frozen clock (setup.ts): 2026-12-01T09:00Z = 11:00 Athens, a Tuesday.
// Default shop: Europe/Athens, hours 09:00–13:00 daily, service 30 min,
// maxAdvanceDays 60 => last bookable shop-local date is 2027-01-30.
const OK = '2026-12-08T10:00:00+02:00'; // Tue, valid slot
const PAST = '2026-11-30T10:00:00+02:00';
const BEYOND = '2027-01-31T10:00:00+02:00';
const LAST_DAY = '2027-01-30T10:00:00+02:00';
const SUNDAY = '2026-12-06T10:00:00+02:00';
const BEFORE_OPEN = '2026-12-08T08:00:00+02:00';
const AT_CLOSE = '2026-12-08T13:00:00+02:00';
const LAST_SLOT = '2026-12-08T12:30:00+02:00';
const OFF_GRID = '2026-12-08T10:15:00+02:00';

async function shop(opts: { sundayClosed?: boolean } = {}) {
  const t = await createTenant('Rules');
  await addWeeklySchedule(t, {
    closedDays: opts.sundayClosed ? ['SUN'] : [],
  });
  return t;
}

let phone = 6900000000;
const body = (t: Tenant, startTime: string, extra: object = {}) => ({
  name: 'Cust',
  phone: String(++phone),
  serviceId: t.service.id,
  staffId: t.staff.id,
  startTime,
  ...extra,
});
const pub = (t: Tenant, startTime: string, extra: object = {}) =>
  request(app)
    .post(`/public/${t.shop.slug}/book`)
    .send(body(t, startTime, extra));
const owner = (t: Tenant, startTime: string, extra: object = {}) =>
  request(app)
    .post(`/api/shops/${t.shop.id}/bookings`)
    .set(authHeader(t.token))
    .send(body(t, startTime, extra));

const RULE_CASES: [string, string, string][] = [
  ['in the past', PAST, 'BOOKING_IN_PAST'],
  ['beyond the advance window', BEYOND, 'BOOKING_BEYOND_ADVANCE_WINDOW'],
  ['on a closed day', SUNDAY, 'SHOP_CLOSED'],
  ['before opening', BEFORE_OPEN, 'OUTSIDE_OPENING_HOURS'],
  ['at closing time', AT_CLOSE, 'OUTSIDE_OPENING_HOURS'],
  ['off the 30-minute grid', OFF_GRID, 'OFF_SLOT_GRID'],
];

describe('public path: strict rules, 422 with a code', () => {
  it('accepts a valid slot, the last slot of the day, and the last allowed day', async () => {
    const t = await shop();
    expect((await pub(t, OK)).status).toBe(201);
    expect((await pub(t, LAST_SLOT)).status).toBe(201);
    expect((await pub(t, LAST_DAY)).status).toBe(201);
  });

  for (const [label, start, code] of RULE_CASES) {
    it(`rejects a booking ${label} with 422 ${code}`, async () => {
      const t = await shop({ sundayClosed: true });
      const res = await pub(t, start);
      expect(res.status).toBe(422);
      expect(res.body.code).toBe(code);
      expect(typeof res.body.message).toBe('string');
      expect(await prisma.booking.count({ where: { shopId: t.shop.id } })).toBe(
        0,
      );
    });
  }

  it('rejects when the shop has no schedule at all (SHOP_CLOSED)', async () => {
    const t = await createTenant('NoSched');
    const res = await pub(t, OK);
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('SHOP_CLOSED');
  });

  it('a service that would end after closing is OUTSIDE_OPENING_HOURS', async () => {
    const t = await shop();
    const long = await addService(t, 60);
    const res = await pub(t, LAST_SLOT, { serviceId: long.id });
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('OUTSIDE_OPENING_HOURS');
  });

  it('honours a per-shop maxAdvanceDays', async () => {
    const t = await shop();
    await prisma.shop.update({
      where: { id: t.shop.id },
      data: { maxAdvanceDays: 7 },
    });
    expect((await pub(t, '2026-12-08T10:00:00+02:00')).status).toBe(201); // +7 days
    const res = await pub(t, '2026-12-09T10:00:00+02:00'); // +8 days
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('BOOKING_BEYOND_ADVANCE_WINDOW');
  });

  it('no staff preference validates against the shop-wide schedule (like slots)', async () => {
    const t = await createTenant('Any');
    await addWeeklySchedule(t, { staffId: null });
    const res = await request(app).post(`/public/${t.shop.slug}/book`).send({
      name: 'C',
      phone: '6911111111',
      serviceId: t.service.id,
      startTime: OK,
    });
    expect(res.status).toBe(201);
    // ...but an explicit staff member with no schedule of their own is closed.
    const explicit = await pub(t, OK);
    expect(explicit.status).toBe(422);
    expect(explicit.body.code).toBe('SHOP_CLOSED');
  });

  it('ignores override: true from the public', async () => {
    const t = await shop();
    const res = await pub(t, PAST, { override: true });
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('BOOKING_IN_PAST');
  });

  it('is DST-correct: 04:00 EEST and 02:30 EET on 2027-03-28 are valid slots', async () => {
    const t = await createTenant('Dst');
    await addWeeklySchedule(t, { open: '02:00', close: '05:00' });
    await prisma.shop.update({
      where: { id: t.shop.id },
      data: { maxAdvanceDays: 365 },
    });
    expect((await pub(t, '2027-03-28T04:00:00+03:00')).status).toBe(201);
    expect((await pub(t, '2027-03-28T02:30:00+02:00')).status).toBe(201);
    // 04:15 is inside hours but off the grid
    const off = await pub(t, '2027-03-28T04:15:00+03:00');
    expect(off.body.code).toBe('OFF_SLOT_GRID');
  });
});

describe('owner path: same rules, bypassable with override: true', () => {
  for (const [label, start, code] of RULE_CASES) {
    it(`${label}: 422 ${code} without override, 201 with it`, async () => {
      const t = await shop({ sundayClosed: true });
      const denied = await owner(t, start);
      expect(denied.status).toBe(422);
      expect(denied.body.code).toBe(code);

      const allowed = await owner(t, start, { override: true });
      expect(allowed.status).toBe(201);
    });
  }

  it('rejects a non-boolean override with 400', async () => {
    const t = await shop();
    expect((await owner(t, OK, { override: 'yes' })).status).toBe(400);
  });
});

describe('overlap is NEVER bypassable', () => {
  it('owner override cannot double-book an occupied slot (409)', async () => {
    const t = await shop();
    expect((await owner(t, OK)).status).toBe(201);
    const exact = await owner(t, OK, { override: true });
    expect(exact.status).toBe(409);
    expect(exact.body.code).toBe('SLOT_TAKEN');
    expect(
      (await owner(t, '2026-12-08T10:15:00+02:00', { override: true })).status,
    ).toBe(409);
    expect(await prisma.booking.count({ where: { shopId: t.shop.id } })).toBe(
      1,
    );
  });

  it('public double-booking is 409 too', async () => {
    const t = await shop();
    expect((await pub(t, OK)).status).toBe(201);
    expect((await pub(t, OK)).status).toBe(409);
  });

  it('a rule violation is reported before the overlap check only for the rules, and overlap still wins with override', async () => {
    const t = await shop();
    expect((await owner(t, PAST, { override: true })).status).toBe(201);
    expect((await owner(t, PAST, { override: true })).status).toBe(409);
  });
});

describe('PATCH: rules and override apply when scheduling changes', () => {
  async function booked(t: Tenant, start = OK) {
    const res = await owner(t, start);
    expect(res.status).toBe(201);
    return res.body.data.id as string;
  }
  const patch = (t: Tenant, id: string, data: object) =>
    request(app)
      .patch(`/api/shops/${t.shop.id}/bookings/${id}`)
      .set(authHeader(t.token))
      .send(data);

  it('rescheduling outside opening hours is 422 without override, 200 with it', async () => {
    const t = await shop();
    const id = await booked(t);
    const denied = await patch(t, id, { startTime: BEFORE_OPEN });
    expect(denied.status).toBe(422);
    expect(denied.body.code).toBe('OUTSIDE_OPENING_HOURS');
    expect(
      (await patch(t, id, { startTime: BEFORE_OPEN, override: true })).status,
    ).toBe(200);
  });

  it('rescheduling onto another booking is 409 even with override', async () => {
    const t = await shop();
    const id = await booked(t, OK);
    await booked(t, '2026-12-08T11:00:00+02:00');
    const res = await patch(t, id, {
      startTime: '2026-12-08T11:00:00+02:00',
      override: true,
    });
    expect(res.status).toBe(409);
  });

  it('notes-only edits skip the rules entirely', async () => {
    const t = await shop();
    const id = await booked(t);
    await prisma.booking.update({
      where: { id },
      data: {
        startTime: new Date(PAST),
        endTime: new Date('2026-11-30T08:30:00Z'),
      },
    });
    expect((await patch(t, id, { notes: 'hello' })).status).toBe(200);
  });

  describe('changing service recomputes endTime and re-checks overlap', () => {
    it('longer service colliding with the next booking is 409 and changes nothing', async () => {
      const t = await shop();
      const long = await addService(t, 60);
      const id = await booked(t, OK); // 10:00–10:30
      await booked(t, '2026-12-08T10:30:00+02:00'); // next booking
      const before = await prisma.booking.findUnique({ where: { id } });

      const res = await patch(t, id, { serviceId: long.id });

      expect(res.status).toBe(409);
      const after = await prisma.booking.findUnique({ where: { id } });
      expect(after?.serviceId).toBe(t.service.id);
      expect(after?.endTime.toISOString()).toBe(before!.endTime.toISOString());
    });

    it('override does not bypass that collision', async () => {
      const t = await shop();
      const long = await addService(t, 60);
      const id = await booked(t, OK);
      await booked(t, '2026-12-08T10:30:00+02:00');
      expect(
        (await patch(t, id, { serviceId: long.id, override: true })).status,
      ).toBe(409);
    });

    it('longer service that fits updates endTime to start + new duration', async () => {
      const t = await shop();
      const long = await addService(t, 60);
      const id = await booked(t, OK);
      const res = await patch(t, id, { serviceId: long.id });
      expect(res.status).toBe(200);
      expect(res.body.data.endTime).toBe(
        new Date('2026-12-08T11:00:00+02:00').toISOString(),
      );
    });

    it('shorter service shortens endTime', async () => {
      const t = await shop();
      const short = await addService(t, 15);
      const id = await booked(t, OK);
      const res = await patch(t, id, { serviceId: short.id });
      expect(res.status).toBe(200);
      expect(res.body.data.endTime).toBe(
        new Date('2026-12-08T10:15:00+02:00').toISOString(),
      );
    });

    it('a longer service that runs past closing is 422 without override, 200 with it', async () => {
      const t = await shop();
      const long = await addService(t, 60);
      const id = await booked(t, LAST_SLOT);
      const denied = await patch(t, id, { serviceId: long.id });
      expect(denied.status).toBe(422);
      expect(denied.body.code).toBe('OUTSIDE_OPENING_HOURS');
      expect(
        (await patch(t, id, { serviceId: long.id, override: true })).status,
      ).toBe(200);
    });
  });
});
