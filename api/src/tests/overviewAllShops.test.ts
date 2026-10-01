import app from '../app';
import { serve } from './testRequest';
import { signAccessToken } from '../utils/jwt';
import { prisma } from '../utils/prisma';
import type { BookingStatus } from '../../dist/generated/prisma';
import {
  authHeader,
  createBookingRow,
  createStaffMember,
  createTenant,
  unique,
  type Tenant,
} from './helpers';

const api = await serve(app);

// TEST_NOW is Tue 2026-12-01 09:00Z (see setup.ts): the same calendar day in
// Athens, UTC and New York. Week = Mon 30 Nov - Sun 6 Dec.
const ATHENS = 'Europe/Athens';
const NEW_YORK = 'America/New_York';

const getAll = (token: string, range?: string) =>
  api
    .get(`/api/shops/overview${range ? `?range=${range}` : ''}`)
    .set(authHeader(token));

const getOne = (t: Tenant, range: string) =>
  api
    .get(`/api/shops/${t.shop.id}/overview?range=${range}`)
    .set(authHeader(t.token));

const at = (t: Tenant, iso: string, status?: BookingStatus) =>
  createBookingRow(t, iso, status);

let seq = 0;
/**
 * Another shop for the same user, with its own owner membership, service and
 * staff row. Membership order follows call order (createdAt is spaced out so
 * "the first shop" is deterministic).
 */
async function addShop(
  t: Tenant,
  label: string,
  timezone: string,
): Promise<Tenant> {
  const id = unique();
  const shop = await prisma.shop.create({
    data: { name: label, slug: `${label.toLowerCase()}-${id}`, timezone },
  });
  const staff = await prisma.userShop.create({
    data: {
      userId: t.user.id,
      shopId: shop.id,
      role: 'owner',
      name: t.user.name,
      createdAt: new Date(Date.now() + 60_000 * ++seq),
    },
  });
  const service = await prisma.service.create({
    data: { shopId: shop.id, name: 'Cut', duration: 30, price: 2000 },
  });
  await prisma.staffService.create({
    data: { userShopId: staff.id, serviceId: service.id },
  });
  return { ...t, shop, staff, service };
}

const setZone = (t: Tenant, timezone: string) =>
  prisma.shop.update({ where: { id: t.shop.id }, data: { timezone } });

type B = { start: string; end: string; count: number };
const countOn = (buckets: B[], start: string) =>
  buckets.find((b) => b.start === start)?.count;

