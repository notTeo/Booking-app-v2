import { DateTime } from 'luxon';
import { Prisma, type BookingStatus } from '../../dist/generated/prisma';
import { prisma } from '../utils/prisma';
import { addDays, dayBoundsUtc, todayInZone } from '../utils/shopTime';
import { canViewCustomerDetails, requireShopAccess } from '../utils/shopAccess';
import { redactCustomer } from '../utils/customerVisibility';
import { AppError } from '../middleware/errorHandler';
import { NO_CANCEL_TOKEN } from './booking.service';

export const OVERVIEW_RANGES = ['week', 'month', 'quarter'] as const;
export type OverviewRange = (typeof OVERVIEW_RANGES)[number];

export type OverviewBucket = { start: string; end: string; count: number };

export type Overview = {
  range: OverviewRange;
  from: string;
  to: string;
  /** The shop-local calendar date the period was computed for. */
  today: string;
  /** Whether the shop has any booking at all, in any period or status. */
  hasAnyBookings: boolean;
  totals: {
    all: number;
    pending: number;
    confirmed: number;
    completed: number;
    canceled: number;
    noShow: number;
  };
  buckets: OverviewBucket[];
};

export type OverviewShop = {
  id: string;
  name: string;
  slug: string;
  timezone: string;
};

export type ShopOverviewRow = {
  shopId: string;
  name: string;
  slug: string;
  /** Non-canceled bookings in the period (the shop's share of `totals.all`). */
  total: number;
  /** Pending bookings in the period. */
  pending: number;
  /** Non-canceled bookings starting today, today being in THIS shop's timezone. */
  today: number;
};

export type MyOverview = Overview & { perShop: ShopOverviewRow[] };

// Monday of the week containing `date` (calendar maths, timezone-free).
const mondayOf = (date: string): string =>
  addDays(date, 1 - DateTime.fromISO(date, { zone: 'utc' }).weekday);

/**
 * The calendar period and bucket layout for a range, as shop-local dates.
 * - week: the current Monday-Sunday week, 7 daily buckets.
 * - month: the current calendar month, one daily bucket per day.
 * - quarter: the current month plus the previous two, in Monday-start weekly
 *   buckets. The first and last weeks are clipped to the period, so every
 *   bucket (and the totals) covers exactly [from, to].
 * Each bucket's `key` is the value the SQL date_trunc produces for it.
 */
export const overviewWindow = (range: OverviewRange, today: string) => {
  const day = DateTime.fromISO(today, { zone: 'utc' });

  if (range === 'week') {
    const from = mondayOf(today);
    const buckets = Array.from({ length: 7 }, (_, i) => {
      const date = addDays(from, i);
      return { key: date, start: date, end: date };
    });
    return { unit: 'day' as const, from, to: addDays(from, 6), buckets };
  }

  const from = (range === 'quarter' ? day.minus({ months: 2 }) : day)
    .startOf('month')
    .toISODate()!;
  const to = day.endOf('month').toISODate()!;

  if (range === 'month') {
    const buckets: { key: string; start: string; end: string }[] = [];
    for (let date = from; date <= to; date = addDays(date, 1)) {
      buckets.push({ key: date, start: date, end: date });
    }
    return { unit: 'day' as const, from, to, buckets };
  }

  const buckets: { key: string; start: string; end: string }[] = [];
  for (let monday = mondayOf(from); monday <= to; monday = addDays(monday, 7)) {
    const sunday = addDays(monday, 6);
    buckets.push({
      key: monday,
      start: monday < from ? from : monday,
      end: sunday > to ? to : sunday,
    });
  }
  return { unit: 'week' as const, from, to, buckets };
};

const TOTAL_KEYS: Record<BookingStatus, keyof Overview['totals']> = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  COMPLETED: 'completed',
  CANCELED: 'canceled',
  NO_SHOW: 'noShow',
};

/**
 * The overview of one or more shops, aggregated in the database in a fixed
 * number of queries however many shops there are (no per-shop loop).
 *
 * The period (`from`/`to`/`today`) is computed once, in the timezone of the
 * FIRST shop in `shops` (callers pass a deterministic order), so the response
 * has a single calendar axis. Each shop's bookings are then taken from those
 * calendar dates in the SHOP's own timezone and counted on the shop's own
 * local day/week; buckets from different shops are summed by date label.
 * With one shop this is exactly that shop's own overview.
 */
