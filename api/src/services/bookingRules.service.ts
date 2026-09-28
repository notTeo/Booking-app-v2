import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import {
  addDays,
  dateInZone,
  dateOnlyToUtc,
  todayInZone,
  weekdayOf,
  wallClockToUtcLenient,
} from '../utils/shopTime';
import { buildSlotCandidates } from '../utils/slots';

/**
 * Booking rules, enforced server-side on every path.
 *
 * Each violation is a 422 with a stable `code`. The public path is strict.
 * The owner/staff path applies the same rules but may bypass them with an
 * explicit `override: true` (the dashboard turns a 422 into a "book anyway?"
 * confirmation). Overlap with another booking is NOT one of these rules: it
 * is enforced inside the serializable transaction and can never be bypassed.
 */
export const BOOKING_RULE_CODES = [
  'BOOKING_IN_PAST',
  'BOOKING_BEYOND_ADVANCE_WINDOW',
  'SHOP_CLOSED',
  'OUTSIDE_OPENING_HOURS',
  'OFF_SLOT_GRID',
] as const;
export type BookingRuleCode = (typeof BOOKING_RULE_CODES)[number];

const violation = (code: BookingRuleCode, message: string) =>
  new AppError(422, message, code);

export interface DayHours {
  startTime: string;
  endTime: string;
}

/**
 * Opening ranges for a calendar date, or null if there is no active schedule
 * or the day is closed. `scheduleStaffId` null = the shop-wide schedule;
 * otherwise that staff member's own — a staff member with no schedule of
 * their own is closed (never silently given the shop-wide hours).
 */
export const loadDayHours = async (
  shopId: string,
  scheduleStaffId: string | null,
  date: string,
): Promise<DayHours[] | null> => {
  const requestedDate = dateOnlyToUtc(date);
  const schedule = await prisma.shopWorkingSchedule.findFirst({
    where: {
      shopId,
      staffId: scheduleStaffId,
      isActive: true,
      startDate: { lte: requestedDate },
      OR: [{ endDate: null }, { endDate: { gte: requestedDate } }],
    },
    include: {
      days: { where: { day: weekdayOf(date) }, include: { hours: true } },
    },
    orderBy: { startDate: 'desc' },
  });
  const day = schedule?.days[0];
  if (!day || !day.isOpen || day.hours.length === 0) return null;
  return day.hours;
};

export const assertBookingRules = async (params: {
  shopId: string;
  timezone: string;
  maxAdvanceDays: number;
  // null = shop-wide schedule (customer expressed no staff preference)
  scheduleStaffId: string | null;
  startTime: Date;
  endTime: Date;
  now?: Date;
}) => {
  const { shopId, timezone: zone, startTime, endTime } = params;
  const now = params.now ?? new Date();

  if (startTime < now) {
    throw violation('BOOKING_IN_PAST', 'That time is in the past.');
  }

  const date = dateInZone(startTime, zone);
  const lastDate = addDays(todayInZone(zone, now), params.maxAdvanceDays);
  if (date > lastDate) {
    throw violation(
      'BOOKING_BEYOND_ADVANCE_WINDOW',
      `Bookings can only be made up to ${params.maxAdvanceDays} days ahead.`,
    );
  }

  const hours = await loadDayHours(shopId, params.scheduleStaffId, date);
  if (!hours) {
    throw violation('SHOP_CLOSED', 'The shop is closed on that day.');
  }

  const durationMinutes = (endTime.getTime() - startTime.getTime()) / 60_000;
  const onGrid = buildSlotCandidates(date, zone, hours, durationMinutes).some(
    (c) => c.start.getTime() === startTime.getTime(),
  );
  if (onGrid) return;

  const insideHours = hours.some(
    (r) =>
      startTime >= wallClockToUtcLenient(date, r.startTime, zone) &&
      endTime <= wallClockToUtcLenient(date, r.endTime, zone),
  );
  throw insideHours
    ? violation('OFF_SLOT_GRID', 'That is not a bookable start time.')
    : violation('OUTSIDE_OPENING_HOURS', 'That time is outside opening hours.');
};
