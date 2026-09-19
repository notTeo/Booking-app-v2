import { randomUUID } from 'crypto';
import { BookingStatus, DayOfWeek, UserShop } from '../../dist/generated/prisma';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { redactCustomer } from '../utils/customerVisibility';

// Whether the calling member can see customer contact info — owners always
// can; staff only when their own membership flag allows it.
export const canViewCustomerDetails = async (userId: string, shopId: string) => {
  const membership = await prisma.userShop.findUnique({
    where: { userId_shopId: { userId, shopId } },
  });
  if (!membership) throw new AppError(404, 'Shop not found');
  return membership.role === 'owner' || membership.canViewCustomerDetails;
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

  const service = await prisma.service.findUnique({ where: { id: data.serviceId } });
  if (!service) throw new AppError(404, 'Service not found');

  const startTime = new Date(data.startTime);
  const endTime = new Date(startTime.getTime() + service.duration * 60 * 1000);
  const cancelToken = randomUUID();
  let staffId = data.staffId;

if (!staffId) {
  const anyStaff = await prisma.userShop.findFirst({
    where: {
      shopId: shop.id,
      staffServices: { some: { serviceId: data.serviceId } },
    },
  });
  if (!anyStaff) throw new AppError(400, 'No staff available for this service');
  staffId = anyStaff.id;
}
  try {
    return await prisma.$transaction(
      async (tx) => {
        // Overlap check: any booking for same staff where ranges intersect
        const conflict = await tx.booking.findFirst({
          where: {
            staffId,
            status: { notIn: ['CANCELED', 'NO_SHOW', 'COMPLETED'] },
            startTime: { lt: endTime },
            endTime: { gt: startTime },
          },
        });

        if (conflict) throw new AppError(409, 'Time slot is already booked');

        const customer = await tx.customer.upsert({
          where: { shopId_phone: { shopId: shop.id, phone: data.phone } },
          update: { name: data.name, email: data.email ?? undefined },
          create: { shopId: shop.id, name: data.name, phone: data.phone, email: data.email },
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
          include: { customer: true, service: true, shop: true, staff: { select: { id: true, name: true, email: true } } },
        });
      },
      { isolationLevel: 'Serializable' },
    );
  } catch (err: any) {
    // P2034 = transaction conflict under Serializable — safe to retry, but for MVP just 409
    if (err?.code === 'P2034') throw new AppError(409, 'Booking conflict, please try again');
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
  },
) => {
  // Verify caller is a member of the shop
  const membership = await prisma.userShop.findUnique({
    where: { userId_shopId: { userId, shopId } },
  });
  if (!membership) throw new AppError(404, 'Shop not found');

  const service = await prisma.service.findUnique({ where: { id: data.serviceId } });
  if (!service) throw new AppError(404, 'Service not found');

  const startTime = new Date(data.startTime);
  const endTime = new Date(startTime.getTime() + service.duration * 60 * 1000);
  const cancelToken = randomUUID();
  let staffId = data.staffId;

  if (!staffId) {
    const anyStaff = await prisma.userShop.findFirst({
      where: {
        shopId,
        staffServices: { some: { serviceId: data.serviceId } },
      },
    });
    if (!anyStaff) throw new AppError(400, 'No staff available for this service');
    staffId = anyStaff.id;
  }

  try {
    return await prisma.$transaction(
      async (tx) => {
        const conflict = await tx.booking.findFirst({
          where: {
            staffId,
            status: { notIn: ['CANCELED', 'NO_SHOW', 'COMPLETED'] },
            startTime: { lt: endTime },
            endTime: { gt: startTime },
          },
        });

        if (conflict) throw new AppError(409, 'Time slot is already booked');

        const customer = await tx.customer.upsert({
          where: { shopId_phone: { shopId, phone: data.phone } },
          update: { name: data.name, email: data.email ?? undefined },
          create: { shopId, name: data.name, phone: data.phone, email: data.email },
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
          include: { customer: true, service: true, shop: true, staff: { select: { id: true, name: true, email: true } } },
        });
      },
      { isolationLevel: 'Serializable' },
    );
  } catch (err: any) {
    if (err?.code === 'P2034') throw new AppError(409, 'Booking conflict, please try again');
    throw err;
  }
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
): Promise<SlotsResult> => {

  // 1. Get the day's working hours
  const DAY_MAP = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
  const dayOfWeek = DAY_MAP[new Date(date).getDay()] as DayOfWeek;

  // Booking-conflict checks always need a concrete staff member; when none
  // was requested (public flow, shop-wide hours) fall back to any staff on
  // the shop — unchanged from prior behavior. Schedule lookup below, on the
  // other hand, is keyed on the staffId that was actually passed in, with no
  // such fallback: a staff member with no schedule of their own is "closed",
  // not silently given the shop-wide hours.
  let resolvedStaffId = staffId;
  if (staffId === null) {
    const randomStaff = await prisma.userShop.findFirst({
      where: { shopId },
      select: { id: true },
    });
    if (!randomStaff) return { status: 'closed' };
    resolvedStaffId = randomStaff.id;
  }

  const requestedDate = new Date(`${date}T00:00:00.000Z`);

  const schedule = await prisma.shopWorkingSchedule.findFirst({
    where: {
      shopId,
      staffId,
      isActive: true,
      startDate: { lte: requestedDate },
      OR: [
        { endDate: null },
        { endDate: { gte: requestedDate } },
      ],
    },
    include: {
      days: {
        where: { day: dayOfWeek },
        include: { hours: true },
      },
    },
    orderBy: { startDate: 'desc' },
  });
  if (!schedule) return { status: 'closed' };

  const day = schedule.days[0];
  if (!day || !day.isOpen) return { status: 'closed' };

  // 2. Get service duration
  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!service) return { status: 'closed' };

  // 3. Get existing bookings for that day + staff — excluding statuses that
  // don't actually hold the slot (matches the create-time conflict check's
  // exclusion set), so a canceled/no-show booking doesn't keep blocking its
  // old time from being offered again.
  const existingBookings = (await listBookings(shopId, {
    date,
    staffId: resolvedStaffId ?? undefined,
  })).filter((b) => !['CANCELED', 'NO_SHOW', 'COMPLETED'].includes(b.status));

  // 4. Generate every theoretical slot in the open window, flagged with
  // whether it's actually free — callers decide whether to filter these
  // down (public/customer view) or show booked ones disabled (internal view).
  const slots: SlotInfo[] = [];

  const toMins = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };

  const toHHMM = (mins: number) => {
    const h = Math.floor(mins / 60).toString().padStart(2, '0');
    const m = (mins % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
  };

  for (const hourRange of day.hours) {
    const open = toMins(hourRange.startTime);   // e.g. 540  (09:00)
    const close = toMins(hourRange.endTime);     // e.g. 1080 (18:00)

    for (let start = open; start + service.duration <= close; start += 30) {
      const candidateStart = new Date(`${date}T${toHHMM(start)}:00`);
      const candidateEnd = new Date(`${date}T${toHHMM(start + service.duration)}:00`);

      const hasOverlap = existingBookings.some(
        (b) => b.startTime < candidateEnd && b.endTime > candidateStart
      );

      slots.push({ time: toHHMM(start), available: !hasOverlap });
    }
  }

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
  const start = new Date(filters.date);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(filters.date);
  end.setUTCHours(23, 59, 59, 999);
  where['startTime'] = { gte: start, lte: end };
}

  if (filters.status) where['status'] = filters.status;
  if (filters.staffId) where['staffId'] = filters.staffId;

  const bookings = await prisma.booking.findMany({
    where,
    include: { customer: true, service: true },
    orderBy: { startTime: 'asc' },
  });

  return bookings.map((b) => ({ ...b, customer: redactCustomer(b.customer, canViewCustomer) }));
};

