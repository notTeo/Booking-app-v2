import { randomUUID } from 'crypto';
import {
  BookingStatus,
  type Prisma,
  type UserShop,
} from '../../dist/generated/prisma';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { redactCustomer } from '../utils/customerVisibility';
import { DATE_ONLY_RE, dayBoundsUtc, todayInZone } from '../utils/shopTime';
import {
  buildOutsideHoursCandidates,
  buildSlotCandidates,
  DEFAULT_CLOSED_DAY_HOURS,
  type OutsideReason,
} from '../utils/slots';
import {
  assertBookingRules,
  loadDayHours,
  loadShopRegularHours,
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

// Throws 404 (not 403, so shop existence isn't revealed) unless the caller
// belongs to the shop.
export const requireMembership = async (userId: string, shopId: string) => {
  const membership = await prisma.userShop.findUnique({
    where: { userId_shopId: { userId, shopId } },
  });
  if (!membership) throw new AppError(404, 'Shop not found');
  return membership;
};

// Whether the calling member can see customer contact info — owners always
// can; staff only when their own membership flag allows it.
export const canViewCustomerDetails = async (
  userId: string,
  shopId: string,
) => {
  const membership = await prisma.userShop.findUnique({
    where: { userId_shopId: { userId, shopId } },
  });
  if (!membership) throw new AppError(404, 'Shop not found');
  return membership.role === 'owner' || membership.canViewCustomerDetails;
};

// ── Staff resolution ─────────────────────────────────────────────────────────

export type BookingContext = 'public' | 'internal';

// Looks up the staff member a booking (or slots request) should use, enforcing
// that they're active and bookable in the given context. Covers both paths:
// an explicit staffId (previously never validated at all) and the "no
// preference" fallback (previously validated only against service assignment).
const resolveBookableStaff = async (
  db: Prisma.TransactionClient,
  shopId: string,
  staffId: string | null | undefined,
  serviceId: string,
  context: BookingContext,
): Promise<UserShop | null> => {
  const bookableField =
    context === 'internal' ? 'bookableInternally' : 'bookableByCustomers';

  if (staffId) {
    return db.userShop.findFirst({
      where: { id: staffId, shopId, active: true, [bookableField]: true },
    });
  }

  return db.userShop.findFirst({
    where: {
      shopId,
      active: true,
      [bookableField]: true,
      staffServices: { some: { serviceId } },
    },
  });
};

const staffUnavailable = (requestedStaffId: string | null | undefined) =>
  new AppError(
    400,
    requestedStaffId
      ? 'Selected staff member is not available for booking'
      : 'No staff available for this service',
  );

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
      where: { id: data.serviceId, shopId: shop.id },
    });
    if (!service) throw new AppError(404, 'Service not found');

    const endTime = new Date(startTime.getTime() + service.duration * 60_000);

    const staff = await resolveBookableStaff(
      tx,
      shop.id,
      data.staffId,
      data.serviceId,
      'public',
    );
    if (!staff) throw staffUnavailable(data.staffId);

    // Strict on the public path — there is no override. The schedule checked is
    // the one the slots endpoint used: the requested staff member's own, or the
    // shop-wide one when the customer had no preference.
    await assertBookingRules({
      db: tx,
      shopId: shop.id,
      timezone: shop.timezone,
      maxAdvanceDays: shop.maxAdvanceDays,
      slotIntervalMinutes: shop.slotIntervalMinutes,
      scheduleStaffId: data.staffId ? staff.id : null,
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
    // Verify caller is a member of the shop
    const membership = await tx.userShop.findUnique({
      where: { userId_shopId: { userId, shopId } },
    });
    if (!membership) throw new AppError(404, 'Shop not found');

    const service = await tx.service.findFirst({
      where: { id: data.serviceId, shopId },
    });
    if (!service) throw new AppError(404, 'Service not found');

    const endTime = new Date(startTime.getTime() + service.duration * 60_000);

    const staff = await resolveBookableStaff(
      tx,
      shopId,
      data.staffId,
      data.serviceId,
      'internal',
    );
    if (!staff) throw staffUnavailable(data.staffId);

    // Same rules as the public path; a violation is only allowed if its code
    // is in overrideRules. The overlap check in claimSlotAndCreate is never
    // skipped.
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
      scheduleStaffId: data.staffId ? staff.id : null,
      startTime,
      endTime,
      overrideRules: data.overrideRules,
    });

    return claimSlotAndCreate(tx, {
      shopId,
      serviceId: data.serviceId,
      staffId: staff.id,
      startTime,
      endTime,
      customer: { name: data.name, phone: data.phone, email: data.email },
      // Owner/staff may correct a customer's details on the way (matches the
      // wizard's autofill UI); the public path never may (see claimSlotAndCreate).
      overwriteCustomer: true,
      notes: data.notes,
      cancelToken,
      overriddenRules,
      createdById: userId,
    });
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
}

