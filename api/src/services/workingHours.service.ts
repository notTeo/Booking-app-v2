import { DayOfWeek } from '../../dist/generated/prisma';
import { AppError } from '../middleware/errorHandler';
import { isExclusionViolation } from '../utils/serializable';
import { logger } from '../utils/logger';
import { prisma } from '../utils/prisma';
import { loadDayHours, type DayHours } from './bookingRules.service';

export interface HourRangeDto {
  startTime: string;
  endTime: string;
}

export interface DayEntryDto {
  day: DayOfWeek;
  isOpen: boolean;
  hours?: HourRangeDto[];
}

export interface CreateScheduleDto {
  startDate: string;
  endDate?: string;
  isActive?: boolean;
  days?: DayEntryDto[];
}

export interface UpdateScheduleDto {
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
}

export interface UpsertDaysDto {
  days: DayEntryDto[];
}

export interface UpdateDayDto {
  isOpen?: boolean;
  hours?: HourRangeDto[];
}

const WITH_DAYS = {
  days: {
    include: { hours: true },
    orderBy: { day: 'asc' as const },
  },
};

async function requireMembership(userId: string, shopId: string) {
  const membership = await prisma.userShop.findUnique({
    where: { userId_shopId: { userId, shopId } },
  });
  if (!membership) throw new AppError(404, 'Shop not found');
  return membership;
}

async function requireOwner(userId: string, shopId: string) {
  const membership = await requireMembership(userId, shopId);
  if (membership.role !== 'owner')
    throw new AppError(403, 'Only the shop owner can manage working hours');
  return membership;
}

function assertValidRange(startDate: Date, endDate: Date | null) {
  if (endDate && endDate < startDate) {
    throw new AppError(400, 'The end date must be after the start date.');
  }
}

// The DB constraint (ShopWorkingSchedule_no_overlap) is the backstop for races
// the application check above cannot see; answer it the same way.
async function guardOverlap<T>(write: () => Promise<T>): Promise<T> {
  try {
    return await write();
  } catch (err) {
    if (isExclusionViolation(err)) {
      throw new AppError(
        409,
        'These dates overlap another active schedule. Change the dates, or turn the other schedule off first.',
      );
    }
    throw err;
  }
}

async function assertNoActiveOverlap(
  shopId: string,
  staffId: string | null | undefined,
  startDate: Date,
  endDate: Date | null,
  excludeScheduleId?: string,
) {
  const existingActive = await prisma.shopWorkingSchedule.findMany({
    where: {
      shopId,
      staffId: staffId ?? null,
      isActive: true,
      ...(excludeScheduleId ? { id: { not: excludeScheduleId } } : {}),
    },
    select: { startDate: true, endDate: true },
  });

  const day = (d: Date) => d.toISOString().slice(0, 10);

  for (const existing of existingActive) {
    const newStartBeforeExistingEnd =
      existing.endDate === null || startDate < existing.endDate;
    const existingStartBeforeNewEnd =
      endDate === null || existing.startDate < endDate;

    if (newStartBeforeExistingEnd && existingStartBeforeNewEnd) {
      if (existing.endDate === null) {
        throw new AppError(
          409,
          `The active schedule starting ${day(existing.startDate)} has no end date. Set an end date on it (or turn it off), then create or activate the new one.`,
        );
      }
      throw new AppError(
        409,
        `These dates overlap the active schedule ${day(existing.startDate)} to ${day(existing.endDate)}. Change the dates, or turn that schedule off first.`,
      );
    }
  }
}

async function requireScheduleInShop(
  scheduleId: string,
  shopId: string,
  staffId?: string | null,
) {
  const schedule = await prisma.shopWorkingSchedule.findUnique({
    where: { id: scheduleId },
  });
  if (!schedule || schedule.shopId !== shopId)
    throw new AppError(404, 'Schedule not found');
  // When staffId is explicitly provided, verify the schedule belongs to that staff member
  if (staffId !== undefined && schedule.staffId !== (staffId ?? null)) {
    throw new AppError(404, 'Schedule not found');
  }
  return schedule;
}