export const computeOverview = async (
  shops: OverviewShop[],
  range: OverviewRange,
  now: Date = new Date(),
): Promise<MyOverview> => {
  const refZone = shops[0]?.timezone ?? 'UTC';
  const today = todayInZone(refZone, now);
  const { unit, from, to, buckets } = overviewWindow(range, today);

  const totals: Overview['totals'] = {
    all: 0,
    pending: 0,
    confirmed: 0,
    completed: 0,
    canceled: 0,
    noShow: 0,
  };
  const empty = (): MyOverview => ({
    range,
    from,
    to,
    today,
    hasAnyBookings: false,
    totals,
    buckets: buckets.map(({ start, end }) => ({ start, end, count: 0 })),
    perShop: [],
  });
  if (shops.length === 0) return empty();

  // One row per shop: its period [from, to] and its own "today", as UTC
  // instants in the shop's timezone. Ids, zones and instants are bound.
  const bounds = shops.map((shop) => {
    const period = {
      start: dayBoundsUtc(from, shop.timezone).start,
      end: dayBoundsUtc(to, shop.timezone).end,
    };
    const day = dayBoundsUtc(todayInZone(shop.timezone, now), shop.timezone);
    return { shop, period, day };
  });
  const shopRows = Prisma.join(
    bounds.map(
      ({ shop, period, day }) =>
        Prisma.sql`(${shop.id}::text, ${shop.timezone}::text, ${period.start}::timestamptz, ${period.end}::timestamptz, ${day.start}::timestamptz, ${day.end}::timestamptz)`,
    ),
  );
  const shopsCte = Prisma.sql`WITH s(id, tz, p_start, p_end, d_start, d_end) AS (VALUES ${shopRows})`;

  // Blocked slots (bookings on the shop's system customer) are not
  // appointments, so no figure counts them.
  const notBlocked = Prisma.sql`NOT EXISTS (SELECT 1 FROM "Customer" c WHERE c.id = b."customerId" AND c."isSystem")`;

  // Prisma's groupBy cannot bucket by a timezone or take per-shop bounds, so
  // both aggregations are raw SQL joined to the shop list above.
  const [byStatus, byBucket] = await Promise.all([
    prisma.$queryRaw<
      { shopId: string; status: BookingStatus; period: number; today: number }[]
    >(Prisma.sql`
      ${shopsCte}
      SELECT b."shopId" AS "shopId", b."status"::text AS status,
             COUNT(*) FILTER (WHERE b."startTime" >= s.p_start AND b."startTime" < s.p_end)::int AS period,
             COUNT(*) FILTER (WHERE b."startTime" >= s.d_start AND b."startTime" < s.d_end AND b."status" <> 'CANCELED')::int AS today
      FROM "Booking" b
      JOIN s ON s.id = b."shopId"
      WHERE b."startTime" >= LEAST(s.p_start, s.d_start)
        AND b."startTime" < GREATEST(s.p_end, s.d_end)
        AND ${notBlocked}
      GROUP BY b."shopId", b."status"
    `),
    // AT TIME ZONE turns the timestamptz into the shop's wall-clock, so
    // day/week boundaries are the shop's (DST-safe), and date_trunc('week')
    // starts on Monday. `unit` is from a fixed set.
    prisma.$queryRaw<{ bucket: string; count: number }[]>(Prisma.sql`
      ${shopsCte}
      SELECT to_char(date_trunc(${unit}::text, b."startTime" AT TIME ZONE s.tz), 'YYYY-MM-DD') AS bucket,
             COUNT(*)::int AS count
      FROM "Booking" b
      JOIN s ON s.id = b."shopId"
      WHERE b."status" <> 'CANCELED'
        AND b."startTime" >= s.p_start
        AND b."startTime" < s.p_end
        AND ${notBlocked}
      GROUP BY 1
    `),
  ]);

  const perShop = new Map<string, ShopOverviewRow>(
    shops.map((shop) => [
      shop.id,
      {
        shopId: shop.id,
        name: shop.name,
        slug: shop.slug,
        total: 0,
        pending: 0,
        today: 0,
      },
    ]),
  );
  let inPeriod = 0;
  for (const row of byStatus) {
    totals[TOTAL_KEYS[row.status]] += row.period;
    inPeriod += row.period;
    const mine = perShop.get(row.shopId)!;
    mine.today += row.today;
    if (row.status !== 'CANCELED') mine.total += row.period;
    if (row.status === 'PENDING') mine.pending += row.period;
  }
  totals.all =
    totals.pending + totals.confirmed + totals.completed + totals.noShow;

  // Cheap (indexed on shopId) and only needed when the period itself is empty.
  const hasAnyBookings =
    inPeriod > 0 ||
    (await prisma.booking.findFirst({
      where: {
        shopId: { in: shops.map((s) => s.id) },
        customer: { isSystem: false },
      },
      select: { id: true },
    })) !== null;

  const counts = new Map<string, number>();
  for (const r of byBucket)
    counts.set(r.bucket, (counts.get(r.bucket) ?? 0) + r.count);
  return {
    range,
    from,
    to,
    today,
    hasAnyBookings,
    totals,
    buckets: buckets.map(({ key, start, end }) => ({
      start,
      end,
      count: counts.get(key) ?? 0,
    })),
    perShop: [...perShop.values()],
  };
};

