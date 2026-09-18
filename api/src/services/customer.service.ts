import { AppError } from '../middleware/errorHandler';
import { prisma } from '../utils/prisma';
import { BookingStatus } from '../../dist/generated/prisma';
import { redactCustomer } from '../utils/customerVisibility';

async function requireMembership(userId: string, shopId: string) {
  const membership = await prisma.userShop.findUnique({
    where: { userId_shopId: { userId, shopId } },
  });
  if (!membership) throw new AppError(404, 'Shop not found');
  return membership;
}

async function requireCustomerInShop(customerId: string, shopId: string) {
  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer || customer.shopId !== shopId) throw new AppError(404, 'Customer not found');
  return customer;
}

const canView = (membership: { role: string; canViewCustomerDetails: boolean }) =>
  membership.role === 'owner' || membership.canViewCustomerDetails;

export const listCustomers = async (
  userId: string,
  shopId: string,
  search?: string,
  page = 1,
  limit = 20,
) => {
  const membership = await requireMembership(userId, shopId);

  const where = {
    shopId,
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' as const } },
        { phone: { contains: search } },
      ],
    }),
  };

  const [items, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.customer.count({ where }),
  ]);

  return {
    items: items.map((c) => redactCustomer(c, canView(membership))),
    total,
    page,
    limit,
  };
};

export const getCustomer = async (userId: string, shopId: string, customerId: string) => {
  const membership = await requireMembership(userId, shopId);
  await requireCustomerInShop(customerId, shopId);

  const [customer, allBookings] = await Promise.all([
    prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        bookings: {
          include: { service: true },
          orderBy: { startTime: 'desc' },
          take: 5,
        },
      },
    }),
    prisma.booking.findMany({
      where: { customerId, shopId },
      select: { status: true, service: { select: { price: true } } },
    }),
  ]);

  const completed = allBookings.filter((b) => b.status === BookingStatus.COMPLETED);
  const totalVisits = completed.length;
  const totalSpent = completed.reduce((sum, b) => sum + b.service.price, 0);

  if (!customer) return customer;
  return { ...redactCustomer(customer, canView(membership)), totalVisits, totalSpent };
};

export const updateCustomer = async (
  userId: string,
  shopId: string,
  customerId: string,
  data: { name?: string; phone?: string; email?: string | null; notes?: string | null },
) => {
  const membership = await requireMembership(userId, shopId);
  await requireCustomerInShop(customerId, shopId);

  if (!canView(membership) && (data.name !== undefined || data.phone !== undefined || data.email !== undefined)) {
    throw new AppError(403, 'You do not have permission to edit customer contact details');
  }

  return prisma.customer.update({
    where: { id: customerId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.phone !== undefined && { phone: data.phone }),
      ...(data.email !== undefined && { email: data.email }),
      ...(data.notes !== undefined && { notes: data.notes }),
    },
  });
};
