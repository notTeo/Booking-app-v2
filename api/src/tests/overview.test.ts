import request from 'supertest';
import app from '../app';
import { signAccessToken } from '../utils/jwt';
import { prisma } from '../utils/prisma';
import type { BookingStatus } from '../../dist/generated/prisma';
import {
  authHeader,
  createBookingRow,
  createStaffMember,
  createTenant,
  type Tenant,
} from './helpers';
import { overviewWindow } from '../services/overview.service';

// TEST_NOW is Tue 2026-12-01 09:00Z: 2026-12-01 in Athens, UTC and New York.
// Week = Mon 30 Nov - Sun 6 Dec; month = Dec 2026; quarter = Dec 2026 - Feb 2027.
// Minted per call: some tests move the fake clock, which would age a token.
const get = (t: Tenant, range?: string, token = signAccessToken(t.user.id)) =>
  request(app)
    .get(`/api/shops/${t.shop.id}/overview${range ? `?range=${range}` : ''}`)
    .set(authHeader(token));

const at = (t: Tenant, iso: string, status?: BookingStatus) =>
  createBookingRow(t, iso, status);

const setZone = (t: Tenant, timezone: string) =>
  prisma.shop.update({ where: { id: t.shop.id }, data: { timezone } });

type B = { start: string; end: string; count: number };
const countOn = (buckets: B[], start: string) =>
  buckets.find((b) => b.start === start)?.count;

describe('overviewWindow', () => {
  it('week: the Monday-Sunday week containing today', () => {
    const w = overviewWindow('week', '2026-12-01');
    expect(w.from).toBe('2026-11-30');
    expect(w.to).toBe('2026-12-06');
    expect(w.buckets).toHaveLength(7);
    expect(w.buckets[0].start).toBe('2026-11-30');
    expect(w.buckets[6].end).toBe('2026-12-06');
  });

  it.each([
    ['2026-11-30', '2026-11-30'], // Monday
    ['2026-12-06', '2026-11-30'], // Sunday
    ['2026-12-07', '2026-12-07'], // next Monday
  ])('week containing %s starts %s', (today, monday) => {
    expect(overviewWindow('week', today).from).toBe(monday);
  });

  it('month: every day of the current calendar month', () => {
    const w = overviewWindow('month', '2026-12-15');
    expect(w.from).toBe('2026-12-01');
    expect(w.to).toBe('2026-12-31');
    expect(w.buckets).toHaveLength(31);
    expect(overviewWindow('month', '2027-02-10').buckets).toHaveLength(28);
    expect(overviewWindow('month', '2028-02-10').buckets).toHaveLength(29);
    expect(overviewWindow('month', '2026-11-30').buckets).toHaveLength(30);
  });

  it('quarter: this month and the next two, in weeks clipped to the period', () => {
    const w = overviewWindow('quarter', '2026-12-01');
    expect(w.from).toBe('2026-12-01');
    expect(w.to).toBe('2027-02-28');
    expect(w.buckets).toHaveLength(13);
    // Dec 1 is a Tuesday: the first week is clipped to start on the 1st.
    expect(w.buckets[0]).toEqual({
      key: '2026-11-30',
      start: '2026-12-01',
      end: '2026-12-06',
    });
    expect(w.buckets[1].start).toBe('2026-12-07');
    expect(w.buckets[12].end).toBe('2027-02-28');
  });

  it('quarter: clips the last week when the period ends mid-week', () => {
    // Jan 2027 + 2 months = through 31 Mar 2027 (a Wednesday).
    const w = overviewWindow('quarter', '2027-01-15');
    expect(w.from).toBe('2027-01-01');
    expect(w.to).toBe('2027-03-31');
    const last = w.buckets[w.buckets.length - 1];
    expect(last).toEqual({
      key: '2027-03-29',
      start: '2027-03-29',
      end: '2027-03-31',
    });
    expect(w.buckets[0].start).toBe('2027-01-01'); // a Friday
  });

  it('quarter: rolls over the year', () => {
    const w = overviewWindow('quarter', '2026-11-20');
    expect(w.from).toBe('2026-11-01');
    expect(w.to).toBe('2027-01-31');
  });

  it('buckets are contiguous and cover [from, to] exactly', () => {
    for (const range of ['week', 'month', 'quarter'] as const) {
      const w = overviewWindow(range, '2027-03-31');
      expect(w.buckets[0].start).toBe(w.from);
      expect(w.buckets[w.buckets.length - 1].end).toBe(w.to);
      for (let i = 1; i < w.buckets.length; i++) {
        const prevEnd = new Date(`${w.buckets[i - 1].end}T00:00:00Z`).getTime();
        const start = new Date(`${w.buckets[i].start}T00:00:00Z`).getTime();
        expect(start - prevEnd).toBe(24 * 3600 * 1000);
      }
    }
  });
});