export type SlotsResult =
  | { status: 'closed'; slots?: OwnerSlotInfo[] }
  | { status: 'ok'; slots: SlotInfo[] | OwnerSlotInfo[] };

export const getAvailableSlots = async (
  shopId: string,
  date: string,
  staffId: string | null,
  serviceId: string,
  context: BookingContext = 'public',
  // Authenticated owner/staff view only: also list out-of-hours times. The
  // public route never passes this.
  options: { includeOutsideHours?: boolean } = {},
): Promise<SlotsResult> => {
  const withOutside = options.includeOutsideHours === true;
  // 1. Get the day's working hours. `date` is a calendar date in the shop's
  // timezone; its weekday does not depend on any timezone.
  if (!DATE_ONLY_RE.test(date))
    throw new AppError(400, 'date must be YYYY-MM-DD');

  // Booking-conflict checks always need a concrete, bookable staff member.
  // resolveBookableStaff validates an explicitly-passed staffId (active +
  // bookable in this context) and, when none was requested (public flow,
  // shop-wide hours), falls back to any eligible staff assigned to the
  // service. Schedule lookup below, on the other hand, is keyed on the
  // staffId that was actually passed in, with no such fallback: a staff
  // member with no schedule of their own is "closed", not silently given
  // the shop-wide hours.
  const staff = await resolveBookableStaff(
    prisma,
    shopId,
    staffId,
    serviceId,
    context,
  );
  if (!staff)
    return withOutside ? { status: 'closed', slots: [] } : { status: 'closed' };
  const resolvedStaffId = staff.id;

  const hours = await loadDayHours(prisma, shopId, staffId, date);
  if (!hours && !withOutside) return { status: 'closed' };

  // 2. Get service duration
  const service = await prisma.service.findFirst({
    where: { id: serviceId, shopId },
  });
  if (!service)
    return withOutside ? { status: 'closed', slots: [] } : { status: 'closed' };

  const { timezone: zone, slotIntervalMinutes } =
    await getShopTimeSettings(shopId);

  // 3. Bookings that overlap the shop-local day for this staff member —
  // excluding statuses that don't actually hold the slot (matches the
  // create-time conflict check's exclusion set), so a canceled/no-show
  // booking doesn't keep blocking its old time from being offered again.
  const { start: dayStart, end: dayEnd } = dayBoundsUtc(date, zone);
  const existingBookings = await prisma.booking.findMany({
    where: {
      shopId,
      staffId: resolvedStaffId,
      status: { notIn: SLOT_FREEING_STATUSES },
      startTime: { lt: dayEnd },
      endTime: { gt: dayStart },
    },
    select: { startTime: true, endTime: true },
  });

  const isFree = (c: { start: Date; end: Date }) =>
    !existingBookings.some((b) => b.startTime < c.end && b.endTime > c.start);

  if (withOutside) {
    // Owner/staff view: the usual in-hours grid plus the out-of-hours grid. On a
    // closed day (or a provider's day off) there are no in-hours slots and the
    // grid is sized from the shop's regular hours for that weekday.
    const now = new Date();
    const inHours = hours
      ? buildSlotCandidates(
          date,
          zone,
          hours,
          service.duration,
          slotIntervalMinutes,
        )
      : [];
    const closedDayRanges = hours
      ? []
      : ((await loadShopRegularHours(prisma, shopId, date)) ?? [
          DEFAULT_CLOSED_DAY_HOURS,
        ]);
    const outsideCandidates = buildOutsideHoursCandidates(
      date,
      zone,
      hours ?? [],
      closedDayRanges,
      service.duration,
      slotIntervalMinutes,
    );
    const all = [
      ...inHours.map((c) => ({
        ...c,
        reason: undefined as OutsideReason | undefined,
      })),
      ...outsideCandidates,
    ].sort((a, b) => a.start.getTime() - b.start.getTime());
    const slots: OwnerSlotInfo[] = all.map((c) => ({
      time: c.time,
      available: isFree(c),
      outsideHours: c.reason !== undefined,
      past: c.start < now,
      ...(c.reason && { reason: c.reason }),
    }));
    return hours ? { status: 'ok', slots } : { status: 'closed', slots };
  }

  // 4. Every theoretical slot in the open window (wall-clock in the shop's
  // timezone), flagged with whether it's actually free — callers decide
  // whether to filter these down (public/customer view) or show booked ones
  // disabled (internal view).
  const slots: SlotInfo[] = buildSlotCandidates(
    date,
    zone,
    hours!,
    service.duration,
    slotIntervalMinutes,
  ).map((c) => ({ time: c.time, available: isFree(c) }));

  return { status: 'ok', slots };
};