export const createSchedule = async (
  userId: string,
  shopId: string,
  dto: CreateScheduleDto,
  staffId?: string | null,
) => {
  await requireOwner(userId, shopId);

  // If creating for a staff member, verify that member exists in the shop
  // (staffId here is UserShop.id, not User.id — a member may not have a login yet)
  if (staffId) {
    const staffMembership = await prisma.userShop.findFirst({
      where: { id: staffId, shopId },
    });
    if (!staffMembership)
      throw new AppError(404, 'Staff member not found in this shop');
  }

  assertValidRange(
    new Date(dto.startDate),
    dto.endDate ? new Date(dto.endDate) : null,
  );

  const newIsActive = dto.isActive ?? true;
  if (newIsActive) {
    await assertNoActiveOverlap(
      shopId,
      staffId,
      new Date(dto.startDate),
      dto.endDate ? new Date(dto.endDate) : null,
    );
  }

  const schedule = await guardOverlap(() =>
    prisma.shopWorkingSchedule.create({
      data: {
        shopId,
        staffId: staffId ?? null,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        isActive: newIsActive,
        days: dto.days
          ? {
              create: dto.days.map(({ day, isOpen, hours }) => ({
                day,
                isOpen,
                hours: hours ? { create: hours } : undefined,
              })),
            }
          : undefined,
      },
      include: WITH_DAYS,
    }),
  );

  logger.info(
    `Schedule created: ${schedule.id} for shop ${shopId}${staffId ? ` staff ${staffId}` : ''} by user ${userId}`,
  );
  return schedule;
};

export const getSchedules = async (
  userId: string,
  shopId: string,
  staffId?: string | null,
) => {
  await requireMembership(userId, shopId);

  return prisma.shopWorkingSchedule.findMany({
    where: {
      shopId,
      staffId: staffId !== undefined ? (staffId ?? null) : null,
    },
    include: WITH_DAYS,
    orderBy: { startDate: 'desc' },
  });
};

export const getSchedule = async (
  userId: string,
  shopId: string,
  scheduleId: string,
  staffId?: string | null,
) => {
  await requireMembership(userId, shopId);
  await requireScheduleInShop(scheduleId, shopId, staffId);

  return prisma.shopWorkingSchedule.findUnique({
    where: { id: scheduleId },
    include: WITH_DAYS,
  });
};

