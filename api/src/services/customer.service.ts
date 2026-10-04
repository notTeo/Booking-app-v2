import { AppError } from '../middleware/errorHandler';
import { prisma } from '../utils/prisma';
import { BookingStatus } from '../../dist/generated/prisma';
import { redactCustomer } from '../utils/customerVisibility';
import { logger } from '../utils/logger';
import { canViewCustomerDetails, requireShopAccess } from '../utils/shopAccess';

async function requireCustomerInShop(customerId: string, shopId: string) {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
  });
  if (!customer || customer.shopId !== shopId)
    throw new AppError(404, 'Customer not found');
  return customer;
}

export const listCustomers = async (
  userId: string,
  shopId: string,
  search?: string,
  page = 1,
  limit = 20,
) => {
  const membership = await requireShopAccess(userId, shopId);

  // Search matches on name and phone. For a member who may not see those,
  // a hit would confirm the term character by character, so it finds nothing.
  if (search && !canViewCustomerDetails(membership))
    return { items: [], total: 0, page, limit };

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
    items: items.map((c) =>
      redactCustomer(c, canViewCustomerDetails(membership)),
    ),
    total,
    page,
    limit,
  };
};

export const getCustomer = async (
  userId: string,
  shopId: string,
  customerId: string,
) => {
  const membership = await requireShopAccess(userId, shopId);
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

  const completed = allBookings.filter(
    (b) => b.status === BookingStatus.COMPLETED,
  );
  const totalVisits = completed.length;
  const totalSpent = completed.reduce((sum, b) => sum + b.service.price, 0);

  if (!customer) return customer;
  return {
    ...redactCustomer(customer, canViewCustomerDetails(membership)),
    totalVisits,
    totalSpent,
  };
};

export const updateCustomer = async (
  userId: string,
  shopId: string,
  customerId: string,
  data: {
    name?: string;
    phone?: string;
    email?: string | null;
    notes?: string | null;
  },
) => {
  const membership = await requireShopAccess(userId, shopId);
  await requireCustomerInShop(customerId, shopId);

  if (
    !canViewCustomerDetails(membership) &&
    (data.name !== undefined ||
      data.phone !== undefined ||
      data.email !== undefined)
  ) {
    throw new AppError(
      403,
      'You do not have permission to edit customer contact details',
    );
  }

  const updated = await prisma.customer.update({
    where: { id: customerId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.phone !== undefined && { phone: data.phone }),
      ...(data.email !== undefined && { email: data.email }),
      ...(data.notes !== undefined && { notes: data.notes }),
    },
  });
  return redactCustomer(updated, canViewCustomerDetails(membership));
};

// GDPR access/erasure requests are handled by the shop (the data controller),
// so only the owner or a manager may run them — not staff, even with
// canViewCustomerDetails.
const MANAGER_ONLY = {
  role: 'manager',
  forbiddenMessage: 'Only the shop owner or a manager can do this',
} as const;

// Everything we hold about one customer, for a data-access request.
export const exportCustomer = async (
  userId: string,
  shopId: string,
  customerId: string,
) => {
  await requireShopAccess(userId, shopId, MANAGER_ONLY);
  const customer = await requireCustomerInShop(customerId, shopId);

  const bookings = await prisma.booking.findMany({
    where: { customerId, shopId },
    orderBy: { startTime: 'asc' },
    include: {
      service: { select: { name: true } },
      staff: { select: { name: true } },
    },
  });

  logger.info(`Customer exported: ${customerId} shop ${shopId} by ${userId}`);
  return {
    exportedAt: new Date().toISOString(),
    customer: {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      notes: customer.notes,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
    },
    bookings: bookings.map((b) => ({
      id: b.id,
      startTime: b.startTime,
      endTime: b.endTime,
      status: b.status,
      notes: b.notes,
      service: b.service.name,
      staff: b.staff.name,
      createdAt: b.createdAt,
    })),
  };
};

// Erasure: hard delete. Bookings go with the customer (onDelete: Cascade), so
// the freed slots reopen — that's inherent to erasing the person.
export const deleteCustomer = async (
  userId: string,
  shopId: string,
  customerId: string,
) => {
  await requireShopAccess(userId, shopId, MANAGER_ONLY);
  await requireCustomerInShop(customerId, shopId);

  const { count } = await prisma.booking.deleteMany({
    where: { customerId, shopId },
  });
  await prisma.customer.delete({ where: { id: customerId } });

  logger.info(
    `Customer deleted: ${customerId} shop ${shopId} by ${userId} (${count} bookings)`,
  );
};
