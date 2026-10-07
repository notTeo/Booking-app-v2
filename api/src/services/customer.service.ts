import { bookingServicesPrice } from '../utils/bookingServices';
import { AppError } from '../middleware/errorHandler';
import { prisma } from '../utils/prisma';
import { BookingStatus, Prisma } from '../../dist/generated/prisma';
import { redactCustomer } from '../utils/customerVisibility';
import { logger } from '../utils/logger';
import {
  MANAGER_ONLY,
  canManage,
  canViewCustomerDetails,
  requireShopAccess,
} from '../utils/shopAccess';
import { PhotoCrop, storePhoto } from './photo.service';
import { removeStoredFiles, shopPrefix } from './storage.service';
import {
  NAME_MAX_LENGTH,
  NOTES_MAX_LENGTH,
  isPlausiblePhone,
  normalizePhone,
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
  // Only customers whose own changes wait for approval (owner and managers).
  pendingChanges = false,
) => {
  const membership = await requireShopAccess(userId, shopId);
  // Change requests are the owner's and managers' to see and decide.
  const seesRequests = canManage(membership.role);
  const pendingChangesCount = seesRequests
    ? await prisma.customerChangeRequest.count({ where: { shopId } })
    : 0;

  // Search matches on name and phone. For a member who may not see those,
  // a hit would confirm the term character by character, so it finds nothing.
  if (search && !canViewCustomerDetails(membership))
    return { items: [], total: 0, page, limit, pendingChangesCount };
  if (pendingChanges && !seesRequests)
    return { items: [], total: 0, page, limit, pendingChangesCount };

  const where = {
    shopId,
    isSystem: false,
    ...(hasCustomDurations && { serviceDurations: { some: {} } }),
    ...(pendingChanges && { changeRequest: { isNot: null } }),
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' as const } },
        { phone: { contains: search } },
        // Phones are stored without separators; "694 123" still finds it.
        ...(/\d/.test(search) && /^[\d\s().+-]+$/.test(search)
          ? [{ phone: { contains: normalizePhone(search) } }]
          : []),
      ],
    }),
  };

  const [items, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        _count: { select: { serviceDurations: true } },
        changeRequest: { select: { id: true } },
      },
    }),
    prisma.customer.count({ where }),
  ]);

  return {
    items: items.map(({ _count, changeRequest, ...c }) =>
      redactCustomer(
        {
          ...c,
          hasCustomDurations: _count.serviceDurations > 0,
          hasPendingChanges: seesRequests && changeRequest !== null,
        },
        canViewCustomerDetails(membership),
      ),
    ),
    total,
    page,
    limit,
    pendingChangesCount,
  };
};

export const getCustomer = async (
  userId: string,
  shopId: string,
  customerId: string,
) => {
  const membership = await requireShopAccess(userId, shopId);
  await requireCustomerInShop(customerId, shopId);

  const [customer, allBookings, serviceDurations, changeRequest] =
    await Promise.all([
      // The bookings themselves are served a page at a time by
      // listCustomerBookings; a full Booking row must not go out here (it
      // carries the customer's private cancel-link token).
      prisma.customer.findUnique({ where: { id: customerId } }),
      prisma.booking.findMany({
        where: { customerId, shopId },
        select: {
          status: true,
          service: { select: { name: true, price: true } },
          services: { select: { name: true, duration: true, price: true } },
        },
      }),
      prisma.customerServiceDuration.findMany({
        where: { customerId },
        select: { serviceId: true, duration: true },
      }),
      // What the customer asked to change themselves, for whoever may decide.
      canManage(membership.role)
        ? prisma.customerChangeRequest.findUnique({
            where: { customerId },
            select: CHANGE_REQUEST_SELECT,
          })
        : null,
    ]);

  const completed = allBookings.filter(
    (b) => b.status === BookingStatus.COMPLETED,
  );
  const totalVisits = completed.length;
  // What the services of each completed booking cost together.
  const totalSpent = completed.reduce(
    (sum, b) => sum + bookingServicesPrice(b),
    0,
  );

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
    changeRequest,
  };
};

const CHANGE_REQUEST_SELECT = {
  name: true,
  phone: true,
  email: true,
  photoUrl: true,
  createdAt: true,
} as const;

