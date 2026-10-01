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

const WEEKS_IN_QUARTER = 13;

// Monday of the week containing `date` (calendar maths, timezone-free).
const mondayOf = (date: string): string =>
  addDays(date, 1 - DateTime.fromISO(date, { zone: 'utc' }).weekday);

/**
 * The window and bucket layout for a range, as shop-local calendar dates.
 * Week/month: rolling daily buckets ending today. Quarter: 13 Monday-start
 * weekly buckets ending with the current week.
 */
export const overviewWindow = (range: OverviewRange, today: string) => {
  if (range === 'quarter') {
    const lastMonday = mondayOf(today);
    const firstMonday = addDays(lastMonday, -7 * (WEEKS_IN_QUARTER - 1));
    const buckets = Array.from({ length: WEEKS_IN_QUARTER }, (_, i) => {
      const start = addDays(firstMonday, 7 * i);
      return { start, end: addDays(start, 6) };
    });
    return {
      unit: 'week' as const,
      from: firstMonday,
      to: addDays(lastMonday, 6),
      buckets,
    };
  }
  const days = range === 'week' ? 7 : 30;
  const from = addDays(today, -(days - 1));
  const buckets = Array.from({ length: days }, (_, i) => {
    const day = addDays(from, i);
    return { start: day, end: day };
  });
  return { unit: 'day' as const, from, to: today, buckets };
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

  const { unit, from, to, buckets } = overviewWindow(
    range,
    todayInZone(zone, now),
  );
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

  const counts = new Map(byBucket.map((r) => [r.bucket, r.count]));
  return {
    range,
    from,
    to,
    totals,
    buckets: buckets.map((b) => ({ ...b, count: counts.get(b.start) ?? 0 })),
  };
};
