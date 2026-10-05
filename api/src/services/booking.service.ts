import { randomUUID } from 'crypto';
import {
  BookingStatus,
  type Prisma,
  type UserShop,
} from '../../dist/generated/prisma';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { redactCustomer } from '../utils/customerVisibility';
import { canViewCustomerDetails, requireShopAccess } from '../utils/shopAccess';
import {
  DATE_ONLY_RE,
  dateInZone,
  dayBoundsUtc,
  todayInZone,
} from '../utils/shopTime';
import {
  buildOutsideHoursCandidates,
  buildSlotCandidates,
  DEFAULT_CLOSED_DAY_HOURS,
  type OutsideReason,
} from '../utils/slots';
import {
  assertBookingRules,
  findBookingViolations,
  isOverridable,
  loadDayHours,
  loadTeamRegularHours,
  type DayHours,
} from './bookingRules.service';
import { lockProvider, serializableTransaction } from '../utils/serializable';

// Hard rule: two bookings that hold a provider's time can never overlap.
// Only these statuses release a slot. COMPLETED does NOT — that time was
// really used — so it blocks overlap like PENDING/CONFIRMED do.
export const SLOT_FREEING_STATUSES: BookingStatus[] = ['CANCELED', 'NO_SHOW'];
// No booking may run longer than this (services are capped at it, and writes
// re-check). The overlap query relies on it: an existing booking that overlaps
// a new one must START within this window before the new start, so Postgres can
// use a tight two-sided range on (staffId, startTime) instead of reading — and
// predicate-locking — the provider's entire history, which made unrelated
// concurrent bookings abort each other.
export const MAX_BOOKING_MINUTES = 24 * 60;

const assertBookingLength = (startTime: Date, endTime: Date) => {
  if (
    (endTime.getTime() - startTime.getTime()) / 60_000 >
    MAX_BOOKING_MINUTES
  ) {
    throw new AppError(
      422,
      'A booking cannot be longer than 24 hours.',
      'BOOKING_TOO_LONG',
    );
  }
};

/** WHERE clause for "another booking holds this provider's time". */
const overlapWhere = (
  staffId: string,
  startTime: Date,
  endTime: Date,
  excludeBookingId?: string,
) => ({
  staffId,
  ...(excludeBookingId && { id: { not: excludeBookingId } }),
  status: { notIn: SLOT_FREEING_STATUSES },
  startTime: {
    lt: endTime,
    gt: new Date(startTime.getTime() - MAX_BOOKING_MINUTES * 60_000),
  },
  endTime: { gt: startTime },
});

const freesSlot = (status: BookingStatus) =>
  SLOT_FREEING_STATUSES.includes(status);

// ── Staff resolution ─────────────────────────────────────────────────────────

export type BookingContext = 'public' | 'internal';

const bookableFieldFor = (context: BookingContext) =>
  context === 'internal' ? 'bookableInternally' : 'bookableByCustomers';

// Looks up the explicitly requested staff member, enforcing that they're
// active and bookable in the given context.
const resolveBookableStaff = async (
  db: Prisma.TransactionClient,
  shopId: string,
  staffId: string,
  context: BookingContext,
): Promise<UserShop | null> =>
  db.userShop.findFirst({
    where: {
      id: staffId,
      shopId,
      active: true,
      [bookableFieldFor(context)]: true,
    },
  });

// Every active team member who can take this service in the given context —
// the pool "any staff" draws from.
const listEligibleStaff = (
  db: Prisma.TransactionClient | typeof prisma,
  shopId: string,
  serviceId: string,
  context: BookingContext,
): Promise<UserShop[]> =>
  db.userShop.findMany({
    where: {
      shopId,
      active: true,
      [bookableFieldFor(context)]: true,
      staffServices: { some: { serviceId } },
    },
    orderBy: { createdAt: 'asc' },
  });

const staffUnavailable = (requestedStaffId: string | null | undefined) =>
  new AppError(
    400,
    requestedStaffId
      ? 'Selected staff member is not available for booking'
      : 'No staff available for this service',
  );