/** One shop's overview (owner or staff of that shop). */
export const getOverview = async (
  userId: string,
  shopId: string,
  range: OverviewRange,
  now: Date = new Date(),
): Promise<Overview> => {
  await requireShopAccess(userId, shopId);
  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    select: { id: true, name: true, slug: true, timezone: true },
  });
  if (!shop) throw new AppError(404, 'Shop not found');
  // The per-shop breakdown is only for the cross-shop dashboard.
  const overview: Partial<MyOverview> = await computeOverview(
    [shop],
    range,
    now,
  );
  delete overview.perShop;
  return overview as Overview;
};

/**
 * The shops on the dashboard: the user's ACTIVE memberships (the same set as
 * GET /api/shops), oldest membership first, so "the first shop" is stable.
 * Owners and staff are treated alike, as on the per-shop endpoints.
 */
const myShops = async (userId: string) => {
  const memberships = await prisma.userShop.findMany({
    where: { userId, active: true },
    orderBy: [{ createdAt: 'asc' }, { shopId: 'asc' }],
    select: {
      role: true,
      canViewCustomerDetails: true,
      shop: { select: { id: true, name: true, slug: true, timezone: true } },
    },
  });
  return memberships;
};

/** Overview summed across all of the user's shops, shops sorted by bookings. */
export const getMyOverview = async (
  userId: string,
  range: OverviewRange,
  now: Date = new Date(),
): Promise<MyOverview> => {
  const shops = (await myShops(userId)).map((m) => m.shop);
  const overview = await computeOverview(shops, range, now);
  overview.perShop.sort(
    (a, b) => b.total - a.total || a.name.localeCompare(b.name),
  );
  return overview;
};

/** The next 5 bookings from now across the user's shops (canceled and no-show excluded). */
export const getMyUpcoming = async (userId: string, now: Date = new Date()) => {
  const memberships = await myShops(userId);
  if (memberships.length === 0) return [];
  const canView = new Map(
    memberships.map((m) => [m.shop.id, canViewCustomerDetails(m)]),
  );
  const bookings = await prisma.booking.findMany({
    where: {
      shopId: { in: [...canView.keys()] },
      startTime: { gte: now },
      status: { notIn: ['CANCELED', 'NO_SHOW'] },
      customer: { isSystem: false },
    },
    omit: NO_CANCEL_TOKEN,
    include: {
      customer: true,
      service: true,
      services: {
        select: { name: true, duration: true, price: true, position: true },
        orderBy: { position: 'asc' },
      },
      staff: { select: { id: true, name: true, email: true } },
      shop: { select: { id: true, name: true, slug: true, timezone: true } },
    },
    orderBy: [{ startTime: 'asc' }, { id: 'asc' }],
    take: 5,
  });
  return bookings.map((b) => ({
    ...b,
    customer: redactCustomer(b.customer, canView.get(b.shopId) ?? false),
  }));
};