// The customer's own changes from the public sign-up page are applied: the
// fields they filled in replace the customer's, the rest stay.
export const acceptCustomerChanges = async (
  userId: string,
  shopId: string,
  customerId: string,
) => {
  await requireShopAccess(userId, shopId, MANAGER_ONLY);
  const customer = await requireCustomerInShop(customerId, shopId);
  const request = await prisma.customerChangeRequest.findUnique({
    where: { customerId },
  });
  if (!request) throw new AppError(404, 'No changes are waiting');

  try {
    await prisma.$transaction([
      prisma.customer.update({
        where: { id: customerId },
        data: {
          ...(request.name && { name: request.name }),
          ...(request.phone && { phone: request.phone }),
          ...(request.email && { email: request.email }),
          ...(request.photoUrl && {
            photoUrl: request.photoUrl,
            photoOriginalUrl: request.photoOriginalUrl,
            photoCrop: request.photoCrop ?? Prisma.DbNull,
          }),
        },
      }),
      prisma.customerChangeRequest.delete({ where: { id: request.id } }),
    ]);
  } catch (err) {
    // The new phone number is another customer's: those two are one person,
    // which is what merging is for.
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === 'P2002' &&
      request.phone
    ) {
      const other = await prisma.customer.findUnique({
        where: { shopId_phone: { shopId, phone: request.phone } },
        select: { id: true },
      });
      throw new AppError(
        409,
        'Another customer already has this phone number',
        'CUSTOMER_EXISTS',
        undefined,
        { customerId: other?.id },
      );
    }
    throw err;
  }
  // The photo it replaced is no longer shown anywhere.
  if (request.photoUrl)
    await removeStoredFiles([customer.photoUrl, customer.photoOriginalUrl]);

  logger.info(
    `Customer changes accepted: ${customerId} shop ${shopId} by ${userId}`,
  );
  return getCustomer(userId, shopId, customerId);
};

export const rejectCustomerChanges = async (
  userId: string,
  shopId: string,
  customerId: string,
) => {
  await requireShopAccess(userId, shopId, MANAGER_ONLY);
  await requireCustomerInShop(customerId, shopId);
  const request = await prisma.customerChangeRequest.findUnique({
    where: { customerId },
  });
  if (request) {
    await prisma.customerChangeRequest.delete({ where: { id: request.id } });
    await removeStoredFiles([request.photoUrl, request.photoOriginalUrl]);
    logger.info(
      `Customer changes rejected: ${customerId} shop ${shopId} by ${userId}`,
    );
  }
  return getCustomer(userId, shopId, customerId);
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
        services: {
          select: { name: true, duration: true, price: true, position: true },
          orderBy: { position: 'asc' },
        },
        staff: { select: { name: true } },
      },
    }),
    prisma.booking.count({ where }),
  ]);
  return { items, total, page, limit };
};

// A customer added by hand, without a booking. Open to every member who may
// see customer details (they can already create one by booking for them).
export const createCustomer = async (
  userId: string,
  shopId: string,
  data: {
    name: string;
    phone: string;
    email?: string | null;
    notes?: string | null;
  },
) => {
  const membership = await requireShopAccess(userId, shopId);
  if (!canViewCustomerDetails(membership))
    throw new AppError(403, 'You do not have permission to add customers');

  const fields = {
    shopId,
    name: data.name,
    phone: data.phone,
    email: data.email || null,
    notes: data.notes || null,
  };
  const existing = await prisma.customer.findUnique({
    where: { shopId_phone: { shopId, phone: data.phone } },
    select: { id: true },
  });
  const taken = (customerId: string) =>
    new AppError(
      409,
      'A customer with this phone number already exists',
      'CUSTOMER_EXISTS',
      undefined,
      { customerId },
    );
  if (existing) throw taken(existing.id);

  try {
    const customer = await prisma.customer.create({ data: fields });
    logger.info(`Customer created: ${customer.id} shop ${shopId} by ${userId}`);
    return redactCustomer(customer, true);
  } catch (err) {
    // The same phone was added in the meantime (a booking, another member).
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === 'P2002'
    ) {
      const other = await prisma.customer.findUnique({
        where: { shopId_phone: { shopId, phone: data.phone } },
        select: { id: true },
      });
      if (other) throw taken(other.id);
    }
    throw err;
  }
};