/**
 * "Any staff": picks who gets a booking when the customer expressed no
 * preference. Only members who are free at that time and whose own working
 * hours allow it are candidates; among them the one with the fewest booked
 * minutes that day wins, a random one on a tie. When nobody is fully clean but some
 * members are free and the caller accepted the violations (owner/staff
 * override), those are candidates instead.
 *
 * If no candidate qualifies the first free member (else the first member) is
 * returned so the caller's own rule/overlap checks produce the proper error.
 */
const pickAnyStaff = async (
  tx: Prisma.TransactionClient,
  p: {
    shopId: string;
    serviceId: string;
    context: BookingContext;
    timezone: string;
    maxAdvanceDays: number;
    slotIntervalMinutes: number;
    startTime: Date;
    endTime: Date;
    overrideRules?: readonly string[];
  },
): Promise<UserShop> => {
  const team = await listEligibleStaff(tx, p.shopId, p.serviceId, p.context);
  if (team.length === 0) throw staffUnavailable(null);

  const accepted = new Set(p.overrideRules ?? []);
  const clean: UserShop[] = [];
  const overridable: UserShop[] = [];
  const free: UserShop[] = [];
  for (const member of team) {
    const conflict = await tx.booking.findFirst({
      where: overlapWhere(member.id, p.startTime, p.endTime),
      select: { id: true },
    });
    if (conflict) continue;
    free.push(member);
    const violations = await findBookingViolations({
      db: tx,
      shopId: p.shopId,
      timezone: p.timezone,
      maxAdvanceDays: p.maxAdvanceDays,
      slotIntervalMinutes: p.slotIntervalMinutes,
      scheduleStaffId: member.id,
      startTime: p.startTime,
      endTime: p.endTime,
    });
    if (violations.length === 0) clean.push(member);
    else if (
      violations.every((v) => isOverridable(v.code) && accepted.has(v.code))
    )
      overridable.push(member);
  }

  const pool = clean.length > 0 ? clean : overridable;
  if (pool.length === 0) return free[0] ?? team[0];
  if (pool.length === 1) return pool[0];

  const { start, end } = dayBoundsUtc(
    dateInZone(p.startTime, p.timezone),
    p.timezone,
  );
  // Load = minutes booked that day, so one long appointment weighs more than
  // several short ones.
  const dayBookings = await tx.booking.findMany({
    where: {
      shopId: p.shopId,
      staffId: { in: pool.map((m) => m.id) },
      status: { notIn: SLOT_FREEING_STATUSES },
      startTime: { gte: start, lt: end },
    },
    select: { staffId: true, startTime: true, endTime: true },
  });
  const load = new Map<string, number>();
  for (const b of dayBookings) {
    load.set(
      b.staffId,
      (load.get(b.staffId) ?? 0) +
        (b.endTime.getTime() - b.startTime.getTime()) / 60_000,
    );
  }
  const lightest = Math.min(...pool.map((m) => load.get(m.id) ?? 0));
  const leastLoaded = pool.filter((m) => (load.get(m.id) ?? 0) === lightest);
  return leastLoaded[Math.floor(Math.random() * leastLoaded.length)];
};

const BOOKING_INCLUDE = {
  customer: true,
  service: true,
  shop: true,
  staff: { select: { id: true, name: true, email: true } },
} as const;

/**
 * Find-or-create the customer for a booking, by (shopId, phone).
 *
 * `overwriteExisting` controls what happens when the phone already belongs to
 * a customer: owner/staff bookings may correct a customer's name/email on the
 * way (deliberate front-desk behaviour, matches the wizard's autofill UI) —
 * but the PUBLIC path must never let a booking submitted with a different
 * name/email silently rewrite someone else's existing record. Either way a
 * new customer is always created with the submitted details; only an
 * existing match is affected.
 */
const findOrCreateCustomer = (
  tx: Prisma.TransactionClient,
  shopId: string,
  customer: { name: string; phone: string; email?: string },
  overwriteExisting: boolean,
) =>
  overwriteExisting
    ? tx.customer.upsert({
        where: { shopId_phone: { shopId, phone: customer.phone } },
        update: { name: customer.name, email: customer.email ?? undefined },
        create: { shopId, ...customer },
      })
    : tx.customer.upsert({
        where: { shopId_phone: { shopId, phone: customer.phone } },
        update: {},
        create: { shopId, ...customer },
      });

