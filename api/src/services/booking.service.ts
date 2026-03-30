import { randomUUID } from 'crypto';
import { BookingStatus } from '../../dist/generated/prisma';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';

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
          include: { customer: true, service: true, shop: true, staff: { include: { user: true } } },
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

// ── Slots (stub — implement yourself) ───────────────────────────────────────

export const getAvailableSlots = async (
  _shopId: string,
  _date: string,
  _staffId: string,
  _serviceId: string,
): Promise<string[]> => {
  throw new AppError(501, 'Not implemented');
};

// ── Owner / Staff ────────────────────────────────────────────────────────────

export const listBookings = async (
  shopId: string,
  filters: { date?: string; status?: BookingStatus; staffId?: string },
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

  return prisma.booking.findMany({
    where,
    include: { customer: true, service: true },
    orderBy: { startTime: 'asc' },
  });
};

export const getBooking = async (shopId: string, bookingId: string) => {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { customer: true, service: true },
  });

  if (!booking || booking.shopId !== shopId) throw new AppError(404, 'Booking not found');

  return booking;
};

export const updateBooking = async (
  shopId: string,
  bookingId: string,
  data: { date?: string; serviceId?: string; staffId?: string; notes?: string },
) => {
  await getBooking(shopId, bookingId); // throws 404 if not found

  return prisma.booking.update({
    where: { id: bookingId },
    data: {
      ...(data.date && { date: new Date(data.date) }),
      ...(data.serviceId && { serviceId: data.serviceId }),
      ...(data.staffId && { staffId: data.staffId }),
      ...(data.notes !== undefined && { notes: data.notes }),
    },
    include: { customer: true, service: true },
  });
};

export const deleteBooking = async (shopId: string, bookingId: string) => {
  await getBooking(shopId, bookingId); // throws 404 if not found
  await prisma.booking.delete({ where: { id: bookingId } });
};

export const updateBookingStatus = async (
  shopId: string,
  bookingId: string,
  status: BookingStatus,
) => {
  await getBooking(shopId, bookingId); // throws 404 if not found

  return prisma.booking.update({
    where: { id: bookingId },
    data: { status },
    include: { customer: true, service: true },
  });
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