// ── Owner / Staff ────────────────────────────────────────────────────────────

export const listBookings = async (
  shopId: string,
  filters: { date?: string; status?: BookingStatus; staffId?: string },
  canViewCustomer = true,
) => {
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

export const getBookingStats = async (
  shopId: string,
  canViewCustomer = true,
) => {
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
  shopId: string,
  bookingId: string,
  canViewCustomer = true,
) => {
  const booking = await loadBooking(prisma, shopId, bookingId);
  return {
    ...booking,
    customer: redactCustomer(booking.customer, canViewCustomer),
  };
};

export const updateBooking = async (
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
  canViewCustomer = true,
) =>
  // Everything is read inside the (retried) transaction — see the note on the
  // create functions.
  serializableTransaction(async (tx) => {
    const existing = await loadBooking(tx, shopId, bookingId); // 404 if gone

    // Any service/staff being referenced must belong to this shop.
    let newService: { duration: number } | null = null;
    if (data.serviceId) {
      newService = await tx.service.findFirst({
        where: { id: data.serviceId, shopId },
      });
      if (!newService) throw new AppError(404, 'Service not found');
    }
    if (data.staffId) {
      const newStaff = await tx.userShop.findFirst({
        where: { id: data.staffId, shopId },
      });
      if (!newStaff) throw new AppError(404, 'Staff member not found');
    }

    const serviceChanged =
      !!data.serviceId && data.serviceId !== existing.serviceId;
    const staffChanged =
      data.staffId !== undefined && data.staffId !== existing.staffId;
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

export const deleteBooking = async (
  userId: string,
  shopId: string,
  bookingId: string,
) => {
  const membership = await requireMembership(userId, shopId); // 404 for non-members
  // Hard delete is owner-only; staff can still cancel via the status endpoint.
  if (membership.role !== 'owner')
    throw new AppError(403, 'Only the shop owner can delete bookings');
  await getBooking(shopId, bookingId); // throws 404 if not found
  await prisma.booking.delete({ where: { id: bookingId } });
};

export const updateBookingStatus = async (
  shopId: string,
  bookingId: string,
  status: BookingStatus,
  canViewCustomer = true,
) =>
  serializableTransaction(async (tx) => {
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

  if (!booking) throw new AppError(404, 'Booking not found');
  if (booking.status === BookingStatus.CANCELED)
    throw new AppError(409, 'Booking is already cancelled');

  return prisma.booking.update({
    where: { id: booking.id },
    data: { status: BookingStatus.CANCELED },
    include: { customer: true, service: true, shop: true },
  });
};