/**
 * Overlap check + customer + insert, for a provider's time. Runs inside the
 * caller's serializable transaction. Never bypassable.
 */
const claimSlotAndCreate = async (
  tx: Prisma.TransactionClient,
  p: {
    shopId: string;
    serviceId: string;
    staffId: string;
    startTime: Date;
    endTime: Date;
    customer: { name: string; phone: string; email?: string };
    // Public bookings must never overwrite an existing customer's name/email;
    // owner/staff bookings may (see findOrCreateCustomer).
    overwriteCustomer: boolean;
    notes?: string;
    cancelToken: string;
    // Owner/staff creation only: the rules accepted, and who created it.
    overriddenRules?: string[];
    createdById?: string;
  },
) => {
  assertBookingLength(p.startTime, p.endTime);
  // First thing: queue behind any other booking write for this provider, so
  // the overlap check below sees everything committed before us.
  await lockProvider(tx, p.staffId);
  const conflict = await tx.booking.findFirst({
    where: overlapWhere(p.staffId, p.startTime, p.endTime),
  });
  if (conflict)
    throw new AppError(409, 'Time slot is already booked', 'SLOT_TAKEN');

  const customer = await findOrCreateCustomer(
    tx,
    p.shopId,
    p.customer,
    p.overwriteCustomer,
  );

  return tx.booking.create({
    data: {
      shopId: p.shopId,
      customerId: customer.id,
      serviceId: p.serviceId,
      staffId: p.staffId,
      startTime: p.startTime,
      endTime: p.endTime,
      notes: p.notes,
      cancelToken: p.cancelToken,
      overriddenRules: p.overriddenRules ?? [],
      createdById: p.createdById ?? null,
    },
    include: BOOKING_INCLUDE,
  });
};

// ── Public ──────────────────────────────────────────────────────────────────

// NOTE on the two create functions below: the transaction function is RETRIED
// on serialization failures, so it must (1) read everything the booking depends
// on — shop, service, staff, schedule — INSIDE the transaction, never before it
// and reused; and (2) have no side effects (emails are sent by the controller
// after this returns).

export const createBooking = async (
  slug: string,
  data: {
    name: string;
    phone: string;
    email?: string;
    serviceId: string;
    staffId: string | null | undefined;
    startTime: string; // ISO string — rename from `date`
    notes?: string;
  },
) => {
  const startTime = new Date(data.startTime);
  const cancelToken = randomUUID(); // only persisted by the attempt that commits

  return serializableTransaction(async (tx) => {
    const shop = await tx.shop.findFirst({ where: { slug, isActive: true } });
    if (!shop) throw new AppError(404, 'Shop not found');

    const service = await tx.service.findFirst({
      where: { id: data.serviceId, shopId: shop.id, isActive: true },
    });
    if (!service) throw new AppError(404, 'Service not found');

    const endTime = new Date(startTime.getTime() + service.duration * 60_000);

    // The requested staff member, or — with no preference — whichever free
    // team member working then has the fewest bookings that day.
    const staff = data.staffId
      ? await resolveBookableStaff(tx, shop.id, data.staffId, 'public')
      : await pickAnyStaff(tx, {
          shopId: shop.id,
          serviceId: data.serviceId,
          context: 'public',
          timezone: shop.timezone,
          maxAdvanceDays: shop.maxAdvanceDays,
          slotIntervalMinutes: shop.slotIntervalMinutes,
          startTime,
          endTime,
        });
    if (!staff) throw staffUnavailable(data.staffId);

    // Strict on the public path — there is no override. The schedule checked is
    // the assigned team member's own, the same one the slots endpoint used.
    await assertBookingRules({
      db: tx,
      shopId: shop.id,
      timezone: shop.timezone,
      maxAdvanceDays: shop.maxAdvanceDays,
      slotIntervalMinutes: shop.slotIntervalMinutes,
      scheduleStaffId: staff.id,
      startTime,
      endTime,
    });

    return claimSlotAndCreate(tx, {
      shopId: shop.id,
      serviceId: data.serviceId,
      staffId: staff.id,
      startTime,
      endTime,
      customer: { name: data.name, phone: data.phone, email: data.email },
      overwriteCustomer: false,
      notes: data.notes,
      cancelToken,
    });
  });
};

// ── Owner / Staff booking creation ──────────────────────────────────────────