describe('GET /api/shops/:shopId/overview', () => {
  describe('validation', () => {
    it('rejects an unknown range', async () => {
      const t = await createTenant('Ovv');
      expect((await get(t, 'year')).status).toBe(400);
    });

    it('rejects a missing range', async () => {
      const t = await createTenant('Ovv');
      expect((await get(t)).status).toBe(400);
    });

    it('rejects a malformed shopId', async () => {
      const t = await createTenant('Ovv');
      const res = await request(app)
        .get('/api/shops/bad%20id!/overview?range=week')
        .set(authHeader(t.token));
      expect(res.status).toBe(400);
    });
  });

  describe('auth', () => {
    it('401 without a token', async () => {
      const t = await createTenant('Ovv');
      const res = await request(app).get(
        `/api/shops/${t.shop.id}/overview?range=week`,
      );
      expect(res.status).toBe(401);
    });

    it("404 for another shop's owner", async () => {
      const a = await createTenant('OvvA');
      const b = await createTenant('OvvB');
      expect((await get(a, 'week', signAccessToken(b.user.id))).status).toBe(
        404,
      );
    });

    it('allows staff of the shop', async () => {
      const t = await createTenant('Ovv');
      const staff = await createStaffMember(t);
      expect((await get(t, 'week', staff.token)).status).toBe(200);
    });
  });

  describe('shape', () => {
    it('reports the period, today and the buckets', async () => {
      const t = await createTenant('Ovv');
      const { data } = (await get(t, 'week')).body;
      expect(data).toMatchObject({
        range: 'week',
        from: '2026-11-30',
        to: '2026-12-06',
        today: '2026-12-01',
        hasAnyBookings: false,
      });
      expect(Object.keys(data.buckets[0]).sort()).toEqual([
        'count',
        'end',
        'start',
      ]);
    });
  });

  describe('totals', () => {
    it('counts each status; all excludes canceled', async () => {
      const t = await createTenant('Ovv');
      await at(t, '2026-11-30T10:00:00Z', 'PENDING');
      await at(t, '2026-11-30T11:00:00Z', 'PENDING');
      await at(t, '2026-11-30T12:00:00Z', 'CONFIRMED');
      await at(t, '2026-12-01T12:00:00Z', 'COMPLETED');
      await at(t, '2026-12-01T13:00:00Z', 'CANCELED');
      await at(t, '2026-12-02T13:00:00Z', 'NO_SHOW');
      const { data } = (await get(t, 'week')).body;
      expect(data.totals).toEqual({
        all: 5,
        pending: 2,
        confirmed: 1,
        completed: 1,
        canceled: 1,
        noShow: 1,
      });
    });

    it('includes future bookings in the period', async () => {
      const t = await createTenant('Ovv');
      await at(t, '2026-12-05T10:00:00Z', 'CONFIRMED'); // Saturday, in the future
      await at(t, '2026-12-20T10:00:00Z', 'PENDING'); // later this month
      const week = (await get(t, 'week')).body.data;
      expect(week.totals.all).toBe(1);
      expect(countOn(week.buckets, '2026-12-05')).toBe(1);
      const month = (await get(t, 'month')).body.data;
      expect(month.totals).toMatchObject({ all: 2, confirmed: 1, pending: 1 });
    });

    it('ignores bookings outside the period and other shops', async () => {
      const t = await createTenant('Ovv');
      const other = await createTenant('Other');
      await at(t, '2026-11-29T10:00:00Z'); // Sunday before the week
      await at(t, '2026-12-07T10:00:00Z'); // Monday after the week
      await at(other, '2026-12-02T10:00:00Z');
      const { data } = (await get(t, 'week')).body;
      expect(data.totals.all).toBe(0);
    });
  });

  describe('buckets', () => {
    it('week: Monday to Sunday, empty buckets present with count 0', async () => {
      const t = await createTenant('Ovv');
      await at(t, '2026-11-30T10:00:00Z');
      await at(t, '2026-11-30T14:00:00Z');
      await at(t, '2026-12-01T08:00:00Z');
      await at(t, '2026-12-04T08:00:00Z'); // a future day
      await at(t, '2026-11-30T15:00:00Z', 'CANCELED');
      const { buckets } = (await get(t, 'week')).body.data;
      expect(buckets.map((b: B) => b.start)).toEqual([
        '2026-11-30',
        '2026-12-01',
        '2026-12-02',
        '2026-12-03',
        '2026-12-04',
        '2026-12-05',
        '2026-12-06',
      ]);
      expect(buckets.map((b: B) => b.count)).toEqual([2, 1, 0, 0, 1, 0, 0]);
    });

    it('month: one bucket per day of the calendar month', async () => {
      const t = await createTenant('Ovv');
      await at(t, '2026-12-01T10:00:00Z');
      await at(t, '2026-12-31T10:00:00Z');
      await at(t, '2026-11-30T10:00:00Z'); // last month
      await at(t, '2027-01-01T10:00:00Z'); // next month
      const { data } = (await get(t, 'month')).body;
      expect(data.from).toBe('2026-12-01');
      expect(data.to).toBe('2026-12-31');
      expect(data.buckets).toHaveLength(31);
      expect(data.buckets[0]).toEqual({
        start: '2026-12-01',
        end: '2026-12-01',
        count: 1,
      });
      expect(countOn(data.buckets, '2026-12-31')).toBe(1);
      expect(data.totals.all).toBe(2);
    });

    it('quarter: this month and the next two, in clipped Monday-start weeks', async () => {
      const t = await createTenant('Ovv');
      await at(t, '2026-12-01T10:00:00Z'); // Tue: first (clipped) week
      await at(t, '2026-12-06T10:00:00Z'); // Sun: still the first week
      await at(t, '2026-12-07T10:00:00Z'); // Mon: second week
      await at(t, '2027-02-28T10:00:00Z'); // last day of the period
      await at(t, '2027-03-01T10:00:00Z'); // after the period
      await at(t, '2026-11-30T10:00:00Z'); // before the period
      const { data } = (await get(t, 'quarter')).body;
      expect(data.from).toBe('2026-12-01');
      expect(data.to).toBe('2027-02-28');
      expect(data.buckets).toHaveLength(13);
      expect(data.buckets[0]).toEqual({
        start: '2026-12-01',
        end: '2026-12-06',
        count: 2,
      });
      expect(data.buckets[1]).toEqual({
        start: '2026-12-07',
        end: '2026-12-13',
        count: 1,
      });
      expect(data.buckets[12]).toEqual({
        start: '2027-02-22',
        end: '2027-02-28',
        count: 1,
      });
      expect(data.totals.all).toBe(4);
    });

    it('bucket counts add up to the non-canceled total', async () => {
      const t = await createTenant('Ovv');
      for (const [i, d] of ['02', '09', '16', '23'].entries()) {
        await at(
          t,
          `2026-12-${d}T10:00:00Z`,
          i === 3 ? 'CANCELED' : 'CONFIRMED',
        );
      }
      for (const range of ['week', 'month', 'quarter']) {
        const { data } = (await get(t, range)).body;
        const sum = data.buckets.reduce((n: number, b: B) => n + b.count, 0);
        expect(sum).toBe(data.totals.all);
      }
    });
  });

  describe('hasAnyBookings', () => {
    it('false for a shop with no bookings', async () => {
      const t = await createTenant('Ovv');
      expect((await get(t, 'month')).body.data.hasAnyBookings).toBe(false);
    });

    it('true when bookings exist only outside the period', async () => {
      const t = await createTenant('Ovv');
      await at(t, '2027-09-01T10:00:00Z');
      const { data } = (await get(t, 'week')).body;
      expect(data.totals.all).toBe(0);
      expect(data.hasAnyBookings).toBe(true);
    });

    it('counts canceled bookings too', async () => {
      const t = await createTenant('Ovv');
      await at(t, '2026-01-10T10:00:00Z', 'CANCELED');
      expect((await get(t, 'week')).body.data.hasAnyBookings).toBe(true);
    });

    it("ignores other shops' bookings", async () => {
      const t = await createTenant('Ovv');
      const other = await createTenant('Other');
      await at(other, '2026-12-02T10:00:00Z');
      expect((await get(t, 'week')).body.data.hasAnyBookings).toBe(false);
    });
  });

  describe('timezones (period and day boundaries are the shop’s)', () => {
    it('Europe/Athens: 22:30Z is already the next local day', async () => {
      const t = await createTenant('Ovv');
      await setZone(t, 'Europe/Athens');
      await at(t, '2026-12-01T22:30:00Z'); // Wed 2 Dec 00:30 Athens
      const { buckets } = (await get(t, 'week')).body.data;
      expect(countOn(buckets, '2026-12-02')).toBe(1);
      expect(countOn(buckets, '2026-12-01')).toBe(0);
    });

    it('America/New_York: 03:30Z is still the previous local day', async () => {
      const t = await createTenant('Ovv');
      await setZone(t, 'America/New_York');
      await at(t, '2026-12-02T03:30:00Z'); // Tue 1 Dec 22:30 New York
      const { buckets } = (await get(t, 'week')).body.data;
      expect(countOn(buckets, '2026-12-01')).toBe(1);
      expect(countOn(buckets, '2026-12-02')).toBe(0);
    });

    it('UTC: boundaries are plain UTC midnight', async () => {
      const t = await createTenant('Ovv');
      await setZone(t, 'UTC');
      await at(t, '2026-12-01T23:00:00Z');
      await at(t, '2026-12-02T01:00:00Z');
      const { buckets } = (await get(t, 'week')).body.data;
      expect(countOn(buckets, '2026-12-01')).toBe(1);
      expect(countOn(buckets, '2026-12-02')).toBe(1);
    });

    it('"today" follows the shop zone, not the server', async () => {
      const t = await createTenant('Ovv');
      await setZone(t, 'America/New_York');
      vi.setSystemTime(new Date('2026-12-07T03:00:00Z')); // Sun 6 Dec 22:00 NY
      const ny = (await get(t, 'week')).body.data;
      expect(ny.today).toBe('2026-12-06');
      expect(ny.from).toBe('2026-11-30'); // still last week's Monday
      await setZone(t, 'Europe/Athens'); // Mon 7 Dec 05:00 Athens
      const athens = (await get(t, 'week')).body.data;
      expect(athens.today).toBe('2026-12-07');
      expect(athens.from).toBe('2026-12-07');
      expect(athens.to).toBe('2026-12-13');
    });

    it('week edges: Sunday night and Monday morning in Athens', async () => {
      const t = await createTenant('Ovv');
      await setZone(t, 'Europe/Athens');
      await at(t, '2026-11-29T21:30:00Z'); // Sun 29 Nov 23:30 Athens: previous week
      await at(t, '2026-11-29T22:30:00Z'); // Mon 30 Nov 00:30 Athens: first day
      await at(t, '2026-12-06T21:30:00Z'); // Sun 6 Dec 23:30 Athens: last day
      await at(t, '2026-12-06T22:30:00Z'); // Mon 7 Dec 00:30 Athens: next week
      const { data } = (await get(t, 'week')).body;
      expect(data.totals.all).toBe(2);
      expect(countOn(data.buckets, '2026-11-30')).toBe(1);
      expect(countOn(data.buckets, '2026-12-06')).toBe(1);
    });

    it('week edges in New York', async () => {
      const t = await createTenant('Ovv');
      await setZone(t, 'America/New_York');
      await at(t, '2026-11-30T04:30:00Z'); // Sun 29 Nov 23:30 NY: previous week
      await at(t, '2026-11-30T05:30:00Z'); // Mon 30 Nov 00:30 NY: first day
      await at(t, '2026-12-07T04:30:00Z'); // Sun 6 Dec 23:30 NY: last day
      await at(t, '2026-12-07T05:30:00Z'); // Mon 7 Dec 00:30 NY: next week
      const { data } = (await get(t, 'week')).body;
      expect(data.totals.all).toBe(2);
      expect(countOn(data.buckets, '2026-11-30')).toBe(1);
      expect(countOn(data.buckets, '2026-12-06')).toBe(1);
    });

    it('month edges in Athens', async () => {
      const t = await createTenant('Ovv');
      await setZone(t, 'Europe/Athens');
      await at(t, '2026-11-30T21:30:00Z'); // 30 Nov 23:30 Athens: last month
      await at(t, '2026-11-30T22:30:00Z'); // 1 Dec 00:30 Athens: first day
      await at(t, '2026-12-31T21:30:00Z'); // 31 Dec 23:30 Athens: last day
      await at(t, '2026-12-31T22:30:00Z'); // 1 Jan 00:30 Athens: next month
      const { data } = (await get(t, 'month')).body;
      expect(data.totals.all).toBe(2);
      expect(countOn(data.buckets, '2026-12-01')).toBe(1);
      expect(countOn(data.buckets, '2026-12-31')).toBe(1);
    });

    it('month edges in New York', async () => {
      const t = await createTenant('Ovv');
      await setZone(t, 'America/New_York');
      await at(t, '2026-12-01T04:30:00Z'); // 30 Nov 23:30 NY: last month
      await at(t, '2026-12-01T05:30:00Z'); // 1 Dec 00:30 NY: first day
      await at(t, '2027-01-01T04:30:00Z'); // 31 Dec 23:30 NY: last day
      await at(t, '2027-01-01T05:30:00Z'); // 1 Jan 00:30 NY: next month
      const { data } = (await get(t, 'month')).body;
      expect(data.totals.all).toBe(2);
      expect(countOn(data.buckets, '2026-12-01')).toBe(1);
      expect(countOn(data.buckets, '2026-12-31')).toBe(1);
    });

    it('month edges in UTC', async () => {
      const t = await createTenant('Ovv');
      await setZone(t, 'UTC');
      await at(t, '2026-11-30T23:30:00Z');
      await at(t, '2026-12-01T00:00:00Z');
      await at(t, '2026-12-31T23:30:00Z');
      await at(t, '2027-01-01T00:00:00Z');
      const { data } = (await get(t, 'month')).body;
      expect(data.totals.all).toBe(2);
    });

    it('quarter edges: the period ends with the last day of the third month', async () => {
      const t = await createTenant('Ovv');
      await setZone(t, 'Europe/Athens');
      await at(t, '2027-02-28T21:30:00Z'); // 28 Feb 23:30 Athens: last day
      await at(t, '2027-02-28T22:30:00Z'); // 1 Mar 00:30 Athens: after
      const { data } = (await get(t, 'quarter')).body;
      expect(data.totals.all).toBe(1);
      expect(data.buckets[data.buckets.length - 1].count).toBe(1);
    });

    it('weeks start on Monday in the shop zone (quarter)', async () => {
      const t = await createTenant('Ovv');
      await setZone(t, 'Europe/Athens');
      await at(t, '2026-12-06T21:30:00Z'); // Sun 6 Dec 23:30 Athens
      await at(t, '2026-12-06T22:30:00Z'); // Mon 7 Dec 00:30 Athens
      const { buckets } = (await get(t, 'quarter')).body.data;
      expect(countOn(buckets, '2026-12-01')).toBe(1);
      expect(countOn(buckets, '2026-12-07')).toBe(1);
    });

    it('survives the Athens fall-back (25h) day', async () => {
      const t = await createTenant('Ovv');
      await setZone(t, 'Europe/Athens');
      vi.setSystemTime(new Date('2026-10-28T10:00:00Z'));
      await at(t, '2026-10-24T21:00:00Z'); // Sun 25 Oct 00:00 Athens (EEST)
      await at(t, '2026-10-25T21:30:00Z'); // Sun 25 Oct 23:30 Athens (EET)
      await at(t, '2026-10-25T22:00:00Z'); // Mon 26 Oct 00:00 Athens
      const { buckets } = (await get(t, 'month')).body.data;
      expect(countOn(buckets, '2026-10-25')).toBe(2);
      expect(countOn(buckets, '2026-10-26')).toBe(1);
    });

    it('survives the New York spring-forward (23h) day', async () => {
      const t = await createTenant('Ovv');
      await setZone(t, 'America/New_York');
      vi.setSystemTime(new Date('2027-03-16T15:00:00Z'));
      await at(t, '2027-03-14T05:00:00Z'); // Sun 14 Mar 00:00 EST
      await at(t, '2027-03-15T03:00:00Z'); // Sun 14 Mar 23:00 EDT
      await at(t, '2027-03-15T04:00:00Z'); // Mon 15 Mar 00:00 EDT
      const { buckets } = (await get(t, 'month')).body.data;
      expect(countOn(buckets, '2027-03-14')).toBe(2);
      expect(countOn(buckets, '2027-03-15')).toBe(1);
    });
  });
});

