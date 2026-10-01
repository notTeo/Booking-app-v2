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
// Minted per call: some tests move the fake clock, which would age a token.
const get = (t: Tenant, range?: string, token = signAccessToken(t.user.id)) =>
  request(app)
    .get(`/api/shops/${t.shop.id}/overview${range ? `?range=${range}` : ''}`)
    .set(authHeader(token));

const at = (t: Tenant, iso: string, status?: BookingStatus) =>
  createBookingRow(t, iso, status);

const setZone = (t: Tenant, timezone: string) =>
  prisma.shop.update({ where: { id: t.shop.id }, data: { timezone } });

const countOn = (buckets: { start: string; count: number }[], start: string) =>
  buckets.find((b) => b.start === start)?.count;

describe('overviewWindow', () => {
  it('week: 7 daily buckets ending today', () => {
    const w = overviewWindow('week', '2026-12-01');
    expect(w.buckets).toHaveLength(7);
    expect(w.from).toBe('2026-11-25');
    expect(w.to).toBe('2026-12-01');
    expect(w.buckets[6]).toEqual({ start: '2026-12-01', end: '2026-12-01' });
  });

  it('month: 30 daily buckets ending today', () => {
    const w = overviewWindow('month', '2026-12-01');
    expect(w.buckets).toHaveLength(30);
    expect(w.from).toBe('2026-11-02');
  });

  it('quarter: 13 Monday-start weeks ending with the current week', () => {
    const w = overviewWindow('quarter', '2026-12-01');
    expect(w.buckets).toHaveLength(13);
    expect(w.buckets[12]).toEqual({ start: '2026-11-30', end: '2026-12-06' });
    expect(w.from).toBe('2026-09-07');
    expect(w.to).toBe('2026-12-06');
  });

  it('quarter on a Sunday still ends with that Mon-Sun week', () => {
    const w = overviewWindow('quarter', '2026-12-06');
    expect(w.buckets[12].start).toBe('2026-11-30');
    const m = overviewWindow('quarter', '2026-11-30');
    expect(m.buckets[12].start).toBe('2026-11-30');
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
      expect((await get(a, 'week', b.token)).status).toBe(404);
    });

    it('allows staff of the shop', async () => {
      const t = await createTenant('Ovv');
      const staff = await createStaffMember(t);
      expect((await get(t, 'week', staff.token)).status).toBe(200);
    });
  });

  describe('totals', () => {
    it('counts each status; all excludes canceled', async () => {
      const t = await createTenant('Ovv');
      await at(t, '2026-11-30T10:00:00Z', 'PENDING');
      await at(t, '2026-11-30T11:00:00Z', 'PENDING');
      await at(t, '2026-11-30T12:00:00Z', 'CONFIRMED');
      await at(t, '2026-11-29T12:00:00Z', 'COMPLETED');
      await at(t, '2026-11-29T13:00:00Z', 'CANCELED');
      await at(t, '2026-11-28T13:00:00Z', 'NO_SHOW');
      const { data } = (await get(t, 'week')).body;
      expect(data.range).toBe('week');
      expect(data.from).toBe('2026-11-25');
      expect(data.to).toBe('2026-12-01');
      expect(data.totals).toEqual({
        all: 5,
        pending: 2,
        confirmed: 1,
        completed: 1,
        canceled: 1,
        noShow: 1,
      });
    });

    it('ignores bookings outside the window and other shops', async () => {
      const t = await createTenant('Ovv');
      const other = await createTenant('Other');
      await at(t, '2026-11-24T10:00:00Z'); // before the week
      await at(t, '2026-12-02T10:00:00Z'); // after today
      await at(other, '2026-11-30T10:00:00Z');
      const { data } = (await get(t, 'week')).body;
      expect(data.totals.all).toBe(0);
    });
  });

  describe('buckets', () => {
    it('week: 7 buckets, empty ones present with count 0', async () => {
      const t = await createTenant('Ovv');
      await at(t, '2026-11-30T10:00:00Z');
      await at(t, '2026-11-30T14:00:00Z');
      await at(t, '2026-12-01T08:00:00Z');
      await at(t, '2026-11-30T15:00:00Z', 'CANCELED');
      const { buckets } = (await get(t, 'week')).body.data;
      expect(buckets).toHaveLength(7);
      expect(countOn(buckets, '2026-11-30')).toBe(2);
      expect(countOn(buckets, '2026-12-01')).toBe(1);
      expect(countOn(buckets, '2026-11-25')).toBe(0);
      expect(buckets.map((b: { count: number }) => b.count)).toEqual([
        0, 0, 0, 0, 0, 2, 1,
      ]);
    });

    it('month: 30 daily buckets', async () => {
      const t = await createTenant('Ovv');
      await at(t, '2026-11-02T10:00:00Z');
      await at(t, '2026-11-01T10:00:00Z'); // one day before the window
      const { data } = (await get(t, 'month')).body;
      expect(data.buckets).toHaveLength(30);
      expect(data.buckets[0]).toEqual({
        start: '2026-11-02',
        end: '2026-11-02',
        count: 1,
      });
      expect(data.totals.all).toBe(1);
    });

    it('quarter: 13 weekly buckets, Monday to Sunday', async () => {
      const t = await createTenant('Ovv');
      await at(t, '2026-11-29T10:00:00Z'); // Sunday -> week of Mon 11-23
      await at(t, '2026-11-30T10:00:00Z'); // Monday -> week of Mon 11-30
      await at(t, '2026-12-01T10:00:00Z');
      const { data } = (await get(t, 'quarter')).body;
      expect(data.buckets).toHaveLength(13);
      expect(data.from).toBe('2026-09-07');
      expect(data.to).toBe('2026-12-06');
      expect(countOn(data.buckets, '2026-11-23')).toBe(1);
      expect(countOn(data.buckets, '2026-11-30')).toBe(2);
      expect(data.buckets[12].end).toBe('2026-12-06');
      expect(data.totals.all).toBe(3);
    });
  });

  describe('timezones (day boundaries are the shop’s)', () => {
    it('Europe/Athens: 22:30Z is already the next local day', async () => {
      const t = await createTenant('Ovv');
      await setZone(t, 'Europe/Athens');
      await at(t, '2026-11-29T22:30:00Z'); // Mon 30 Nov 00:30 Athens
      const { buckets } = (await get(t, 'week')).body.data;
      expect(countOn(buckets, '2026-11-30')).toBe(1);
      expect(countOn(buckets, '2026-11-29')).toBe(0);
    });

    it('America/New_York: 03:30Z is still the previous local day', async () => {
      const t = await createTenant('Ovv');
      await setZone(t, 'America/New_York');
      await at(t, '2026-11-30T03:30:00Z'); // Sun 29 Nov 22:30 New York
      const { buckets } = (await get(t, 'week')).body.data;
      expect(countOn(buckets, '2026-11-29')).toBe(1);
      expect(countOn(buckets, '2026-11-30')).toBe(0);
    });

    it('UTC: boundaries are plain UTC midnight', async () => {
      const t = await createTenant('Ovv');
      await setZone(t, 'UTC');
      await at(t, '2026-11-29T23:00:00Z');
      await at(t, '2026-11-30T01:00:00Z');
      const { buckets } = (await get(t, 'week')).body.data;
      expect(countOn(buckets, '2026-11-29')).toBe(1);
      expect(countOn(buckets, '2026-11-30')).toBe(1);
    });

    it('"today" follows the shop zone, not the server', async () => {
      const t = await createTenant('Ovv');
      await setZone(t, 'America/New_York');
      vi.setSystemTime(new Date('2026-12-02T03:00:00Z')); // Dec 1 22:00 NY
      const { data } = (await get(t, 'week')).body;
      expect(data.to).toBe('2026-12-01');
      await setZone(t, 'Europe/Athens'); // Dec 2 05:00 Athens
      expect((await get(t, 'week')).body.data.to).toBe('2026-12-02');
    });

    it('weeks start on Monday in the shop zone', async () => {
      const t = await createTenant('Ovv');
      await setZone(t, 'Europe/Athens');
      // Sun 29 Nov 23:30 Athens vs Mon 30 Nov 00:30 Athens.
      await at(t, '2026-11-29T21:30:00Z');
      await at(t, '2026-11-29T22:30:00Z');
      const { buckets } = (await get(t, 'quarter')).body.data;
      expect(countOn(buckets, '2026-11-23')).toBe(1);
      expect(countOn(buckets, '2026-11-30')).toBe(1);
    });

    it('survives the Athens fall-back (25h) day', async () => {
      const t = await createTenant('Ovv');
      await setZone(t, 'Europe/Athens');
      vi.setSystemTime(new Date('2026-10-28T10:00:00Z'));
      await at(t, '2026-10-24T21:00:00Z'); // Sun 25 Oct 00:00 Athens (EEST)
      await at(t, '2026-10-25T21:30:00Z'); // Sun 25 Oct 23:30 Athens (EET)
      await at(t, '2026-10-25T22:00:00Z'); // Mon 26 Oct 00:00 Athens
      const { buckets } = (await get(t, 'week')).body.data;
      expect(countOn(buckets, '2026-10-25')).toBe(2);
      expect(countOn(buckets, '2026-10-26')).toBe(1);
    });

    it('survives the New York spring-forward (23h) day', async () => {
      const t = await createTenant('Ovv');
      await setZone(t, 'America/New_York');
      vi.setSystemTime(new Date('2027-03-10T15:00:00Z'));
      await at(t, '2027-03-14T05:00:00Z'); // Sun 14 Mar 00:00 EST
      await at(t, '2027-03-15T03:00:00Z'); // Sun 14 Mar 23:00 EDT
      await at(t, '2027-03-15T04:00:00Z'); // Mon 15 Mar 00:00 EDT (future)
      vi.setSystemTime(new Date('2027-03-16T15:00:00Z'));
      const { buckets } = (await get(t, 'week')).body.data;
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
