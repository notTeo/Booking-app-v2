import { DayOfWeek } from '../../dist/generated/prisma';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { prisma } from '../utils/prisma';

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
  if (membership.role !== 'owner') throw new AppError(403, 'Only the shop owner can manage working hours');
  return membership;
}

async function requireScheduleInShop(
  scheduleId: string,
  shopId: string,
  staffId?: string | null,
) {
  const schedule = await prisma.shopWorkingSchedule.findUnique({
    where: { id: scheduleId },
  });
  if (!schedule || schedule.shopId !== shopId) throw new AppError(404, 'Schedule not found');
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
  if (staffId) {
    const staffMembership = await prisma.userShop.findUnique({
      where: { userId_shopId: { userId: staffId, shopId } },
    });
    if (!staffMembership) throw new AppError(404, 'Staff member not found in this shop');
  }

  const schedule = await prisma.shopWorkingSchedule.create({
    data: {
      shopId,
      staffId: staffId ?? null,
      startDate: new Date(dto.startDate),
      endDate: dto.endDate ? new Date(dto.endDate) : null,
      isActive: dto.isActive ?? true,
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
  });

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
  await requireScheduleInShop(scheduleId, shopId, staffId);

  const schedule = await prisma.shopWorkingSchedule.update({
    where: { id: scheduleId },
    data: {
      ...(dto.startDate && { startDate: new Date(dto.startDate) }),
      ...(dto.endDate !== undefined && { endDate: dto.endDate ? new Date(dto.endDate) : null }),
      ...(dto.isActive !== undefined && { isActive: dto.isActive }),
    },
    include: WITH_DAYS,
  });

  logger.info(`Schedule updated: ${scheduleId} for shop ${shopId} by user ${userId}`);
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

  logger.info(`Schedule deleted: ${scheduleId} for shop ${shopId} by user ${userId}`);
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
          await tx.shopWorkingHourRange.deleteMany({ where: { dayId: existingDay.id } });
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
      await tx.shopWorkingHourRange.deleteMany({ where: { dayId: workingDay.id } });
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

  logger.info(`Day ${day} updated for schedule ${scheduleId} by user ${userId}`);
  return result;
};
