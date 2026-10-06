import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { prisma } from '../utils/prisma';
import { requireShopAccess } from '../utils/shopAccess';
import {
  addDays,
  dateInZone,
  dateOnlyToUtc,
  dayBoundsUtc,
  wallClockToUtcLenient,
} from '../utils/shopTime';
import { SLOT_FREEING_STATUSES } from './booking.service';

export interface CreateTimeOffDto {
  // UserShop.id; null or missing = the whole shop
  staffId?: string | null;
  startDate: string;
  endDate: string;
  // Both or neither; neither = the whole day
  startTime?: string | null;
  endTime?: string | null;
  note?: string | null;
}

export type UpdateTimeOffDto = Partial<Omit<CreateTimeOffDto, 'staffId'>>;

// Longest stretch one entry can cover, in days.
export const MAX_TIME_OFF_DAYS = 366;

const MANAGER_ONLY = {
  role: 'manager',
  forbiddenMessage: 'Only the shop owner or a manager can manage time off',
} as const;

interface Period {
  startDate: string;
  endDate: string;
  startTime: string | null;
  endTime: string | null;
}

function assertValidPeriod(p: Period) {
  if (p.endDate < p.startDate) {
    throw new AppError(400, 'The end date must be on or after the start date.');
  }
  if (addDays(p.startDate, MAX_TIME_OFF_DAYS) <= p.endDate) {
    throw new AppError(400, 'Time off can cover at most one year.');
  }
  if (!p.startTime !== !p.endTime) {
    throw new AppError(400, 'Set both a start and an end time, or neither.');
  }
  if (p.startTime && p.endTime && p.startTime >= p.endTime) {
    throw new AppError(400, 'The end time must be after the start time.');
  }
}

async function requireMemberInShop(shopId: string, staffId: string) {
  const member = await prisma.userShop.findFirst({
    where: { id: staffId, shopId },
    select: { id: true },
  });
  if (!member) throw new AppError(404, 'Staff member not found in this shop');
}

async function requireTimeOffInShop(timeOffId: string, shopId: string) {
  const entry = await prisma.timeOff.findUnique({ where: { id: timeOffId } });
  if (!entry || entry.shopId !== shopId)
    throw new AppError(404, 'Time off not found');
  return entry;
}

/**
 * How many bookings already sit inside the time off: the member's own, or
 * everyone's when it is shop-wide. They are left as they are; the count is
 * only for the warning shown after saving. Canceled and no-show bookings and
 * blocked slots are not counted.
 */
async function countAffectedBookings(
  shopId: string,
  staffId: string | null,
  p: Period,
): Promise<number> {
  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    select: { timezone: true },
  });
  if (!shop) throw new AppError(404, 'Shop not found');
  const zone = shop.timezone;

  const bookings = await prisma.booking.findMany({
    where: {
      shopId,
      ...(staffId && { staffId }),
      status: { notIn: SLOT_FREEING_STATUSES },
      customer: { isSystem: false },
      startTime: { lt: dayBoundsUtc(p.endDate, zone).end },
      endTime: { gt: dayBoundsUtc(p.startDate, zone).start },
    },
    select: { startTime: true, endTime: true },
  });
  const { startTime, endTime } = p;
  if (!startTime || !endTime) return bookings.length;

  // Part of a day: the window repeats on every day of the range.
  return bookings.filter((b) =>
    [dateInZone(b.startTime, zone), dateInZone(b.endTime, zone)].some(
      (date) =>
        date >= p.startDate &&
        date <= p.endDate &&
        b.startTime < wallClockToUtcLenient(date, endTime, zone) &&
        b.endTime > wallClockToUtcLenient(date, startTime, zone),
    ),
  ).length;
}

/**
 * Shop-wide time off, plus that member's own when `memberId` is given. Any
 * active member of the shop can read it.
 */
export const listTimeOff = async (
  userId: string,
  shopId: string,
  memberId?: string,
) => {
  await requireShopAccess(userId, shopId);
  if (memberId) await requireMemberInShop(shopId, memberId);

  return prisma.timeOff.findMany({
    where: {
      shopId,
      OR: [{ staffId: null }, ...(memberId ? [{ staffId: memberId }] : [])],
    },
    orderBy: [{ startDate: 'asc' }, { createdAt: 'asc' }],
  });
};

export const createTimeOff = async (
  userId: string,
  shopId: string,
  dto: CreateTimeOffDto,
) => {
  await requireShopAccess(userId, shopId, MANAGER_ONLY);
  const staffId = dto.staffId ?? null;
  if (staffId) await requireMemberInShop(shopId, staffId);

  const period: Period = {
    startDate: dto.startDate,
    endDate: dto.endDate,
    startTime: dto.startTime ?? null,
    endTime: dto.endTime ?? null,
  };
  assertValidPeriod(period);

  const entry = await prisma.timeOff.create({
    data: {
      shopId,
      staffId,
      startDate: dateOnlyToUtc(period.startDate),
      endDate: dateOnlyToUtc(period.endDate),
      startTime: period.startTime,
      endTime: period.endTime,
      note: dto.note?.trim() || null,
    },
  });

  logger.info(
    `Time off created: ${entry.id} for shop ${shopId} staff ${staffId ?? 'all'} by user ${userId}`,
  );
  return {
    ...entry,
    affectedBookings: await countAffectedBookings(shopId, staffId, period),
  };
};

export const updateTimeOff = async (
  userId: string,
  shopId: string,
  timeOffId: string,
  dto: UpdateTimeOffDto,
) => {
  await requireShopAccess(userId, shopId, MANAGER_ONLY);
  const current = await requireTimeOffInShop(timeOffId, shopId);

  const period: Period = {
    startDate: dto.startDate ?? current.startDate.toISOString().slice(0, 10),
    endDate: dto.endDate ?? current.endDate.toISOString().slice(0, 10),
    startTime: dto.startTime !== undefined ? dto.startTime : current.startTime,
    endTime: dto.endTime !== undefined ? dto.endTime : current.endTime,
  };
  assertValidPeriod(period);

  const entry = await prisma.timeOff.update({
    where: { id: timeOffId },
    data: {
      startDate: dateOnlyToUtc(period.startDate),
      endDate: dateOnlyToUtc(period.endDate),
      startTime: period.startTime,
      endTime: period.endTime,
      ...(dto.note !== undefined && { note: dto.note?.trim() || null }),
    },
  });

  logger.info(
    `Time off updated: ${timeOffId} for shop ${shopId} by user ${userId}`,
  );
  return {
    ...entry,
    affectedBookings: await countAffectedBookings(
      shopId,
      entry.staffId,
      period,
    ),
  };
};

export const deleteTimeOff = async (
  userId: string,
  shopId: string,
  timeOffId: string,
) => {
  await requireShopAccess(userId, shopId, MANAGER_ONLY);
  await requireTimeOffInShop(timeOffId, shopId);

  await prisma.timeOff.delete({ where: { id: timeOffId } });

  logger.info(
    `Time off deleted: ${timeOffId} for shop ${shopId} by user ${userId}`,
  );
};