describe('GET /api/shops/:shopId/bookings (limit / order / from / to)', () => {
  const list = (t: Tenant, qs: string) =>
    request(app)
      .get(`/api/shops/${t.shop.id}/bookings?${qs}`)
      .set(authHeader(t.token));

  it('limit + order=desc returns the latest N', async () => {
    const t = await createTenant('Lst');
    for (const d of ['01', '02', '03', '04']) {
      await at(t, `2026-11-${d}T10:00:00Z`);
    }
    const res = await list(t, 'limit=2&order=desc');
    expect(res.status).toBe(200);
    expect(
      res.body.data.map((b: { startTime: string }) => b.startTime),
    ).toEqual(['2026-11-04T10:00:00.000Z', '2026-11-03T10:00:00.000Z']);
  });

  it('from/to is an inclusive shop-local date range', async () => {
    const t = await createTenant('Lst');
    await at(t, '2026-11-29T21:30:00Z'); // Sun 29 Nov 23:30 Athens
    await at(t, '2026-11-29T22:30:00Z'); // Mon 30 Nov 00:30 Athens
    await at(t, '2026-12-01T10:00:00Z');
    await at(t, '2026-12-01T22:30:00Z'); // Wed 2 Dec Athens
    const res = await list(t, 'from=2026-11-30&to=2026-12-01');
    expect(res.body.data).toHaveLength(2);
  });

  it('defaults are unchanged (ascending, unlimited)', async () => {
    const t = await createTenant('Lst');
    await at(t, '2026-11-02T10:00:00Z');
    await at(t, '2026-11-01T10:00:00Z');
    const res = await list(t, '');
    expect(
      res.body.data.map((b: { startTime: string }) => b.startTime),
    ).toEqual(['2026-11-01T10:00:00.000Z', '2026-11-02T10:00:00.000Z']);
  });

  it.each([
    'limit=0',
    'limit=51',
    'limit=x',
    'order=up',
    'from=2026-13-01',
    'to=nope',
  ])('rejects %s', async (qs) => {
    const t = await createTenant('Lst');
    expect((await list(t, qs)).status).toBe(400);
  });
});