// The customer's photo is the owner's and managers' to set or take down;
// customers add their own from the public pages (customerProfile.service.ts).
export const setCustomerPhoto = async (
  userId: string,
  shopId: string,
  customerId: string,
  file: Buffer | undefined,
  crop: PhotoCrop,
) => {
  await requireShopAccess(userId, shopId, MANAGER_ONLY);
  const current = await requireCustomerInShop(customerId, shopId);
  const { data, stale } = await storePhoto({
    prefix: shopPrefix(shopId),
    shape: 'square',
    label: 'customer',
    file,
    crop,
    current,
  });
  const customer = await prisma.customer.update({
    where: { id: customerId },
    data: { ...data, photoCrop: { ...data.photoCrop } },
  });
  await removeStoredFiles(stale);
  return redactCustomer(customer, true);
};

export const removeCustomerPhoto = async (
  userId: string,
  shopId: string,
  customerId: string,
) => {
  await requireShopAccess(userId, shopId, MANAGER_ONLY);
  const current = await requireCustomerInShop(customerId, shopId);
  const customer = await prisma.customer.update({
    where: { id: customerId },
    data: { photoUrl: null, photoOriginalUrl: null, photoCrop: Prisma.DbNull },
  });
  await removeStoredFiles([current.photoUrl, current.photoOriginalUrl]);
  logger.info(
    `Customer photo removed: ${customerId} shop ${shopId} by ${userId}`,
  );
  return redactCustomer(customer, true);
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
// target keeps its own name and phone; an empty email or a missing photo is
// filled from the source and the notes of both are kept.
export const mergeCustomers = async (
  userId: string,
  shopId: string,
  targetId: string,
  sourceId: string,
) => {
  await requireShopAccess(userId, shopId, MANAGER_ONLY);
  if (targetId === sourceId)
    throw new AppError(400, 'A customer cannot be merged with itself');

  const { merged, moved, stale } = await prisma.$transaction(async (tx) => {
    const [target, source] = await Promise.all([
      tx.customer.findUnique({ where: { id: targetId } }),
      tx.customer.findUnique({
        where: { id: sourceId },
        include: { changeRequest: true },
      }),
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
    // The source's photo moves to a target without one; otherwise its files
    // go with it.
    const takePhoto = !target.photoUrl && !!source.photoUrl;
    const updated = await tx.customer.update({
      where: { id: targetId },
      data: {
        email: target.email ?? source.email,
        notes,
        ...(takePhoto && {
          photoUrl: source.photoUrl,
          photoOriginalUrl: source.photoOriginalUrl,
          photoCrop: source.photoCrop ?? Prisma.DbNull,
        }),
      },
    });
    return {
      merged: updated,
      moved: count,
      // Changes the source asked for go with it.
      stale: [
        ...(takePhoto ? [] : [source.photoUrl, source.photoOriginalUrl]),
        source.changeRequest?.photoUrl,
        source.changeRequest?.photoOriginalUrl,
      ],
    };
  });
  await removeStoredFiles(stale);

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
    const phone = text(r.phone);
    return {
      name: text(r.name),
      // Stored in one form, like every other way a customer is created; an
      // invalid value is left alone for the row's own check to report.
      phone: isPlausiblePhone(phone) ? normalizePhone(phone) : phone,
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
    omit: { cancelToken: true },
    include: {
      service: { select: { name: true } },
      staff: { select: { name: true } },
    },
  });
  const serviceDurations = await prisma.customerServiceDuration.findMany({
    where: { customerId },
    select: { duration: true, service: { select: { name: true } } },
  });

  const changeRequest = await prisma.customerChangeRequest.findUnique({
    where: { customerId },
    select: CHANGE_REQUEST_SELECT,
  });

  logger.info(`Customer exported: ${customerId} shop ${shopId} by ${userId}`);
  return {
    exportedAt: new Date().toISOString(),
    // Changes they asked for that the shop has not decided on yet.
    requestedChanges: changeRequest,
    customer: {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      notes: customer.notes,
      photoUrl: customer.photoUrl,
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
      contactEmail: b.contactEmail,
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
  const customer = await requireCustomerInShop(customerId, shopId);
  const request = await prisma.customerChangeRequest.findUnique({
    where: { customerId },
  });

  const { count } = await prisma.booking.deleteMany({
    where: { customerId, shopId },
  });
  await prisma.customer.delete({ where: { id: customerId } });
  await removeStoredFiles([
    customer.photoUrl,
    customer.photoOriginalUrl,
    request?.photoUrl,
    request?.photoOriginalUrl,
  ]);

  logger.info(
    `Customer deleted: ${customerId} shop ${shopId} by ${userId} (${count} bookings)`,
  );
};