export const createBookingForShop = async (
  userId: string,
  shopId: string,
  data: {
    name: string;
    phone: string;
    email?: string;
    serviceId: string;
    staffId?: string | null;
    startTime: string;
    notes?: string;
    // Booking rules the caller explicitly accepts, by code (validated to the
    // overridable set). Never bypasses the overlap check.
    overrideRules?: string[];
  },
) => {
  const startTime = new Date(data.startTime);
  const cancelToken = randomUUID();

  return serializableTransaction(async (tx) => {
    // Verify caller is an active member of the shop
    const callerCanViewCustomer = canViewCustomerDetails(
      await requireShopAccess(userId, shopId, { db: tx }),
    );

    const service = await tx.service.findFirst({
      where: { id: data.serviceId, shopId, isActive: true },
    });
    if (!service) throw new AppError(404, 'Service not found');

    const endTime = new Date(startTime.getTime() + service.duration * 60_000);

    const shop = await tx.shop.findUniqueOrThrow({
      where: { id: shopId },
      select: {
        timezone: true,
        maxAdvanceDays: true,
        slotIntervalMinutes: true,
      },
    });

    // The requested staff member, or — with no preference — whichever free
    // team member working then has the fewest bookings that day.
    const staff = data.staffId
      ? await resolveBookableStaff(tx, shopId, data.staffId, 'internal')
      : await pickAnyStaff(tx, {
          shopId,
          serviceId: data.serviceId,
          context: 'internal',
          timezone: shop.timezone,
          maxAdvanceDays: shop.maxAdvanceDays,
          slotIntervalMinutes: shop.slotIntervalMinutes,
          startTime,
          endTime,
          overrideRules: data.overrideRules,
        });
    if (!staff) throw staffUnavailable(data.staffId);

    // Same rules as the public path; a violation is only allowed if its code
    // is in overrideRules. The overlap check in claimSlotAndCreate is never
    // skipped.
    const overriddenRules = await assertBookingRules({
      db: tx,
      shopId,
      timezone: shop.timezone,
      maxAdvanceDays: shop.maxAdvanceDays,
      slotIntervalMinutes: shop.slotIntervalMinutes,
      scheduleStaffId: staff.id,
      startTime,
      endTime,
      overrideRules: data.overrideRules,
    });

    const booking = await claimSlotAndCreate(tx, {
      shopId,
      serviceId: data.serviceId,
      staffId: staff.id,
      startTime,
      endTime,
      customer: { name: data.name, phone: data.phone, email: data.email },
      // Owner/staff may correct a customer's details on the way (matches the
      // wizard's autofill UI); the public path never may (see
      // claimSlotAndCreate), and neither may a member who is not allowed to
      // see or edit customer details: their booking attaches to the existing
      // customer unchanged.
      overwriteCustomer: callerCanViewCustomer,
      notes: data.notes,
      cancelToken,
      overriddenRules,
      createdById: userId,
    });
    // The full row, for the confirmation email. The controller redacts the
    // customer in the response using callerCanViewCustomer.
    return { ...booking, callerCanViewCustomer };
  });
};

// The shop's IANA timezone — every wall-clock <-> UTC conversion uses it.
const getShopTimezone = async (shopId: string) =>
  (await getShopTimeSettings(shopId)).timezone;

// Timezone plus the slot grid step, for callers that build slot grids.
const getShopTimeSettings = async (shopId: string) => {
  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    select: { timezone: true, slotIntervalMinutes: true },
  });
  if (!shop) throw new AppError(404, 'Shop not found');
  return shop;
};

// ── Slots ───────────────────────────────────────

export interface SlotInfo {
  time: string; // "HH:MM"
  available: boolean;
}

// Owner/staff view with includeOutsideHours: every slot says whether it is
// outside working hours (and why) and whether it is already in the past.
// `available` still only means "not overlapping an active booking".
export interface OwnerSlotInfo extends SlotInfo {
  outsideHours: boolean;
  past: boolean;
  reason?: OutsideReason;
  // An in-hours start that is not on the shop's own slot grid (only possible
  // when the caller asked for a finer intervalMinutes): booking it is a
  // 'custom time' exception.
  offGrid?: boolean;
}