describe('GET /api/shops/overview (all shops)', () => {
  describe('routing', () => {
    it('is not captured by /:id', async () => {
      const t = await createTenant('All');
      const res = await getAll(t.token, 'week');
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('perShop');
      expect(res.body.data).not.toHaveProperty('slug');
    });

    it('/upcoming is not captured by /:id either', async () => {
      const t = await createTenant('All');
      const res = await api.get('/api/shops/upcoming').set(authHeader(t.token));
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('GET /api/shops/:id still resolves a real shop id', async () => {
      const t = await createTenant('All');
      const res = await api
        .get(`/api/shops/${t.shop.id}`)
        .set(authHeader(t.token));
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(t.shop.id);
    });
  });

  describe('validation and auth', () => {
    it('rejects an unknown range', async () => {
      const t = await createTenant('All');
      expect((await getAll(t.token, 'year')).status).toBe(400);
    });

    it('rejects a missing range', async () => {
      const t = await createTenant('All');
      expect((await getAll(t.token)).status).toBe(400);
    });

    it('401 without a token', async () => {
      expect((await api.get('/api/shops/overview?range=week')).status).toBe(
        401,
      );
      expect((await api.get('/api/shops/upcoming')).status).toBe(401);
    });
  });

  describe('user with no shops', () => {
    it('returns an empty overview, not an error', async () => {
      const user = await prisma.user.create({
        data: {
          name: 'Nobody',
          email: `nobody-${unique()}@example.com`,
          isVerified: true,
        },
      });
      const res = await getAll(signAccessToken(user.id), 'week');
      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({
        range: 'week',
        from: '2026-11-30',
        to: '2026-12-06',
        today: '2026-12-01',
        hasAnyBookings: false,
        perShop: [],
        totals: {
          all: 0,
          pending: 0,
          confirmed: 0,
          completed: 0,
          canceled: 0,
          noShow: 0,
        },
      });
      expect(res.body.data.buckets).toHaveLength(7);
      expect(res.body.data.buckets.every((b: B) => b.count === 0)).toBe(true);
      const up = await api
        .get('/api/shops/upcoming')
        .set(authHeader(signAccessToken(user.id)));
      expect(up.body.data).toEqual([]);
    });
  });

  describe('user with one shop', () => {
    it.each(['week', 'month', 'quarter'])(
      "equals that shop's own overview (%s)",
      async (range) => {
        const t = await createTenant('One');
        await at(t, '2026-11-30T10:00:00Z', 'PENDING');
        await at(t, '2026-12-01T10:00:00Z', 'CONFIRMED');
        await at(t, '2026-12-01T12:00:00Z', 'CANCELED');
        await at(t, '2026-12-05T10:00:00Z', 'COMPLETED');
        await at(t, '2026-10-15T10:00:00Z', 'NO_SHOW');
        await at(t, '2026-12-28T10:00:00Z', 'CONFIRMED');
        const all = (await getAll(t.token, range)).body.data;
        const one = (await getOne(t, range)).body.data;
        const { perShop, ...rest } = all;
        expect(rest).toEqual(one);
        expect(one).not.toHaveProperty('perShop');
        expect(perShop).toHaveLength(1);
        expect(perShop[0]).toMatchObject({
          shopId: t.shop.id,
          name: t.shop.name,
          slug: t.shop.slug,
          total: one.totals.all,
          pending: one.totals.pending,
        });
      },
    );
  });

  describe('user with two shops', () => {
    it('sums totals and buckets, and lists each shop sorted by bookings', async () => {
      const a = await createTenant('Aaa');
      const b = await addShop(a, 'Bbb', ATHENS);
      await at(a, '2026-11-30T10:00:00Z', 'PENDING');
      await at(a, '2026-12-01T10:00:00Z', 'CONFIRMED');
      await at(b, '2026-12-01T10:00:00Z', 'CONFIRMED');
      await at(b, '2026-12-02T10:00:00Z', 'PENDING');
      await at(b, '2026-12-03T10:00:00Z', 'COMPLETED');
      await at(b, '2026-12-03T11:00:00Z', 'CANCELED');
      const { data } = (await getAll(a.token, 'week')).body;
      expect(data.totals).toEqual({
        all: 5,
        pending: 2,
        confirmed: 2,
        completed: 1,
        canceled: 1,
        noShow: 0,
      });
      expect(data.buckets.map((x: B) => x.count)).toEqual([
        1, 2, 1, 1, 0, 0, 0,
      ]);
      expect(data.buckets.reduce((s: number, x: B) => s + x.count, 0)).toBe(
        data.totals.all,
      );
      expect(data.perShop.map((s: { name: string }) => s.name)).toEqual([
        'Bbb',
        'Aaa',
      ]);
      expect(data.perShop[0]).toMatchObject({
        shopId: b.shop.id,
        total: 3,
        pending: 1,
      });
      expect(data.perShop[1]).toMatchObject({
        shopId: a.shop.id,
        total: 2,
        pending: 1,
      });
    });

    it('ties are ordered by name', async () => {
      const a = await createTenant('Zed');
      const b = await addShop(a, 'Abe', ATHENS);
      await at(a, '2026-12-01T10:00:00Z');
      await at(b, '2026-12-01T10:00:00Z');
      const { perShop } = (await getAll(a.token, 'week')).body.data;
      expect(perShop.map((s: { name: string }) => s.name)).toEqual([
        'Abe',
        'Zed',
      ]);
    });

    it("includes shops where the user is staff, and no one else's shops", async () => {
      const mine = await createTenant('Mine');
      const other = await createTenant('Other');
      const staff = await createStaffMember(other);
      await at(mine, '2026-12-01T10:00:00Z');
      await at(other, '2026-12-01T10:00:00Z');
      await at(other, '2026-12-02T10:00:00Z');
      const own = (await getAll(mine.token, 'week')).body.data;
      expect(own.totals.all).toBe(1);
      expect(own.perShop).toHaveLength(1);
      // Staff see the whole shop, as on the per-shop endpoint.
      const asStaff = (await getAll(staff.token, 'week')).body.data;
      expect(asStaff.totals.all).toBe(2);
      expect(asStaff.perShop[0].shopId).toBe(other.shop.id);
    });

    it('leaves out a shop where the membership is deactivated', async () => {
      const a = await createTenant('Act');
      const b = await addShop(a, 'Inact', ATHENS);
      await at(a, '2026-12-01T10:00:00Z');
      await at(b, '2026-12-01T10:00:00Z');
      await prisma.userShop.update({
        where: { id: b.staff.id },
        data: { active: false },
      });
      const { data } = (await getAll(a.token, 'week')).body;
      expect(data.totals.all).toBe(1);
      expect(data.perShop).toHaveLength(1);
    });

    it('hasAnyBookings looks at every shop', async () => {
      const a = await createTenant('Has');
      const b = await addShop(a, 'Has2', ATHENS);
      expect((await getAll(a.token, 'week')).body.data.hasAnyBookings).toBe(
        false,
      );
      await at(b, '2025-01-10T10:00:00Z'); // long before the period
      const { data } = (await getAll(a.token, 'week')).body;
      expect(data.totals.all).toBe(0);
      expect(data.hasAnyBookings).toBe(true);
    });
  });

  describe('timezones', () => {
    it("counts each booking on its own shop's local day", async () => {
      const a = await createTenant('Ath');
      await setZone(a, ATHENS);
      const b = await addShop(a, 'Nyc', NEW_YORK);
      // Two New York bookings that are Tue 1 Dec locally but Wed 2 Dec in UTC
      // (and Athens), and one Athens booking that is Wed 2 Dec locally but
      // Tue 1 Dec in UTC. Bucketing in any single zone gives different counts.
      await at(b, '2026-12-02T03:00:00Z'); // Tue 1 Dec 22:00 NY
      await at(b, '2026-12-02T02:00:00Z'); // Tue 1 Dec 21:00 NY
      await at(a, '2026-12-01T23:30:00Z'); // Wed 2 Dec 01:30 Athens
      const { data } = (await getAll(a.token, 'week')).body;
      expect(countOn(data.buckets, '2026-12-01')).toBe(2);
      expect(countOn(data.buckets, '2026-12-02')).toBe(1);
      expect(data.totals.all).toBe(3);
    });

    it("the period edge is each shop's own Sunday night", async () => {
      const a = await createTenant('Ath');
      await setZone(a, ATHENS);
      const b = await addShop(a, 'Nyc', NEW_YORK);
      // 2026-12-07T03:00Z: Mon 7 Dec 05:00 Athens (next week), Sun 6 Dec 22:00 New York (this week).
      await at(a, '2026-12-07T03:00:00Z');
      await at(b, '2026-12-07T03:00:00Z');
      const week = (await getAll(a.token, 'week')).body.data;
      expect(week.totals.all).toBe(1);
      expect(countOn(week.buckets, '2026-12-06')).toBe(1);
      const quarter = (await getAll(a.token, 'quarter')).body.data;
      expect(quarter.totals.all).toBe(2);
      // Weekly buckets: NY's lands in the week of Mon 30 Nov, Athens' in the week of Mon 7 Dec.
      expect(countOn(quarter.buckets, '2026-11-30')).toBe(1);
      expect(countOn(quarter.buckets, '2026-12-07')).toBe(1);
      expect(quarter.perShop.map((s: { total: number }) => s.total)).toEqual([
        1, 1,
      ]);
    });

    it("from/to/today use the first shop's timezone, in membership order", async () => {
      // Tue 1 Dec 22:30Z: already Wed 2 Dec in Athens, still Tue 1 Dec in New York.
      vi.setSystemTime(new Date('2026-12-01T22:30:00Z'));
      const ath = await createTenant('First');
      await setZone(ath, ATHENS);
      const nyc = await addShop(ath, 'Second', NEW_YORK);
      const athensFirst = (await getAll(ath.token, 'week')).body.data;
      expect(athensFirst.today).toBe('2026-12-02');

      const t2 = await createTenant('FirstNy');
      await setZone(t2, NEW_YORK);
      await addShop(t2, 'SecondAth', ATHENS);
      const nyFirst = (await getAll(t2.token, 'week')).body.data;
      expect(nyFirst.today).toBe('2026-12-01');
      expect(nyc.shop.timezone).toBe(NEW_YORK);
    });

    it("perShop.today is the shop's own today, non-canceled", async () => {
      vi.setSystemTime(new Date('2026-12-01T22:30:00Z'));
      const a = await createTenant('Ath');
      await setZone(a, ATHENS);
      const b = await addShop(a, 'Nyc', NEW_YORK);
      // Athens today = Wed 2 Dec: 2026-12-01T22:00Z .. 2026-12-02T22:00Z.
      await at(a, '2026-12-01T21:30:00Z'); // Tue 1 Dec 23:30 Athens: not today
      await at(a, '2026-12-01T22:30:00Z'); // Wed 00:30 Athens: today
      await at(a, '2026-12-02T10:00:00Z', 'CANCELED'); // canceled: not counted
      // New York today = Tue 1 Dec: 2026-12-01T05:00Z .. 2026-12-02T05:00Z.
      await at(b, '2026-12-01T20:00:00Z'); // today
      await at(b, '2026-12-02T04:30:00Z'); // Tue 23:30 NY: today
      await at(b, '2026-12-02T05:30:00Z'); // Wed 00:30 NY: not today
      const { perShop } = (await getAll(a.token, 'week')).body.data;
      const byId = Object.fromEntries(
        perShop.map((s: { shopId: string; today: number }) => [
          s.shopId,
          s.today,
        ]),
      );
      expect(byId[a.shop.id]).toBe(1);
      expect(byId[b.shop.id]).toBe(2);
    });
  });
});

describe('GET /api/shops/upcoming', () => {
  it('returns the next 5 across shops, soonest first, with shop identity', async () => {
    vi.setSystemTime(new Date('2026-12-01T09:00:00Z'));
    const a = await createTenant('Up');
    const b = await addShop(a, 'Up2', NEW_YORK);
    await at(a, '2026-12-01T08:00:00Z'); // already started
    await at(a, '2026-12-01T10:00:00Z');
    await at(b, '2026-12-01T11:00:00Z');
    await at(a, '2026-12-01T12:00:00Z', 'CANCELED');
    await at(a, '2026-12-01T12:30:00Z', 'NO_SHOW');
    await at(a, '2026-12-01T13:00:00Z');
    await at(b, '2026-12-01T14:00:00Z');
    await at(a, '2026-12-01T15:00:00Z');
    await at(b, '2026-12-01T16:00:00Z'); // 6th: cut off
    const res = await api.get('/api/shops/upcoming').set(authHeader(a.token));
    expect(res.status).toBe(200);
    const rows = res.body.data;
    expect(rows.map((r: { startTime: string }) => r.startTime)).toEqual([
      '2026-12-01T10:00:00.000Z',
      '2026-12-01T11:00:00.000Z',
      '2026-12-01T13:00:00.000Z',
      '2026-12-01T14:00:00.000Z',
      '2026-12-01T15:00:00.000Z',
    ]);
    expect(rows[1].shop).toEqual({
      id: b.shop.id,
      name: b.shop.name,
      slug: b.shop.slug,
      timezone: NEW_YORK,
    });
  });

  it('redacts customers for staff without view permission, per shop', async () => {
    const t = await createTenant('Red');
    const staff = await createStaffMember(t);
    await prisma.userShop.update({
      where: { id: staff.staff.id },
      data: { canViewCustomerDetails: false },
    });
    await at(t, '2026-12-02T10:00:00Z');
    const asStaff = await api
      .get('/api/shops/upcoming')
      .set(authHeader(staff.token));
    expect(asStaff.body.data[0].customer).toMatchObject({
      name: '',
      contactHidden: true,
    });
    const asOwner = await api
      .get('/api/shops/upcoming')
      .set(authHeader(t.token));
    expect(asOwner.body.data[0].customer).toMatchObject({
      name: 'Cust',
      contactHidden: false,
    });
  });

  it("excludes other users' shops and deactivated memberships", async () => {
    const a = await createTenant('Mine');
    const other = await createTenant('Theirs');
    const off = await addShop(a, 'Off', ATHENS);
    await at(a, '2026-12-02T10:00:00Z');
    await at(other, '2026-12-02T11:00:00Z');
    await at(off, '2026-12-02T12:00:00Z');
    await prisma.userShop.update({
      where: { id: off.staff.id },
      data: { active: false },
    });
    const { data } = (
      await api.get('/api/shops/upcoming').set(authHeader(a.token))
    ).body;
    expect(data).toHaveLength(1);
    expect(data[0].shopId).toBe(a.shop.id);
  });
});
