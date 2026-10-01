import { DateTime } from 'luxon';
import { Prisma, type BookingStatus } from '../../dist/generated/prisma';
import { prisma } from '../utils/prisma';
import { addDays, dayBoundsUtc, todayInZone } from '../utils/shopTime';
import { requireMembership } from './booking.service';
import { AppError } from '../middleware/errorHandler';

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

export const getOverview = async (
  userId: string,
  shopId: string,
  range: OverviewRange,
  now: Date = new Date(),
): Promise<Overview> => {
  await requireMembership(userId, shopId);
  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    select: { timezone: true },
  });
  if (!shop) throw new AppError(404, 'Shop not found');
  const zone = shop.timezone;

  const today = todayInZone(zone, now);
  const { unit, from, to, buckets } = overviewWindow(range, today);
  const startUtc = dayBoundsUtc(from, zone).start;
  const endUtc = dayBoundsUtc(to, zone).end;

  // Both aggregations run in the database; no booking rows are loaded.
  const [byStatus, byBucket] = await Promise.all([
    prisma.booking.groupBy({
      by: ['status'],
      where: { shopId, startTime: { gte: startUtc, lt: endUtc } },
      _count: { _all: true },
    }),
    // Prisma's groupBy cannot bucket by a timezone, so this one is raw SQL.
    // `startTime` is timestamptz; AT TIME ZONE turns it into the shop's
    // wall-clock, so day/week boundaries are the shop's (DST-safe), and
    // date_trunc('week') starts on Monday. `unit` is from a fixed set; zone
    // and ids are bound parameters.
    prisma.$queryRaw<{ bucket: string; count: number }[]>(Prisma.sql`
      SELECT to_char(date_trunc(${unit}::text, "startTime" AT TIME ZONE ${zone}::text), 'YYYY-MM-DD') AS bucket,
             COUNT(*)::int AS count
      FROM "Booking"
      WHERE "shopId" = ${shopId}
        AND "status" <> 'CANCELED'
        AND "startTime" >= ${startUtc}
        AND "startTime" < ${endUtc}
      GROUP BY 1
    `),
  ]);

  const totals: Overview['totals'] = {
    all: 0,
    pending: 0,
    confirmed: 0,
    completed: 0,
    canceled: 0,
    noShow: 0,
  };
  for (const row of byStatus) {
    totals[TOTAL_KEYS[row.status]] = row._count._all;
    if (row.status !== 'CANCELED') totals.all += row._count._all;
  }

  // Cheap (indexed on shopId) and only needed when the period itself is empty.
  const inPeriod = byStatus.reduce((sum, row) => sum + row._count._all, 0);
  const hasAnyBookings =
    inPeriod > 0 ||
    (await prisma.booking.findFirst({
      where: { shopId },
      select: { id: true },
    })) !== null;

  const counts = new Map(byBucket.map((r) => [r.bucket, r.count]));
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
  };
};
