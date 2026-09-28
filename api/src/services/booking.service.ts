import { randomUUID } from 'crypto';
import { BookingStatus, UserShop } from '../../dist/generated/prisma';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { redactCustomer } from '../utils/customerVisibility';
import { DATE_ONLY_RE, dayBoundsUtc, todayInZone } from '../utils/shopTime';
import { buildSlotCandidates } from '../utils/slots';
import { assertBookingRules, loadDayHours } from './bookingRules.service';

// Hard rule: two bookings that hold a provider's time can never overlap.
// Only these statuses release a slot. COMPLETED does NOT — that time was
// really used — so it blocks overlap like PENDING/CONFIRMED do.
export const SLOT_FREEING_STATUSES: BookingStatus[] = ['CANCELED', 'NO_SHOW'];
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
  shopId: string,
  staffId: string | null | undefined,
  serviceId: string,
  context: BookingContext,
): Promise<UserShop | null> => {
  const bookableField =
    context === 'internal' ? 'bookableInternally' : 'bookableByCustomers';

  if (staffId) {
    return prisma.userShop.findFirst({
      where: { id: staffId, shopId, active: true, [bookableField]: true },
    });
  }

  return prisma.userShop.findFirst({
    where: {
      shopId,
      active: true,
      [bookableField]: true,
      staffServices: { some: { serviceId } },
    },
  });
};

// ── Public ──────────────────────────────────────────────────────────────────

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
  const shop = await prisma.shop.findUnique({ where: { slug } });
  if (!shop) throw new AppError(404, 'Shop not found');

  const service = await prisma.service.findFirst({
    where: { id: data.serviceId, shopId: shop.id },
  });
  if (!service) throw new AppError(404, 'Service not found');

  const startTime = new Date(data.startTime);
  const endTime = new Date(startTime.getTime() + service.duration * 60 * 1000);
  const cancelToken = randomUUID();

  const staff = await resolveBookableStaff(
    shop.id,
    data.staffId,
    data.serviceId,
    'public',
  );
  if (!staff) {
    throw new AppError(
      400,
      data.staffId
        ? 'Selected staff member is not available for booking'
        : 'No staff available for this service',
    );
  }
  const staffId = staff.id;

  // Strict on the public path — there is no override. The schedule checked is
  // the one the slots endpoint used: the requested staff member's own, or the
  // shop-wide one when the customer had no preference.
  await assertBookingRules({
    shopId: shop.id,
    timezone: shop.timezone,
    maxAdvanceDays: shop.maxAdvanceDays,
    scheduleStaffId: data.staffId ? staffId : null,
    startTime,
    endTime,
  });

  try {
    return await prisma.$transaction(
      async (tx) => {
        // Overlap check: any booking for same staff where ranges intersect
        const conflict = await tx.booking.findFirst({
          where: {
            staffId,
            status: { notIn: SLOT_FREEING_STATUSES },
            startTime: { lt: endTime },
            endTime: { gt: startTime },
          },
        });

        if (conflict)
          throw new AppError(409, 'Time slot is already booked', 'SLOT_TAKEN');

        const customer = await tx.customer.upsert({
          where: { shopId_phone: { shopId: shop.id, phone: data.phone } },
          update: { name: data.name, email: data.email ?? undefined },
          create: {
            shopId: shop.id,
            name: data.name,
            phone: data.phone,
            email: data.email,
          },
        });

        return tx.booking.create({
          data: {
            shopId: shop.id,
            customerId: customer.id,
            serviceId: data.serviceId,
            staffId,
            startTime,
            endTime,
            notes: data.notes,
            cancelToken,
          },
          include: {
            customer: true,
            service: true,
            shop: true,
            staff: { select: { id: true, name: true, email: true } },
          },
        });
      },
      { isolationLevel: 'Serializable' },
    );
  } catch (err: any) {
    // P2034 = transaction conflict under Serializable — safe to retry, but for MVP just 409
    if (err?.code === 'P2034')
      throw new AppError(409, 'Booking conflict, please try again');
    throw err;
  }
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
    // Bypass the booking rules (never the overlap check).
    override?: boolean;
  },
) => {
  // Verify caller is a member of the shop
  const membership = await prisma.userShop.findUnique({
    where: { userId_shopId: { userId, shopId } },
  });
  if (!membership) throw new AppError(404, 'Shop not found');

  const service = await prisma.service.findFirst({
    where: { id: data.serviceId, shopId },
  });
  if (!service) throw new AppError(404, 'Service not found');

  const startTime = new Date(data.startTime);
  const endTime = new Date(startTime.getTime() + service.duration * 60 * 1000);
  const cancelToken = randomUUID();

  const staff = await resolveBookableStaff(
    shopId,
    data.staffId,
    data.serviceId,
    'internal',
  );
  if (!staff) {
    throw new AppError(
      400,
      data.staffId
        ? 'Selected staff member is not available for booking'
        : 'No staff available for this service',
    );
  }
  const staffId = staff.id;

  // Same rules as the public path, bypassable only with an explicit
  // override. The overlap check inside the transaction below is never skipped.
  if (!data.override) {
    const shop = await prisma.shop.findUniqueOrThrow({
      where: { id: shopId },
      select: { timezone: true, maxAdvanceDays: true },
    });
    await assertBookingRules({
      shopId,
      timezone: shop.timezone,
      maxAdvanceDays: shop.maxAdvanceDays,
      scheduleStaffId: data.staffId ? staffId : null,
      startTime,
      endTime,
    });
  }

  try {
    return await prisma.$transaction(
      async (tx) => {
        const conflict = await tx.booking.findFirst({
          where: {
            staffId,
            status: { notIn: SLOT_FREEING_STATUSES },
            startTime: { lt: endTime },
            endTime: { gt: startTime },
          },
        });

        if (conflict)
          throw new AppError(409, 'Time slot is already booked', 'SLOT_TAKEN');

        const customer = await tx.customer.upsert({
          where: { shopId_phone: { shopId, phone: data.phone } },
          update: { name: data.name, email: data.email ?? undefined },
          create: {
            shopId,
            name: data.name,
            phone: data.phone,
            email: data.email,
          },
        });

        return tx.booking.create({
          data: {
            shopId,
            customerId: customer.id,
            serviceId: data.serviceId,
            staffId,
            startTime,
            endTime,
            notes: data.notes,
            cancelToken,
          },
          include: {
            customer: true,
            service: true,
            shop: true,
            staff: { select: { id: true, name: true, email: true } },
          },
        });
      },
      { isolationLevel: 'Serializable' },
    );
  } catch (err: any) {
    if (err?.code === 'P2034')
      throw new AppError(409, 'Booking conflict, please try again');
    throw err;
  }
};