export type SlotsResult =
  | { status: 'closed'; slots?: OwnerSlotInfo[] }
  | { status: 'ok'; slots: SlotInfo[] | OwnerSlotInfo[] };

// Picks, for one start time, the most useful view of it across team members:
// a free in-hours slot beats a free out-of-hours one, which beats a booked
// in-hours one, which beats the rest.
const slotRank = (s: OwnerSlotInfo) =>
  (s.available ? 2 : 0) + (s.outsideHours ? 0 : 1);

export const getAvailableSlots = async (
  shopId: string,
  date: string,
  staffId: string | null,
  serviceId: string,
  context: BookingContext = 'public',
  // Authenticated owner/staff view only: also list out-of-hours times. The
  // public route never passes this.
  options: {
    includeOutsideHours?: boolean;
    intervalMinutes?: number;
    // Rescheduling an existing booking: its own service stays usable even if
    // the service has since been deactivated (only new bookings are blocked).
    forBookingId?: string;
  } = {},
): Promise<SlotsResult> => {
  const withOutside = options.includeOutsideHours === true;
  // `date` is a calendar date in the shop's timezone; its weekday does not
  // depend on any timezone.
  if (!DATE_ONLY_RE.test(date))
    throw new AppError(400, 'date must be YYYY-MM-DD');

  const closed = (): SlotsResult =>
    withOutside ? { status: 'closed', slots: [] } : { status: 'closed' };

  // Whose hours and bookings decide availability: the requested staff member
  // (validated: active + bookable in this context), or — with no preference —
  // every eligible team member. A member with no schedule of their own is not
  // working; there are no shop-wide hours to fall back on.
  const eligible = await listEligibleStaff(prisma, shopId, serviceId, context);
  let team: UserShop[];
  if (staffId) {
    const member = await resolveBookableStaff(prisma, shopId, staffId, context);
    team = member ? [member] : [];
  } else {
    team = eligible;
  }
  if (team.length === 0) return closed();

  const service = await prisma.service.findFirst({
    where: {
      id: serviceId,
      shopId,
      OR: [
        { isActive: true },
        ...(options.forBookingId
          ? [{ bookings: { some: { id: options.forBookingId, shopId } } }]
          : []),
      ],
    },
  });
  if (!service) return closed();

  const { timezone: zone, slotIntervalMinutes } =
    await getShopTimeSettings(shopId);
  const { start: dayStart, end: dayEnd } = dayBoundsUtc(date, zone);
  // The caller may look at a finer (or coarser) grid than the shop's own, for
  // this one booking; times off the shop grid are flagged.
  const step = options.intervalMinutes ?? slotIntervalMinutes;
  const now = new Date();

  const memberHours = await Promise.all(
    team.map(async (m) => ({
      member: m,
      hours: await loadDayHours(prisma, shopId, m.id, date),
    })),
  );
  const anyHours = memberHours.some((m) => m.hours);
  if (!anyHours && !withOutside) return { status: 'closed' };

  // On a closed day (or a provider's day off) there is no opening to size the
  // out-of-hours grid from: use the team's regular hours for that weekday.
  const closedDayRanges: DayHours[] =
    withOutside && memberHours.some((m) => !m.hours)
      ? ((await loadTeamRegularHours(prisma, shopId, date, [
          ...new Set([...eligible, ...team].map((m) => m.id)),
        ])) ?? [DEFAULT_CLOSED_DAY_HOURS])
      : [];

  const perMember = await Promise.all(
    memberHours.map(async ({ member, hours }) => {
      // Bookings that overlap the shop-local day for this staff member —
      // excluding statuses that don't actually hold the slot (matches the
      // create-time conflict check's exclusion set), so a canceled/no-show
      // booking doesn't keep blocking its old time from being offered again.
      const existingBookings = await prisma.booking.findMany({
        where: {
          shopId,
          staffId: member.id,
          status: { notIn: SLOT_FREEING_STATUSES },
          startTime: { lt: dayEnd },
          endTime: { gt: dayStart },
          // Rescheduling: the booking being moved never blocks its own new
          // time (same exclusion as the update-time overlap check).
          ...(options.forBookingId && { id: { not: options.forBookingId } }),
        },
        select: { startTime: true, endTime: true },
      });
      const isFree = (c: { start: Date; end: Date }) =>
        !existingBookings.some(
          (b) => b.startTime < c.end && b.endTime > c.start,
        );

      if (!withOutside) {
        const slots: OwnerSlotInfo[] = hours
          ? buildSlotCandidates(
              date,
              zone,
              hours,
              service.duration,
              slotIntervalMinutes,
            ).map((c) => ({
              time: c.time,
              available: isFree(c),
              outsideHours: false,
              past: false,
            }))
          : [];
        return slots;
      }

      // Owner/staff view: the usual in-hours grid plus the out-of-hours grid.
      const inHours = hours
        ? buildSlotCandidates(date, zone, hours, service.duration, step)
        : [];
      const shopGridTimes = new Set(
        hours && step !== slotIntervalMinutes
          ? buildSlotCandidates(
              date,
              zone,
              hours,
              service.duration,
              slotIntervalMinutes,
            ).map((c) => c.time)
          : inHours.map((c) => c.time),
      );
      const outsideCandidates = buildOutsideHoursCandidates(
        date,
        zone,
        hours ?? [],
        closedDayRanges,
        service.duration,
        step,
      );
      const all = [
        ...inHours.map((c) => ({
          ...c,
          reason: undefined as OutsideReason | undefined,
        })),
        ...outsideCandidates,
      ].sort((a, b) => a.start.getTime() - b.start.getTime());
      return all.map(
        (c): OwnerSlotInfo => ({
          time: c.time,
          available: isFree(c),
          outsideHours: c.reason !== undefined,
          past: c.start < now,
          ...(c.reason && { reason: c.reason }),
          ...(c.reason === undefined &&
            !shopGridTimes.has(c.time) && { offGrid: true }),
        }),
      );
    }),
  );

  // Combine the team's views of each start time (a single member passes
  // through unchanged). Every theoretical slot is listed, flagged with whether
  // it's actually free — callers decide whether to filter these down
  // (public/customer view) or show booked ones disabled (internal view).
  const byTime = new Map<string, OwnerSlotInfo>();
  for (const slots of perMember) {
    for (const slot of slots) {
      const current = byTime.get(slot.time);
      if (!current || slotRank(slot) > slotRank(current))
        byTime.set(slot.time, slot);
    }
  }
  const merged = [...byTime.values()].sort((a, b) =>
    a.time.localeCompare(b.time),
  );

  if (withOutside) return { status: anyHours ? 'ok' : 'closed', slots: merged };
  return {
    status: 'ok',
    slots: merged.map(({ time, available }) => ({ time, available })),
  };
};

