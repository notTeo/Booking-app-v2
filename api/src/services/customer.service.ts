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
import {
  NAME_MAX_LENGTH,
  NOTES_MAX_LENGTH,
  isPlausiblePhone,
} from '../validators/common';

async function requireCustomerInShop(customerId: string, shopId: string) {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
  });
  // The "Blocked" placeholder is not a customer anyone can open or change.
  if (!customer || customer.shopId !== shopId || customer.isSystem)
    throw new AppError(404, 'Customer not found');
  return customer;
}

export const listCustomers = async (
  userId: string,
  shopId: string,
  search?: string,
  page = 1,
  limit = 20,
  // Only customers with a custom duration for at least one service.
  hasCustomDurations = false,
) => {
  const membership = await requireShopAccess(userId, shopId);

  // Search matches on name and phone. For a member who may not see those,
  // a hit would confirm the term character by character, so it finds nothing.
  if (search && !canViewCustomerDetails(membership))
    return { items: [], total: 0, page, limit };

  const where = {
    shopId,
    isSystem: false,
    ...(hasCustomDurations && { serviceDurations: { some: {} } }),
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
      include: { _count: { select: { serviceDurations: true } } },
    }),
    prisma.customer.count({ where }),
  ]);

  return {
    items: items.map(({ _count, ...c }) =>
      redactCustomer(
        { ...c, hasCustomDurations: _count.serviceDurations > 0 },
        canViewCustomerDetails(membership),
      ),
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

  const [customer, allBookings, serviceDurations] = await Promise.all([
    // The bookings themselves are served a page at a time by
    // listCustomerBookings; a full Booking row must not go out here (it
    // carries the customer's private cancel-link token).
    prisma.customer.findUnique({ where: { id: customerId } }),
    prisma.booking.findMany({
      where: { customerId, shopId },
      select: { status: true, service: { select: { price: true } } },
    }),
    prisma.customerServiceDuration.findMany({
      where: { customerId },
      select: { serviceId: true, duration: true },
    }),
  ]);

  const completed = allBookings.filter(
    (b) => b.status === BookingStatus.COMPLETED,
  );
  const totalVisits = completed.length;
  const totalSpent = completed.reduce((sum, b) => sum + b.service.price, 0);

  // Lifetime counts by status, in the shape of the shop overview's totals
  // (`all` leaves canceled bookings out), so the same stat tiles can show them.
  const count = (status: BookingStatus) =>
    allBookings.filter((b) => b.status === status).length;
  const canceled = count(BookingStatus.CANCELED);
  const totals = {
    all: allBookings.length - canceled,
    pending: count(BookingStatus.PENDING),
    confirmed: count(BookingStatus.CONFIRMED),
    completed: totalVisits,
    canceled,
    noShow: count(BookingStatus.NO_SHOW),
  };

  if (!customer) return customer;
  return {
    ...redactCustomer(customer, canViewCustomerDetails(membership)),
    totalVisits,
    totalSpent,
    totals,
    serviceDurations,
  };
};

// Replace the customer's custom service durations with `items` (a service
// left out goes back to its standard duration). Applies to bookings made from
// now on; existing bookings keep their times.
export const setCustomerServiceDurations = async (
  userId: string,
  shopId: string,
  customerId: string,
  items: { serviceId: string; duration: number }[],
) => {
  await requireShopAccess(userId, shopId);
  await requireCustomerInShop(customerId, shopId);

  const serviceIds = items.map((i) => i.serviceId);
  if (new Set(serviceIds).size !== serviceIds.length)
    throw new AppError(400, 'A service can only be listed once');
  const known = await prisma.service.count({
    where: { shopId, id: { in: serviceIds } },
  });
  if (known !== serviceIds.length) throw new AppError(404, 'Service not found');

  await prisma.$transaction([
    prisma.customerServiceDuration.deleteMany({ where: { customerId } }),
    prisma.customerServiceDuration.createMany({
      data: items.map((i) => ({ customerId, ...i })),
    }),
  ]);
  return items.map(({ serviceId, duration }) => ({ serviceId, duration }));
};

// The customer's whole booking history, newest first, a page at a time.
export const listCustomerBookings = async (
  userId: string,
  shopId: string,
  customerId: string,
  page = 1,
  limit = 10,
) => {
  await requireShopAccess(userId, shopId);
  await requireCustomerInShop(customerId, shopId);

  const where = { customerId, shopId };
  const [items, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      orderBy: { startTime: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        startTime: true,
        endTime: true,
        status: true,
        service: { select: { name: true, duration: true, price: true } },
        staff: { select: { name: true } },
      },
    }),
    prisma.booking.count({ where }),
  ]);
  return { items, total, page, limit };
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
      source.shopId !== shopId ||
      target.isSystem ||
      source.isSystem
    )
      throw new AppError(404, 'Customer not found');

    // Bookings first: deleting the source would cascade to any still on it.
    const { count } = await tx.booking.updateMany({
      where: { customerId: sourceId, shopId },
      data: { customerId: targetId },
    });
    // Custom durations too; where both have one for a service, the target's
    // stays and the source's goes with the source.
    const kept = await tx.customerServiceDuration.findMany({
      where: { customerId: targetId },
      select: { serviceId: true },
    });
    await tx.customerServiceDuration.updateMany({
      where: {
        customerId: sourceId,
        serviceId: { notIn: kept.map((d) => d.serviceId) },
      },
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

// Every customer of the shop in one list, for the owner or a manager to
// download (the web app turns it into CSV, Excel or JSON).
export const exportAllCustomers = async (userId: string, shopId: string) => {
  await requireShopAccess(userId, shopId, MANAGER_ONLY);

  const customers = await prisma.customer.findMany({
    where: { shopId, isSystem: false },
    orderBy: { createdAt: 'asc' },
    include: { _count: { select: { bookings: true } } },
  });

  logger.info(
    `Customers exported: shop ${shopId} by ${userId} (${customers.length})`,
  );
  return customers.map((c) => ({
    name: c.name,
    phone: c.phone,
    email: c.email,
    notes: c.notes,
    createdAt: c.createdAt,
    bookings: c._count.bookings,
  }));
};

export const IMPORT_MAX_ROWS = 500;

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const text = (value: unknown) =>
  typeof value === 'string' ? value.trim() : '';

/** Why a row cannot be imported (a code the web app translates), or null when it is fine. */
const importRowProblem = (row: {
  name: string;
  phone: string;
  email: string;
  notes: string;
}) => {
  if (!row.name) return 'name_missing';
  if (row.name.length > NAME_MAX_LENGTH) return 'name_too_long';
  if (!isPlausiblePhone(row.phone)) return 'phone_invalid';
  if (row.email && (!EMAIL_SHAPE.test(row.email) || row.email.length > 254))
    return 'email_invalid';
  if (row.notes.length > NOTES_MAX_LENGTH) return 'notes_too_long';
  return null;
};

// Import a batch of customers. A phone the shop does not have yet becomes a
// new customer. For one it already has, the existing record wins: only an
// empty email or empty notes are filled in, nothing is overwritten. Rows
// that cannot be imported are reported by their position in the batch and
// do not stop the rest.
export const importCustomers = async (
  userId: string,
  shopId: string,
  rows: unknown[],
) => {
  await requireShopAccess(userId, shopId, MANAGER_ONLY);

  const parsed = rows.map((raw) => {
    const r = (raw ?? {}) as Record<string, unknown>;
    return {
      name: text(r.name),
      phone: text(r.phone),
      email: text(r.email),
      notes: text(r.notes),
    };
  });

  const existing = await prisma.customer.findMany({
    where: { shopId, phone: { in: parsed.map((r) => r.phone) } },
  });
  // Also holds the customers created below, so a phone repeated in the file
  // is treated like one the shop already has.
  const byPhone = new Map(existing.map((c) => [c.phone, c]));

  const result = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [] as { row: number; reason: string }[],
  };

  for (const [index, row] of parsed.entries()) {
    const problem = importRowProblem(row);
    if (problem) {
      result.errors.push({ row: index, reason: problem });
      continue;
    }

    const current = byPhone.get(row.phone);
    if (!current) {
      const created = await prisma.customer.create({
        data: {
          shopId,
          name: row.name,
          phone: row.phone,
          email: row.email || null,
          notes: row.notes || null,
        },
      });
      byPhone.set(row.phone, created);
      result.created++;
      continue;
    }

    const fill = {
      ...(!current.email && row.email && { email: row.email }),
      ...(!current.notes && row.notes && { notes: row.notes }),
    };
    if (Object.keys(fill).length === 0) {
      result.skipped++;
      continue;
    }
    byPhone.set(
      row.phone,
      await prisma.customer.update({ where: { id: current.id }, data: fill }),
    );
    result.updated++;
  }

  logger.info(
    `Customers imported: shop ${shopId} by ${userId} (${result.created} created, ${result.updated} updated, ${result.skipped} skipped, ${result.errors.length} errors)`,
  );
  return result;
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
  const serviceDurations = await prisma.customerServiceDuration.findMany({
    where: { customerId },
    select: { duration: true, service: { select: { name: true } } },
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
    serviceDurations: serviceDurations.map((d) => ({
      service: d.service.name,
      minutes: d.duration,
    })),
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