export const updateSchedule = async (
  userId: string,
  shopId: string,
  scheduleId: string,
  dto: UpdateScheduleDto,
  staffId?: string | null,
) => {
  await requireOwner(userId, shopId);
  const target = await requireScheduleInShop(scheduleId, shopId, staffId);

  const newStart = dto.startDate ? new Date(dto.startDate) : target.startDate;
  const newEnd =
    dto.endDate !== undefined
      ? dto.endDate
        ? new Date(dto.endDate)
        : null
      : target.endDate;
  assertValidRange(newStart, newEnd);

  // Re-check overlaps whenever the schedule will be active AND it is being
  // switched on or its dates are changing — editing an active schedule's dates
  // must not create an overlap either.
  const willBeActive = dto.isActive ?? target.isActive;
  const datesChanged =
    newStart.getTime() !== target.startDate.getTime() ||
    (newEnd?.getTime() ?? null) !== (target.endDate?.getTime() ?? null);
  if (willBeActive && (!target.isActive || datesChanged)) {
    await assertNoActiveOverlap(shopId, staffId, newStart, newEnd, scheduleId);
  }

  const schedule = await guardOverlap(() =>
    prisma.shopWorkingSchedule.update({
      where: { id: scheduleId },
      data: {
        ...(dto.startDate && { startDate: new Date(dto.startDate) }),
        ...(dto.endDate !== undefined && {
          endDate: dto.endDate ? new Date(dto.endDate) : null,
        }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      include: WITH_DAYS,
    }),
  );

  logger.info(
    `Schedule updated: ${scheduleId} for shop ${shopId} by user ${userId}`,
  );
  return schedule;
};

export const deleteSchedule = async (
  userId: string,
  shopId: string,
  scheduleId: string,
  staffId?: string | null,
) => {
  await requireOwner(userId, shopId);
  await requireScheduleInShop(scheduleId, shopId, staffId);

  await prisma.shopWorkingSchedule.delete({ where: { id: scheduleId } });

  logger.info(
    `Schedule deleted: ${scheduleId} for shop ${shopId} by user ${userId}`,
  );
};

export const upsertDays = async (
  userId: string,
  shopId: string,
  scheduleId: string,
  dto: UpsertDaysDto,
  staffId?: string | null,
) => {
  await requireOwner(userId, shopId);
  await requireScheduleInShop(scheduleId, shopId, staffId);

  await prisma.$transaction(async (tx) => {
    for (const { day, isOpen, hours } of dto.days) {
      const existingDay = await tx.shopWorkingDay.findUnique({
        where: { scheduleId_day: { scheduleId, day } },
      });

      if (existingDay) {
        await tx.shopWorkingDay.update({
          where: { id: existingDay.id },
          data: { isOpen },
        });

        if (hours !== undefined) {
          await tx.shopWorkingHourRange.deleteMany({
            where: { dayId: existingDay.id },
          });
          if (hours.length > 0) {
            await tx.shopWorkingHourRange.createMany({
              data: hours.map((h) => ({ ...h, dayId: existingDay.id })),
            });
          }
        }
      } else {
        await tx.shopWorkingDay.create({
          data: {
            scheduleId,
            day,
            isOpen,
            hours: hours ? { create: hours } : undefined,
          },
        });
      }
    }
  });

  logger.info(`Days upserted for schedule ${scheduleId} by user ${userId}`);

  return prisma.shopWorkingSchedule.findUnique({
    where: { id: scheduleId },
    include: WITH_DAYS,
  });
};

export const updateDay = async (
  userId: string,
  shopId: string,
  scheduleId: string,
  day: DayOfWeek,
  dto: UpdateDayDto,
  staffId?: string | null,
) => {
  await requireOwner(userId, shopId);
  await requireScheduleInShop(scheduleId, shopId, staffId);

  const result = await prisma.$transaction(async (tx) => {
    const existingDay = await tx.shopWorkingDay.findUnique({
      where: { scheduleId_day: { scheduleId, day } },
    });

    let workingDay;
    if (existingDay) {
      workingDay = await tx.shopWorkingDay.update({
        where: { id: existingDay.id },
        data: { ...(dto.isOpen !== undefined && { isOpen: dto.isOpen }) },
      });
    } else {
      workingDay = await tx.shopWorkingDay.create({
        data: { scheduleId, day, isOpen: dto.isOpen ?? true },
      });
    }

    if (dto.hours !== undefined) {
      await tx.shopWorkingHourRange.deleteMany({
        where: { dayId: workingDay.id },
      });
      if (dto.hours.length > 0) {
        await tx.shopWorkingHourRange.createMany({
          data: dto.hours.map((h) => ({ ...h, dayId: workingDay.id })),
        });
      }
    }

    return tx.shopWorkingDay.findUnique({
      where: { id: workingDay.id },
      include: { hours: true },
    });
  });

  logger.info(
    `Day ${day} updated for schedule ${scheduleId} by user ${userId}`,
  );
  return result;
};

/**
 * Every member's opening ranges for one calendar date (the shop's local date),
 * for the calendar's per-provider "not working" shading. A member is `null`
 * (closed) when they have no active schedule that day or the day is off; a
 * member with no schedule of their own is never given the shop-wide hours.
 * Inactive members and members without a login are included: their bookings
 * still show on the calendar.
 */
export const getDaySchedule = async (
  userId: string,
  shopId: string,
  date: string,
): Promise<Record<string, DayHours[] | null>> => {
  await requireMembership(userId, shopId); // 404 for non-members
  const members = await prisma.userShop.findMany({
    where: { shopId },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
  });
  const entries = await Promise.all(
    members.map(async (m) => {
      const hours = await loadDayHours(prisma, shopId, m.id, date);
      const ranges = hours
        ? hours
            .map(({ startTime, endTime }) => ({ startTime, endTime }))
            .sort((a, b) => a.startTime.localeCompare(b.startTime))
        : null;
      return [m.id, ranges] as const;
    }),
  );
  return Object.fromEntries(entries);
};