export const getBookingStats = async (shopId: string, canViewCustomer = true) => {
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setUTCHours(0, 0, 0, 0);
  const endOfToday = new Date(now);
  endOfToday.setUTCHours(23, 59, 59, 999);

  const [todayCount, upcomingCount, upcoming] = await Promise.all([
    prisma.booking.count({
      where: {
        shopId,
        startTime: { gte: startOfToday, lte: endOfToday },
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
      include: { customer: true, service: true, staff: { select: { id: true, name: true, email: true } } },
      orderBy: { startTime: 'asc' },
      take: 5,
    }),
  ]);

  return {
    todayCount,
    upcomingCount,
    upcoming: upcoming.map((b) => ({ ...b, customer: redactCustomer(b.customer, canViewCustomer) })),
  };
};

export const getBooking = async (shopId: string, bookingId: string, canViewCustomer = true) => {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { customer: true, service: true },
  });

  if (!booking || booking.shopId !== shopId) throw new AppError(404, 'Booking not found');

  return { ...booking, customer: redactCustomer(booking.customer, canViewCustomer) };
};

export const updateBooking = async (
  shopId: string,
  bookingId: string,
  data: { startTime?: string; serviceId?: string; staffId?: string; notes?: string },
  canViewCustomer = true,
) => {
  const existing = await getBooking(shopId, bookingId); // throws 404 if not found

  let startTime: Date | undefined;
  let endTime: Date | undefined;

  if (data.startTime) {
    startTime = new Date(data.startTime);
    let duration = existing.service.duration;
    if (data.serviceId && data.serviceId !== existing.serviceId) {
      const newService = await prisma.service.findUnique({ where: { id: data.serviceId } });
      if (!newService) throw new AppError(404, 'Service not found');
      duration = newService.duration;
    }
    endTime = new Date(startTime.getTime() + duration * 60 * 1000);
  }

  const updateData = {
    ...(startTime && { startTime, endTime }),
    ...(data.serviceId && { serviceId: data.serviceId }),
    ...(data.staffId && { staffId: data.staffId }),
    ...(data.notes !== undefined && { notes: data.notes }),
  };

  // Only re-run the overlap check when the edit actually touches scheduling
  // (time and/or staff). Non-scheduling edits (notes, service-only, etc.)
  // skip straight to a plain update, same as before this fix.
  const staffChanged = data.staffId !== undefined && data.staffId !== existing.staffId;
  const schedulingChanged = !!startTime || staffChanged;

  if (!schedulingChanged) {
    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: updateData,
      include: { customer: true, service: true },
    });
    return { ...updated, customer: redactCustomer(updated.customer, canViewCustomer) };
  }

  const finalStaffId = data.staffId ?? existing.staffId;
  const finalStartTime = startTime ?? existing.startTime;
  const finalEndTime = endTime ?? existing.endTime;

  try {
    return await prisma.$transaction(
      async (tx) => {
        // Same overlap check as createBooking, excluding this booking itself.
        const conflict = await tx.booking.findFirst({
          where: {
            id: { not: bookingId },
            staffId: finalStaffId,
            status: { notIn: ['CANCELED', 'NO_SHOW', 'COMPLETED'] },
            startTime: { lt: finalEndTime },
            endTime: { gt: finalStartTime },
          },
        });

        if (conflict) throw new AppError(409, 'Time slot is already booked');

        const updated = await tx.booking.update({
          where: { id: bookingId },
          data: updateData,
          include: { customer: true, service: true },
        });
        return { ...updated, customer: redactCustomer(updated.customer, canViewCustomer) };
      },
      { isolationLevel: 'Serializable' },
    );
  } catch (err: any) {
    // P2034 = transaction conflict under Serializable — same 409 shape as createBooking
    if (err?.code === 'P2034') throw new AppError(409, 'Booking conflict, please try again');
    throw err;
  }
};

export const deleteBooking = async (shopId: string, bookingId: string) => {
  await getBooking(shopId, bookingId); // throws 404 if not found
  await prisma.booking.delete({ where: { id: bookingId } });
};

export const updateBookingStatus = async (
  shopId: string,
  bookingId: string,
  status: BookingStatus,
  canViewCustomer = true,
) => {
  await getBooking(shopId, bookingId); // throws 404 if not found

  const updated = await prisma.booking.update({
    where: { id: bookingId },
    data: { status },
    include: { customer: true, service: true },
  });
  return { ...updated, customer: redactCustomer(updated.customer, canViewCustomer) };
};

export const cancelBookingByToken = async (token: string) => {
  const booking = await prisma.booking.findUnique({
    where: { cancelToken: token },
    include: { customer: true, service: true, shop: true },
  });

  if (!booking) throw new AppError(404, 'Booking not found');
  if (booking.status === BookingStatus.CANCELED) throw new AppError(409, 'Booking is already cancelled');

  return prisma.booking.update({
    where: { id: booking.id },
    data: { status: BookingStatus.CANCELED },
    include: { customer: true, service: true, shop: true },
  });
};