// The shop's IANA timezone — every wall-clock <-> UTC conversion uses it.
const getShopTimezone = async (shopId: string) => {
  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    select: { timezone: true },
  });
  if (!shop) throw new AppError(404, 'Shop not found');
  return shop.timezone;
};

// ── Slots ───────────────────────────────────────

export interface SlotInfo {
  time: string; // "HH:MM"
  available: boolean;
}

export type SlotsResult =
  | { status: 'closed' }
  | { status: 'ok'; slots: SlotInfo[] };

export const getAvailableSlots = async (
  shopId: string,
  date: string,
  staffId: string | null,
  serviceId: string,
  context: BookingContext = 'public',
): Promise<SlotsResult> => {
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
  const staff = await resolveBookableStaff(shopId, staffId, serviceId, context);
  if (!staff) return { status: 'closed' };
  const resolvedStaffId = staff.id;

  const hours = await loadDayHours(shopId, staffId, date);
  if (!hours) return { status: 'closed' };

  // 2. Get service duration
  const service = await prisma.service.findFirst({
    where: { id: serviceId, shopId },
  });
  if (!service) return { status: 'closed' };

  const zone = await getShopTimezone(shopId);

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

  // 4. Every theoretical slot in the open window (wall-clock in the shop's
  // timezone), flagged with whether it's actually free — callers decide
  // whether to filter these down (public/customer view) or show booked ones
  // disabled (internal view).
  const slots: SlotInfo[] = buildSlotCandidates(
    date,
    zone,
    hours,
    service.duration,
  ).map((c) => ({
    time: c.time,
    available: !existingBookings.some(
      (b) => b.startTime < c.end && b.endTime > c.start,
    ),
  }));

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

export const getBooking = async (
  shopId: string,
  bookingId: string,
  canViewCustomer = true,
) => {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { customer: true, service: true },
  });

  if (!booking || booking.shopId !== shopId)
    throw new AppError(404, 'Booking not found');

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
    // Bypass the booking rules (never the overlap check).
    override?: boolean;
  },
  canViewCustomer = true,
) => {
  const existing = await getBooking(shopId, bookingId); // throws 404 if not found

  // Any service/staff being referenced must belong to this shop.
  let newService: { duration: number } | null = null;
  if (data.serviceId) {
    newService = await prisma.service.findFirst({
      where: { id: data.serviceId, shopId },
    });
    if (!newService) throw new AppError(404, 'Service not found');
  }
  if (data.staffId) {
    const newStaff = await prisma.userShop.findFirst({
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
  // scheduling change: end time is recomputed and the overlap check re-runs
  // inside the serializable transaction. Notes-only edits skip all of that.
  const schedulingChanged = !!data.startTime || serviceChanged || staffChanged;

  if (!schedulingChanged) {
    const updated = await prisma.booking.update({
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

  const updateData = {
    startTime: finalStartTime,
    endTime: finalEndTime,
    staffId: finalStaffId,
    ...(data.serviceId && { serviceId: data.serviceId }),
    ...(data.notes !== undefined && { notes: data.notes }),
  };

  // Same rules as creation (bypassable by an override); overlap never is.
  if (!data.override) {
    const shop = await prisma.shop.findUniqueOrThrow({
      where: { id: shopId },
      select: { timezone: true, maxAdvanceDays: true },
    });
    await assertBookingRules({
      shopId,
      timezone: shop.timezone,
      maxAdvanceDays: shop.maxAdvanceDays,
      scheduleStaffId: finalStaffId,
      startTime: finalStartTime,
      endTime: finalEndTime,
    });
  }

  try {
    return await prisma.$transaction(
      async (tx) => {
        // Same overlap check as createBooking, excluding this booking itself.
        const conflict = await tx.booking.findFirst({
          where: {
            id: { not: bookingId },
            staffId: finalStaffId,
            status: { notIn: SLOT_FREEING_STATUSES },
            startTime: { lt: finalEndTime },
            endTime: { gt: finalStartTime },
          },
        });

        if (conflict)
          throw new AppError(409, 'Time slot is already booked', 'SLOT_TAKEN');

        const updated = await tx.booking.update({
          where: { id: bookingId },
          data: updateData,
          include: { customer: true, service: true },
        });
        return {
          ...updated,
          customer: redactCustomer(updated.customer, canViewCustomer),
        };
      },
      { isolationLevel: 'Serializable' },
    );
  } catch (err: any) {
    // P2034 = transaction conflict under Serializable — same 409 shape as createBooking
    if (err?.code === 'P2034')
      throw new AppError(409, 'Booking conflict, please try again');
    throw err;
  }
};

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
) => {
  const existing = await getBooking(shopId, bookingId); // throws 404 if not found

  const include = { customer: true, service: true } as const;
  // Moving a booking from a slot-freeing status (CANCELED/NO_SHOW) back to one
  // that holds the provider's time re-occupies that slot. Someone else may
  // have booked it meanwhile, so the overlap check must run again — inside a
  // serializable transaction, like every other write that takes a slot.
  const reoccupies = freesSlot(existing.status) && !freesSlot(status);
  if (!reoccupies) {
    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: { status },
      include,
    });
    return {
      ...updated,
      customer: redactCustomer(updated.customer, canViewCustomer),
    };
  }

  try {
    return await prisma.$transaction(
      async (tx) => {
        const conflict = await tx.booking.findFirst({
          where: {
            id: { not: bookingId },
            staffId: existing.staffId,
            status: { notIn: SLOT_FREEING_STATUSES },
            startTime: { lt: existing.endTime },
            endTime: { gt: existing.startTime },
          },
        });
        if (conflict)
          throw new AppError(409, 'Time slot is already booked', 'SLOT_TAKEN');

        const updated = await tx.booking.update({
          where: { id: bookingId },
          data: { status },
          include,
        });
        return {
          ...updated,
          customer: redactCustomer(updated.customer, canViewCustomer),
        };
      },
      { isolationLevel: 'Serializable' },
    );
  } catch (err: any) {
    if (err?.code === 'P2034')
      throw new AppError(409, 'Booking conflict, please try again');
    throw err;
  }
};

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