// ── Owner / Staff ────────────────────────────────────────────────────────────

export const listBookings = async (
  userId: string,
  shopId: string,
  filters: { date?: string; status?: BookingStatus; staffId?: string },
) => {
  const canViewCustomer = canViewCustomerDetails(
    await requireShopAccess(userId, shopId),
  );
  const where: Record<string, unknown> = { shopId };

  if (filters.date) {
    if (!DATE_ONLY_RE.test(filters.date))
      throw new AppError(400, 'date must be YYYY-MM-DD');
    const { start, end } = dayBoundsUtc(
      filters.date,
      await getShopTimezone(shopId),
    );
    where['startTime'] = { gte: start, lt: end };
  }

  if (filters.status) where['status'] = filters.status;
  if (filters.staffId) where['staffId'] = filters.staffId;

  const bookings = await prisma.booking.findMany({
    where,
    include: { customer: true, service: true },
    orderBy: { startTime: 'asc' },
  });

  return bookings.map((b) => ({
    ...b,
    customer: redactCustomer(b.customer, canViewCustomer),
  }));
};

export const getBookingStats = async (userId: string, shopId: string) => {
  const canViewCustomer = canViewCustomerDetails(
    await requireShopAccess(userId, shopId),
  );
  const now = new Date();
  const zone = await getShopTimezone(shopId);
  const { start: startOfToday, end: endOfToday } = dayBoundsUtc(
    todayInZone(zone, now),
    zone,
  );

  const [todayCount, upcomingCount, upcoming] = await Promise.all([
    prisma.booking.count({
      where: {
        shopId,
        startTime: { gte: startOfToday, lt: endOfToday },
        status: { notIn: ['CANCELED'] },
      },
    }),
    prisma.booking.count({
      where: {
        shopId,
        startTime: { gte: now },
        status: { notIn: ['CANCELED', 'NO_SHOW'] },
      },
    }),
    prisma.booking.findMany({
      where: {
        shopId,
        startTime: { gte: now },
        status: { notIn: ['CANCELED', 'NO_SHOW'] },
      },
      include: {
        customer: true,
        service: true,
        staff: { select: { id: true, name: true, email: true } },
      },
      orderBy: { startTime: 'asc' },
      take: 5,
    }),
  ]);

  return {
    todayCount,
    upcomingCount,
    upcoming: upcoming.map((b) => ({
      ...b,
      customer: redactCustomer(b.customer, canViewCustomer),
    })),
  };
};

