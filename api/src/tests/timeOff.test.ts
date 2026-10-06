import { describe, it, expect, vi } from 'vitest';
import app from '../app';
import { serve } from './testRequest';
import { prisma } from '../utils/prisma';
import { subtractRanges } from '../utils/slots';
import {
  addManager,
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
// Default test shop: Europe/Athens, 09:00–13:00 daily, 30-minute service.
const MON = '2026-12-07';
const TUE = '2026-12-08';
const WED = '2026-12-09';
const THU = '2026-12-10';

const day = (date: string) => new Date(`${date}T00:00:00.000Z`);

async function shop() {
  const t = await createTenant('Off');
  await addWeeklySchedule(t);
  return t;
}

// Straight into the table, for the availability tests.
const off = (
  t: Tenant,
  staffId: string | null,
  from: string,
  to = from,
  hours?: [string, string],
) =>
  prisma.timeOff.create({
    data: {
      shopId: t.shop.id,
      staffId,
      startDate: day(from),
      endDate: day(to),
      ...(hours && { startTime: hours[0], endTime: hours[1] }),
    },
  });

type Slots = { status: string; slots?: { time: string }[] };
const publicSlots = async (t: Tenant, date: string, staffId?: string) =>
  (
    await api.get(
      `/public/${t.shop.slug}/slots?date=${date}&serviceId=${t.service.id}${staffId ? `&staffId=${staffId}` : ''}`,
    )
  ).body.data as Slots;
const times = (s: Slots) => (s.slots ?? []).map((x) => x.time);

let phone = 6700000000;
const payload = (t: Tenant, startTime: string, extra: object = {}) => ({
  name: 'Cust',
  phone: String(++phone),
  serviceId: t.service.id,
  staffId: t.staff.id,
  startTime,
  ...extra,
});
const ownerBook = (t: Tenant, startTime: string, extra: object = {}) =>
  api
    .post(`/api/shops/${t.shop.id}/bookings`)
    .set(authHeader(t.token))
    .send(payload(t, startTime, extra));
const publicBook = (t: Tenant, startTime: string) =>
  api.post(`/public/${t.shop.slug}/book`).send(payload(t, startTime));

const base = (t: Tenant) => `/api/shops/${t.shop.id}/time-off`;
const create = (t: Tenant, body: object, token = t.token) =>
  api.post(base(t)).set(authHeader(token)).send(body);

describe('subtractRanges', () => {
  const r = (startTime: string, endTime: string) => ({ startTime, endTime });

  it('cuts a hole in the middle of a range', () => {
    expect(
      subtractRanges([r('09:00', '17:00')], [r('12:00', '13:00')]),
    ).toEqual([r('09:00', '12:00'), r('13:00', '17:00')]);
  });

  it('trims an edge', () => {
    expect(
      subtractRanges([r('09:00', '17:00')], [r('08:00', '10:00')]),
    ).toEqual([r('10:00', '17:00')]);
    expect(
      subtractRanges([r('09:00', '17:00')], [r('16:00', '18:00')]),
    ).toEqual([r('09:00', '16:00')]);
  });

  it('removes a range that is fully covered', () => {
    expect(
      subtractRanges(
        [r('09:00', '12:00'), r('15:00', '19:00')],
        [r('08:00', '13:00')],
      ),
    ).toEqual([r('15:00', '19:00')]);
  });

  it('leaves ranges alone when nothing overlaps', () => {
    expect(
      subtractRanges([r('09:00', '12:00')], [r('12:00', '13:00')]),
    ).toEqual([r('09:00', '12:00')]);
  });

  it('applies several cuts', () => {
    expect(
      subtractRanges(
        [r('09:00', '17:00')],
        [r('10:00', '11:00'), r('14:00', '15:00')],
      ),
    ).toEqual([r('09:00', '10:00'), r('11:00', '14:00'), r('15:00', '17:00')]);
  });
});

describe('time off and availability', () => {
  it('a whole day off closes that day only', async () => {
    const t = await shop();
    await off(t, t.staff.id, TUE);
    expect((await publicSlots(t, TUE)).status).toBe('closed');
    expect((await publicSlots(t, MON)).status).toBe('ok');
    expect((await publicSlots(t, WED)).status).toBe('ok');
  });

  it('a date range is inclusive on both ends', async () => {
    const t = await shop();
    await off(t, t.staff.id, TUE, WED);
    expect((await publicSlots(t, MON)).status).toBe('ok');
    expect((await publicSlots(t, TUE)).status).toBe('closed');
    expect((await publicSlots(t, WED)).status).toBe('closed');
    expect((await publicSlots(t, THU)).status).toBe('ok');
  });

  it("one member's time off leaves the others bookable", async () => {
    const t = await shop();
    const maria = await createStaffMember(t, 'Maria');
    await addWeeklySchedule(t, { staffId: maria.staff.id });
    await prisma.staffService.create({
      data: { userShopId: maria.staff.id, serviceId: t.service.id },
    });
    await off(t, t.staff.id, TUE);
    expect((await publicSlots(t, TUE, t.staff.id)).status).toBe('closed');
    expect((await publicSlots(t, TUE, maria.staff.id)).status).toBe('ok');
    expect((await publicSlots(t, TUE)).status).toBe('ok');
  });

  it('shop-wide time off closes every member', async () => {
    const t = await shop();
    const maria = await createStaffMember(t, 'Maria');
    await addWeeklySchedule(t, { staffId: maria.staff.id });
    await prisma.staffService.create({
      data: { userShopId: maria.staff.id, serviceId: t.service.id },
    });
    await off(t, null, TUE);
    expect((await publicSlots(t, TUE)).status).toBe('closed');
    expect((await publicSlots(t, TUE, maria.staff.id)).status).toBe('closed');
  });

  it("another shop's time off changes nothing", async () => {
    const t = await shop();
    const other = await shop();
    await off(other, null, TUE);
    expect((await publicSlots(t, TUE)).status).toBe('ok');
  });

  it('part of a day removes only those start times', async () => {
    const t = await shop();
    await off(t, t.staff.id, TUE, TUE, ['10:00', '11:30']);
    expect(times(await publicSlots(t, TUE))).toEqual([
      '09:00',
      '09:30',
      '11:30',
      '12:00',
      '12:30',
    ]);
  });

  it('part-day time off that covers all the hours closes the day', async () => {
    const t = await shop();
    await off(t, t.staff.id, TUE, TUE, ['08:00', '14:00']);
    expect((await publicSlots(t, TUE)).status).toBe('closed');
  });

  it('the calendar day schedule reflects it', async () => {
    const t = await shop();
    const maria = await createStaffMember(t, 'Maria');
    await addWeeklySchedule(t, { staffId: maria.staff.id });
    await off(t, t.staff.id, TUE, TUE, ['10:00', '11:00']);
    await off(t, maria.staff.id, TUE);
    const res = await api
      .get(`/api/shops/${t.shop.id}/schedules/day?date=${TUE}`)
      .set(authHeader(t.token));
    expect(res.body.data).toEqual({
      [t.staff.id]: [
        { startTime: '09:00', endTime: '10:00' },
        { startTime: '11:00', endTime: '13:00' },
      ],
      [maria.staff.id]: null,
    });
  });

  it('a customer cannot book into time off', async () => {
    const t = await shop();
    await off(t, t.staff.id, TUE);
    const res = await publicBook(t, `${TUE}T10:00:00+02:00`);
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('SHOP_CLOSED');
  });

  it('the owner can, by accepting the rule', async () => {
    const t = await shop();
    await off(t, t.staff.id, TUE);
    await off(t, t.staff.id, WED, WED, ['10:00', '11:00']);

    const refused = await ownerBook(t, `${TUE}T10:00:00+02:00`);
    expect(refused.status).toBe(422);
    expect(refused.body.code).toBe('SHOP_CLOSED');
    const accepted = await ownerBook(t, `${TUE}T10:00:00+02:00`, {
      overrideRules: ['SHOP_CLOSED'],
    });
    expect(accepted.status).toBe(201);

    const partDay = await ownerBook(t, `${WED}T10:00:00+02:00`);
    expect(partDay.status).toBe(422);
    expect(partDay.body.code).toBe('OUTSIDE_OPENING_HOURS');
  });
});

describe('time-off routes', () => {
  it('creates a whole-day entry for a member', async () => {
    const t = await shop();
    const res = await create(t, {
      staffId: t.staff.id,
      startDate: TUE,
      endDate: WED,
      note: 'Vacation',
    });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      staffId: t.staff.id,
      startDate: `${TUE}T00:00:00.000Z`,
      endDate: `${WED}T00:00:00.000Z`,
      startTime: null,
      endTime: null,
      note: 'Vacation',
      affectedBookings: 0,
    });
    expect((await publicSlots(t, TUE)).status).toBe('closed');
  });

  it('creates a shop-wide, part-day entry', async () => {
    const t = await shop();
    const res = await create(t, {
      staffId: null,
      startDate: TUE,
      endDate: TUE,
      startTime: '09:00',
      endTime: '10:00',
    });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      staffId: null,
      startTime: '09:00',
      endTime: '10:00',
    });
    expect(times(await publicSlots(t, TUE))[0]).toBe('10:00');
  });

  it('managers can write, staff cannot', async () => {
    const t = await shop();
    const manager = await addManager(t);
    const staff = await createStaffMember(t);
    const body = { staffId: null, startDate: TUE, endDate: TUE };
    expect((await create(t, body, manager.token)).status).toBe(201);
    expect((await create(t, body, staff.token)).status).toBe(403);
  });

  it('rejects bad input', async () => {
    const t = await shop();
    const ok = { staffId: null, startDate: TUE, endDate: TUE };
    const bad = [
      { ...ok, startDate: 'tomorrow' },
      { ...ok, endDate: MON }, // before the start
      { ...ok, endDate: '2028-12-08' }, // longer than a year
      { ...ok, startTime: '10:00' }, // end missing
      { ...ok, startTime: '11:00', endTime: '10:00' },
      { ...ok, startTime: '25:00', endTime: '26:00' },
      { ...ok, note: 'x'.repeat(201) },
    ];
    for (const body of bad) {
      expect((await create(t, body)).status, JSON.stringify(body)).toBe(400);
    }
  });

  it("404s for a member of another shop, and for another shop's entry", async () => {
    const t = await shop();
    const other = await shop();
    const res = await create(t, {
      staffId: other.staff.id,
      startDate: TUE,
      endDate: TUE,
    });
    expect(res.status).toBe(404);

    const theirs = await off(other, null, TUE);
    const del = await api
      .delete(`${base(t)}/${theirs.id}`)
      .set(authHeader(t.token));
    expect(del.status).toBe(404);
    expect(await prisma.timeOff.count({ where: { id: theirs.id } })).toBe(1);
  });

  it('lists shop-wide entries, plus a member’s own when asked', async () => {
    const t = await shop();
    const maria = await createStaffMember(t, 'Maria');
    const shopWide = await off(t, null, WED);
    const mine = await off(t, t.staff.id, TUE);
    await off(t, maria.staff.id, MON);

    const all = await api.get(base(t)).set(authHeader(maria.token));
    expect(all.status).toBe(200);
    expect(all.body.data.map((e: { id: string }) => e.id)).toEqual([
      shopWide.id,
    ]);

    const forMember = await api
      .get(`${base(t)}?memberId=${t.staff.id}`)
      .set(authHeader(t.token));
    expect(forMember.body.data.map((e: { id: string }) => e.id)).toEqual([
      mine.id,
      shopWide.id,
    ]);

    const unknown = await api
      .get(`${base(t)}?memberId=nope`)
      .set(authHeader(t.token));
    expect(unknown.status).toBe(404);
  });

  it('updates and deletes', async () => {
    const t = await shop();
    const entry = await off(t, t.staff.id, TUE);
    const res = await api
      .patch(`${base(t)}/${entry.id}`)
      .set(authHeader(t.token))
      .send({
        startDate: WED,
        endDate: WED,
        startTime: '09:00',
        endTime: '10:00',
      });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      startDate: `${WED}T00:00:00.000Z`,
      startTime: '09:00',
      endTime: '10:00',
    });
    expect((await publicSlots(t, TUE)).status).toBe('ok');

    // Back to a whole day; a patch may not leave the dates the wrong way round.
    const wholeDay = await api
      .patch(`${base(t)}/${entry.id}`)
      .set(authHeader(t.token))
      .send({ startTime: null, endTime: null });
    expect(wholeDay.body.data.startTime).toBeNull();
    const backwards = await api
      .patch(`${base(t)}/${entry.id}`)
      .set(authHeader(t.token))
      .send({ endDate: TUE });
    expect(backwards.status).toBe(400);

    const del = await api
      .delete(`${base(t)}/${entry.id}`)
      .set(authHeader(t.token));
    expect(del.status).toBe(200);
    expect((await publicSlots(t, WED)).status).toBe('ok');
  });

  it('counts the bookings already inside the time off', async () => {
    const t = await shop();
    const maria = await createStaffMember(t, 'Maria');
    // Athens is UTC+2 in December: 08:00Z = 10:00, 10:00Z = 12:00.
    await createBookingRow(t, `${TUE}T08:00:00.000Z`);
    await createBookingRow(t, `${TUE}T10:00:00.000Z`);
    await createBookingRow(t, `${WED}T08:00:00.000Z`);
    await createBookingRow(t, `${TUE}T09:00:00.000Z`, 'CANCELED');
    const marias = await createBookingRow(t, `${TUE}T08:30:00.000Z`);
    await prisma.booking.update({
      where: { id: marias.id },
      data: { staffId: maria.staff.id },
    });

    const count = async (body: object) =>
      (await create(t, body)).body.data.affectedBookings;

    expect(
      await count({ staffId: t.staff.id, startDate: TUE, endDate: TUE }),
    ).toBe(2);
    expect(
      await count({ staffId: t.staff.id, startDate: TUE, endDate: WED }),
    ).toBe(3);
    expect(await count({ staffId: null, startDate: TUE, endDate: TUE })).toBe(
      3,
    );
    expect(
      await count({
        staffId: t.staff.id,
        startDate: TUE,
        endDate: WED,
        startTime: '09:00',
        endTime: '11:00',
      }),
    ).toBe(2);
    expect(await count({ staffId: null, startDate: THU, endDate: THU })).toBe(
      0,
    );
  });

  it('removing a member removes their time off', async () => {
    const t = await shop();
    const maria = await createStaffMember(t, 'Maria');
    await off(t, maria.staff.id, TUE);
    await prisma.userShop.delete({ where: { id: maria.staff.id } });
    expect(await prisma.timeOff.count({ where: { shopId: t.shop.id } })).toBe(
      0,
    );
  });
});
