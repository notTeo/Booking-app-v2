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
    staffId: string;
    date: string;
    notes?: string;
  },
) => {
  const shop = await prisma.shop.findUnique({ where: { slug } });
  if (!shop) throw new AppError(404, 'Shop not found');

  const customer = await prisma.customer.upsert({
    where: { shopId_phone: { shopId: shop.id, phone: data.phone } },
    update: { name: data.name, email: data.email ?? undefined },
    create: { shopId: shop.id, name: data.name, phone: data.phone, email: data.email },
  });

  const booking = await prisma.booking.create({
    data: {
      shopId: shop.id,
      customerId: customer.id,
      serviceId: data.serviceId,
      staffId: data.staffId,
      date: new Date(data.date),
      notes: data.notes,
    },
    include: { customer: true, service: true },
  });

  return booking;
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
    where['date'] = { gte: start, lte: end };
  }

  if (filters.status) where['status'] = filters.status;
  if (filters.staffId) where['staffId'] = filters.staffId;

  return prisma.booking.findMany({
    where,
    include: { customer: true, service: true },
    orderBy: { date: 'asc' },
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