// Raw booking (with customer + service), scoped to the shop. Takes the client so
// it can run inside a transaction.
const loadBooking = async (
  db: Prisma.TransactionClient,
  shopId: string,
  bookingId: string,
) => {
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: { customer: true, service: true },
  });
  if (!booking || booking.shopId !== shopId)
    throw new AppError(404, 'Booking not found');
  return booking;
};

export const getBooking = async (
  userId: string,
  shopId: string,
  bookingId: string,
) => {
  const canViewCustomer = canViewCustomerDetails(
    await requireShopAccess(userId, shopId),
  );
  const booking = await loadBooking(prisma, shopId, bookingId);
  return {
    ...booking,
    customer: redactCustomer(booking.customer, canViewCustomer),
  };
};

export const updateBooking = async (
  userId: string,
  shopId: string,
  bookingId: string,
  data: {
    startTime?: string;
    serviceId?: string;
    staffId?: string;
    notes?: string;
    // Booking rules the caller explicitly accepts, by code. Never bypasses the
    // overlap check.
    overrideRules?: string[];
  },
) =>
  // Everything is read inside the (retried) transaction — see the note on the
  // create functions.
  serializableTransaction(async (tx) => {
    const canViewCustomer = canViewCustomerDetails(
      await requireShopAccess(userId, shopId, { db: tx }),
    );
    const existing = await loadBooking(tx, shopId, bookingId); // 404 if gone

    // Any service/staff being referenced must belong to this shop.
    let newService: { duration: number; isActive: boolean } | null = null;
    if (data.serviceId) {
      newService = await tx.service.findFirst({
        where: { id: data.serviceId, shopId },
      });
      if (!newService) throw new AppError(404, 'Service not found');
      // Keeping the booking's current service is always fine; moving it TO a
      // deactivated one is not.
      if (data.serviceId !== existing.serviceId && !newService.isActive)
        throw new AppError(404, 'Service not found');
    }
    const staffChanged =
      data.staffId !== undefined && data.staffId !== existing.staffId;
    if (data.staffId) {
      // Moving a booking to a different staff member requires them to be
      // active; resending the unchanged staffId (whose member may have been
      // deactivated since) only has to belong to the shop.
      const newStaff = await tx.userShop.findFirst({
        where: {
          id: data.staffId,
          shopId,
          ...(staffChanged && { active: true }),
        },
      });
      if (!newStaff) throw new AppError(404, 'Staff member not found');
    }

    const serviceChanged =
      !!data.serviceId && data.serviceId !== existing.serviceId;
    // Anything that moves the booking in time — a new start, a new staff
    // member, or a new service (which changes how long it runs) — is a
    // scheduling change: end time is recomputed and the overlap check re-runs.
    // Notes-only edits skip all of that.
    const schedulingChanged =
      !!data.startTime || serviceChanged || staffChanged;

    if (!schedulingChanged) {
      const updated = await tx.booking.update({
        where: { id: bookingId },
        data: {
          ...(data.notes !== undefined && { notes: data.notes }),
          ...(data.serviceId && { serviceId: data.serviceId }),
        },
        include: { customer: true, service: true },
      });
      return {
        ...updated,
        customer: redactCustomer(updated.customer, canViewCustomer),
      };
    }

    const finalStaffId = data.staffId ?? existing.staffId;
    const finalStartTime = data.startTime
      ? new Date(data.startTime)
      : existing.startTime;
    const duration = newService?.duration ?? existing.service.duration;
    const finalEndTime = new Date(finalStartTime.getTime() + duration * 60_000);

    // Same rules as creation; overlap never is bypassable. The stored codes
    // describe the booking's CURRENT time, so a reschedule replaces them.
    const shop = await tx.shop.findUniqueOrThrow({
      where: { id: shopId },
      select: {
        timezone: true,
        maxAdvanceDays: true,
        slotIntervalMinutes: true,
      },
    });
    const overriddenRules = await assertBookingRules({
      db: tx,
      shopId,
      timezone: shop.timezone,
      maxAdvanceDays: shop.maxAdvanceDays,
      slotIntervalMinutes: shop.slotIntervalMinutes,
      scheduleStaffId: finalStaffId,
      startTime: finalStartTime,
      endTime: finalEndTime,
      overrideRules: data.overrideRules,
    });

    // Same overlap check as creation, excluding this booking itself.
    assertBookingLength(finalStartTime, finalEndTime);
    await lockProvider(tx, finalStaffId); // queue behind other writes for this provider
    const conflict = await tx.booking.findFirst({
      where: overlapWhere(
        finalStaffId,
        finalStartTime,
        finalEndTime,
        bookingId,
      ),
    });
    if (conflict)
      throw new AppError(409, 'Time slot is already booked', 'SLOT_TAKEN');

    const updated = await tx.booking.update({
      where: { id: bookingId },
      data: {
        startTime: finalStartTime,
        endTime: finalEndTime,
        staffId: finalStaffId,
        overriddenRules,
        ...(data.serviceId && { serviceId: data.serviceId }),
        ...(data.notes !== undefined && { notes: data.notes }),
      },
      include: { customer: true, service: true },
    });
    return {
      ...updated,
      customer: redactCustomer(updated.customer, canViewCustomer),
    };
  });

