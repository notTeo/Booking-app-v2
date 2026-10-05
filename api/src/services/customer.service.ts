import { AppError } from '../middleware/errorHandler';
import { prisma } from '../utils/prisma';
import { BookingStatus } from '../../dist/generated/prisma';
import { redactCustomer } from '../utils/customerVisibility';
import { logger } from '../utils/logger';
import {
  MANAGER_ONLY,
  canViewCustomerDetails,
  requireShopAccess,
} from '../utils/shopAccess';
import { NOTES_MAX_LENGTH } from '../validators/common';

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

// Two records for the same person (usually the same phone typed two ways):
// the source's bookings move to the target and the source is removed. The
// target keeps its own name and phone; an empty email is filled from the
// source and the notes of both are kept.
export const mergeCustomers = async (
  userId: string,
  shopId: string,
  targetId: string,
  sourceId: string,
) => {
  await requireShopAccess(userId, shopId, MANAGER_ONLY);
  if (targetId === sourceId)
    throw new AppError(400, 'A customer cannot be merged with itself');

  const { merged, moved } = await prisma.$transaction(async (tx) => {
    const [target, source] = await Promise.all([
      tx.customer.findUnique({ where: { id: targetId } }),
      tx.customer.findUnique({ where: { id: sourceId } }),
    ]);
    if (
      !target ||
      !source ||
      target.shopId !== shopId ||
      source.shopId !== shopId
    )
      throw new AppError(404, 'Customer not found');

    // Bookings first: deleting the source would cascade to any still on it.
    const { count } = await tx.booking.updateMany({
      where: { customerId: sourceId, shopId },
      data: { customerId: targetId },
    });
    await tx.customer.delete({ where: { id: sourceId } });

    const notes =
      [target.notes, source.notes]
        .filter(Boolean)
        .join('\n')
        .slice(0, NOTES_MAX_LENGTH) || null;
    const updated = await tx.customer.update({
      where: { id: targetId },
      data: { email: target.email ?? source.email, notes },
    });
    return { merged: updated, moved: count };
  });

  logger.info(
    `Customer merged: ${sourceId} into ${targetId} shop ${shopId} by ${userId} (${moved} bookings)`,
  );
  return { ...merged, movedBookings: moved };
};

// GDPR access/erasure requests are handled by the shop (the data controller),
// so only the owner may run them — not managers, and not staff even with
// canViewCustomerDetails.
const OWNER_ONLY = {
  role: 'owner',
  forbiddenMessage: 'Only the shop owner can do this',
} as const;

// Everything we hold about one customer, for a data-access request.
export const exportCustomer = async (
  userId: string,
  shopId: string,
  customerId: string,
) => {
  await requireShopAccess(userId, shopId, OWNER_ONLY);
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
  await requireShopAccess(userId, shopId, OWNER_ONLY);
  await requireCustomerInShop(customerId, shopId);

  const { count } = await prisma.booking.deleteMany({
    where: { customerId, shopId },
  });
  await prisma.customer.delete({ where: { id: customerId } });

  logger.info(
    `Customer deleted: ${customerId} shop ${shopId} by ${userId} (${count} bookings)`,
  );
};
