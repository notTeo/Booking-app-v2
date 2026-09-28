import type { Prisma } from '../../dist/generated/prisma';
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
 * Each violation is a 422 with a stable `code`, and the body lists ALL current
 * violations (`violations: [{ code, message, overridable }]`), not just the
 * first. The public path is strict. The owner/staff path applies the same rules
 * but may accept violations explicitly, by code (`overrideRules: [...]`); only
 * OVERRIDABLE_RULE_CODES can be accepted, and a code accepted for one
 * violation never covers another. Overlap with another booking is NOT one of
 * these rules: it is enforced inside the serializable transaction and can never
 * be bypassed.
 */
export const BOOKING_RULE_CODES = [
  'BOOKING_IN_PAST',
  'BOOKING_BEYOND_ADVANCE_WINDOW',
  'SHOP_CLOSED',
  'OUTSIDE_OPENING_HOURS',
  'OFF_SLOT_GRID',
] as const;
export type BookingRuleCode = (typeof BOOKING_RULE_CODES)[number];

// BOOKING_BEYOND_ADVANCE_WINDOW is deliberately absent: raise the shop's
// maxAdvanceDays instead.
export const OVERRIDABLE_RULE_CODES = [
  'OUTSIDE_OPENING_HOURS',
  'SHOP_CLOSED',
  'BOOKING_IN_PAST',
  'OFF_SLOT_GRID',
] as const satisfies readonly BookingRuleCode[];

const isOverridable = (code: BookingRuleCode) =>
  (OVERRIDABLE_RULE_CODES as readonly string[]).includes(code);

export interface RuleViolation {
  code: BookingRuleCode;
  message: string;
}

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
  db: Prisma.TransactionClient,
  shopId: string,
  scheduleStaffId: string | null,
  date: string,
): Promise<DayHours[] | null> => {
  const requestedDate = dateOnlyToUtc(date);
  const schedule = await db.shopWorkingSchedule.findFirst({
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

interface RuleParams {
  // Pass the transaction client: the schedule is read inside the transaction.
  db: Prisma.TransactionClient;
  shopId: string;
  timezone: string;
  maxAdvanceDays: number;
  // null = shop-wide schedule (customer expressed no staff preference)
  scheduleStaffId: string | null;
  startTime: Date;
  endTime: Date;
  now?: Date;
}

/** Every rule the booking currently breaks, in a stable order. */
export const findBookingViolations = async (
  params: RuleParams,
): Promise<RuleViolation[]> => {
  const { db, shopId, timezone: zone, startTime, endTime } = params;
  const now = params.now ?? new Date();
  const violations: RuleViolation[] = [];

  if (startTime < now) {
    violations.push({
      code: 'BOOKING_IN_PAST',
      message: 'That time is in the past.',
    });
  }

  const date = dateInZone(startTime, zone);
  const lastDate = addDays(todayInZone(zone, now), params.maxAdvanceDays);
  if (date > lastDate) {
    violations.push({
      code: 'BOOKING_BEYOND_ADVANCE_WINDOW',
      message: `Bookings can only be made up to ${params.maxAdvanceDays} days ahead.`,
    });
  }

  const hours = await loadDayHours(db, shopId, params.scheduleStaffId, date);
  if (!hours) {
    // No opening ranges at all: there is nothing to be "outside" of or off-grid
    // against, so the day being closed is the one schedule violation.
    violations.push({
      code: 'SHOP_CLOSED',
      message: 'The shop is closed on that day.',
    });
    return violations;
  }

  const durationMinutes = (endTime.getTime() - startTime.getTime()) / 60_000;
  const onGrid = buildSlotCandidates(date, zone, hours, durationMinutes).some(
    (c) => c.start.getTime() === startTime.getTime(),
  );
  if (onGrid) return violations;

  const insideHours = hours.some(
    (r) =>
      startTime >= wallClockToUtcLenient(date, r.startTime, zone) &&
      endTime <= wallClockToUtcLenient(date, r.endTime, zone),
  );
  violations.push(
    insideHours
      ? { code: 'OFF_SLOT_GRID', message: 'That is not a bookable start time.' }
      : {
          code: 'OUTSIDE_OPENING_HOURS',
          message: 'That time is outside opening hours.',
        },
  );
  return violations;
};

/**
 * Throws a 422 unless every violation is overridable AND was accepted by code.
 * Returns the codes that were violated and accepted — exactly what is stored on
 * the booking (codes accepted but not violated are dropped, so a booking is
 * never tagged with something it did not need). The public path passes no
 * `overrideRules`, so any violation blocks.
 */
export const assertBookingRules = async (
  params: RuleParams & { overrideRules?: readonly string[] },
): Promise<BookingRuleCode[]> => {
  const violations = await findBookingViolations(params);
  const accepted = new Set(params.overrideRules ?? []);
  const blocking = violations.find(
    (v) => !isOverridable(v.code) || !accepted.has(v.code),
  );
  if (blocking) {
    throw new AppError(422, blocking.message, blocking.code, undefined, {
      violations: violations.map((v) => ({
        ...v,
        overridable: isOverridable(v.code),
      })),
    });
  }
  return violations.map((v) => v.code);
};