export const updateBookingStatus = async (
  userId: string,
  shopId: string,
  bookingId: string,
  status: BookingStatus,
) =>
  serializableTransaction(async (tx) => {
    const canViewCustomer = canViewCustomerDetails(
      await requireShopAccess(userId, shopId, { db: tx }),
    );
    const existing = await loadBooking(tx, shopId, bookingId); // 404 if gone

    // Moving a booking from a slot-freeing status (CANCELED/NO_SHOW) back to
    // one that holds the provider's time re-occupies that slot. Someone else
    // may have booked it meanwhile, so the overlap check runs again.
    if (freesSlot(existing.status) && !freesSlot(status)) {
      await lockProvider(tx, existing.staffId);
      const conflict = await tx.booking.findFirst({
        where: overlapWhere(
          existing.staffId,
          existing.startTime,
          existing.endTime,
          bookingId,
        ),
      });
      if (conflict)
        throw new AppError(409, 'Time slot is already booked', 'SLOT_TAKEN');
    }

    const updated = await tx.booking.update({
      where: { id: bookingId },
      data: { status },
      include: { customer: true, service: true },
    });
    return {
      ...updated,
      customer: redactCustomer(updated.customer, canViewCustomer),
    };
  });

export const cancelBookingByToken = async (token: string) => {
  const booking = await prisma.booking.findUnique({
    where: { cancelToken: token },
    include: { customer: true, service: true, shop: true },
  });

  if (!booking)
    throw new AppError(404, 'Booking not found', 'BOOKING_NOT_FOUND');
  if (booking.status === BookingStatus.CANCELED)
    throw new AppError(
      409,
      'Booking is already cancelled',
      'BOOKING_ALREADY_CANCELED',
    );
  if (booking.status === BookingStatus.COMPLETED)
    throw new AppError(
      409,
      'Booking is already completed',
      'BOOKING_COMPLETED',
    );
  if (booking.status === BookingStatus.NO_SHOW)
    throw new AppError(
      409,
      'Booking was marked as a no-show',
      'BOOKING_NO_SHOW',
    );
  // No grace window: once the booking has started it can't be cancelled here.
  if (booking.startTime.getTime() <= Date.now())
    throw new AppError(
      409,
      'Booking has already started or passed',
      'BOOKING_IN_PAST',
    );

  return prisma.booking.update({
    where: { id: booking.id },
    data: { status: BookingStatus.CANCELED },
    include: { customer: true, service: true, shop: true },
  });
};
