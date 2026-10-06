import { currentLocale } from '../utils/locale';
import { randomUUID } from 'crypto';
import {
  BookingStatus,
  type Prisma,
  type UserShop,
} from '../../dist/generated/prisma';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { assertProductsFeature, isShopLocked } from './plan.service';
import { MAX_SERVICES_PER_BOOKING } from '../utils/bookingServices';
import { redactCustomer } from '../utils/customerVisibility';
import {
  canManage,
  canViewCustomerDetails,
  requireShopAccess,
} from '../utils/shopAccess';
import {
  DATE_ONLY_RE,
  addDays,
  dateInZone,
  dayBoundsUtc,
  todayInZone,
} from '../utils/shopTime';
import {
  buildOutsideHoursCandidates,
  buildSlotCandidates,
  DEFAULT_CLOSED_DAY_HOURS,
  type OutsideReason,
} from '../utils/slots';
import {
  assertBookingRules,
  findBookingViolations,
  isOverridable,
  loadDayHours,
  loadTeamRegularHours,
  type DayHours,
} from './bookingRules.service';
import { lockProvider, serializableTransaction } from '../utils/serializable';
import {
  resolveDuration,
  type DurationCustomer,
} from './customerDuration.service';

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

// ── Staff resolution ─────────────────────────────────────────────────────────

export type BookingContext = 'public' | 'internal';

const bookableFieldFor = (context: BookingContext) =>
  context === 'internal' ? 'bookableInternally' : 'bookableByCustomers';

// Looks up the explicitly requested staff member, enforcing that they're
// active and bookable in the given context.
const resolveBookableStaff = async (
  db: Prisma.TransactionClient,
  shopId: string,
  staffId: string,
  context: BookingContext,
): Promise<UserShop | null> =>
  db.userShop.findFirst({
    where: {
      id: staffId,
      shopId,
      active: true,
      [bookableFieldFor(context)]: true,
    },
  });

// Every active team member who can take this service in the given context —
// the pool "any staff" draws from.
const listEligibleStaff = (
  db: Prisma.TransactionClient | typeof prisma,
  shopId: string,
  // With several services, only members who do every one of them.
  serviceId: string | string[],
  context: BookingContext,
): Promise<UserShop[]> =>
  db.userShop.findMany({
    where: {
      shopId,
      active: true,
      [bookableFieldFor(context)]: true,
      AND: (Array.isArray(serviceId) ? serviceId : [serviceId]).map((id) => ({
        staffServices: { some: { serviceId: id } },
      })),
    },
    orderBy: { createdAt: 'asc' },
  });

const staffUnavailable = (requestedStaffId: string | null | undefined) =>
  new AppError(
    400,
    requestedStaffId
      ? 'Selected staff member is not available for booking'
      : 'No staff available for this service',
  );

/**
 * "Any staff": picks who gets a booking when the customer expressed no
 * preference. Only members who are free at that time and whose own working
 * hours allow it are candidates; among them the one with the fewest booked
 * minutes that day wins, a random one on a tie. When nobody is fully clean but some
 * members are free and the caller accepted the violations (owner/staff
 * override), those are candidates instead.
 *
 * If no candidate qualifies the first free member (else the first member) is
 * returned so the caller's own rule/overlap checks produce the proper error.
 */
const pickAnyStaff = async (
  tx: Prisma.TransactionClient,
  p: {
    shopId: string;
    serviceId: string | string[];
    context: BookingContext;
    timezone: string;
    maxAdvanceDays: number;
    slotIntervalMinutes: number;
    startTime: Date;
    endTime: Date;
    overrideRules?: readonly string[];
  },
): Promise<UserShop> => {
  const team = await listEligibleStaff(tx, p.shopId, p.serviceId, p.context);
  if (team.length === 0) throw staffUnavailable(null);

  const accepted = new Set(p.overrideRules ?? []);
  const clean: UserShop[] = [];
  const overridable: UserShop[] = [];
  const free: UserShop[] = [];
  const busy: UserShop[] = [];
  for (const member of team) {
    const conflict = await tx.booking.findFirst({
      where: overlapWhere(member.id, p.startTime, p.endTime),
      select: { id: true },
    });
    if (conflict) {
      busy.push(member);
      continue;
    }
    free.push(member);
    const violations = await findBookingViolations({
      db: tx,
      shopId: p.shopId,
      timezone: p.timezone,
      maxAdvanceDays: p.maxAdvanceDays,
      slotIntervalMinutes: p.slotIntervalMinutes,
      scheduleStaffId: member.id,
      startTime: p.startTime,
      endTime: p.endTime,
    });
    if (violations.length === 0) clean.push(member);
    else if (
      violations.every((v) => isOverridable(v.code) && accepted.has(v.code))
    )
      overridable.push(member);
  }

  const pool = clean.length > 0 ? clean : overridable;
  if (pool.length === 0) {
    // Nobody can take it. Prefer a member who would have, had they been free,
    // so the caller answers "that time is taken" and not "the shop is closed"
    // because a colleague happens to be off.
    for (const member of busy) {
      const violations = await findBookingViolations({
        db: tx,
        shopId: p.shopId,
        timezone: p.timezone,
        maxAdvanceDays: p.maxAdvanceDays,
        slotIntervalMinutes: p.slotIntervalMinutes,
        scheduleStaffId: member.id,
        startTime: p.startTime,
        endTime: p.endTime,
      });
      if (violations.length === 0) return member;
    }
    return free[0] ?? team[0];
  }
  if (pool.length === 1) return pool[0];

  const { start, end } = dayBoundsUtc(
    dateInZone(p.startTime, p.timezone),
    p.timezone,
  );
  // Load = minutes booked that day, so one long appointment weighs more than
  // several short ones.
  const dayBookings = await tx.booking.findMany({
    where: {
      shopId: p.shopId,
      staffId: { in: pool.map((m) => m.id) },
      status: { notIn: SLOT_FREEING_STATUSES },
      startTime: { gte: start, lt: end },
    },
    select: { staffId: true, startTime: true, endTime: true },
  });
  const load = new Map<string, number>();
  for (const b of dayBookings) {
    load.set(
      b.staffId,
      (load.get(b.staffId) ?? 0) +
        (b.endTime.getTime() - b.startTime.getTime()) / 60_000,
    );
  }
  const lightest = Math.min(...pool.map((m) => load.get(m.id) ?? 0));
  const leastLoaded = pool.filter((m) => (load.get(m.id) ?? 0) === lightest);
  return leastLoaded[Math.floor(Math.random() * leastLoaded.length)];
};

// Both ends of a reschedule, for the "rescheduled from/to" reference shown on
// the calendar. A booking with a rescheduledTo is the old, CANCELED one.
const RESCHEDULE_LINKS = {
  rescheduledFrom: { select: { id: true, startTime: true } },
  rescheduledTo: { select: { id: true, startTime: true } },
} as const;

// The products reserved with a booking, as the shop sees them: the copied name
// and price, and what is left of the product now (null once it is deleted).
const PRODUCT_LINES = {
  select: {
    id: true,
    productId: true,
    name: true,
    unitPrice: true,
    quantity: true,
    saleStatus: true,
    product: { select: { stock: true, photoUrl: true } },
  },
  // Lines get consecutive timestamps when they are created (see
  // resolveProductLines); the id only settles a tie.
  orderBy: [
    { createdAt: 'asc' },
    { id: 'asc' },
  ] as Prisma.BookingProductOrderByWithRelationInput[],
} as const;

// The services of a booking, in the order they are done.
const SERVICE_LINES = {
  select: {
    id: true,
    serviceId: true,
    name: true,
    duration: true,
    price: true,
    position: true,
  },
  orderBy: { position: 'asc' },
} as const;

// A booking's cancelToken is the customer's only credential on the public
// cancel and reschedule links, so a query whose rows go back to a shop member
// leaves it out. Only the rows that feed the customer's emails keep it.
export const NO_CANCEL_TOKEN = { cancelToken: true } as const;

const BOOKING_INCLUDE = {
  customer: true,
  service: true,
  shop: true,
  staff: { select: { id: true, name: true, email: true } },
  products: PRODUCT_LINES,
  services: SERVICE_LINES,
} as const;

/** The services asked for: serviceIds, or the one serviceId (the first is the booking's primary). */
const requestedServiceIds = (data: {
  serviceId?: string;
  serviceIds?: string[];
}) => {
  const ids = data.serviceIds?.length
    ? data.serviceIds
    : data.serviceId
      ? [data.serviceId]
      : [];
  if (ids.length === 0) throw new AppError(400, 'serviceId is required');
  if (ids.length > MAX_SERVICES_PER_BOOKING)
    throw new AppError(
      400,
      `A booking can have at most ${MAX_SERVICES_PER_BOOKING} services`,
    );
  if (new Set(ids).size !== ids.length)
    throw new AppError(400, 'A service can only be listed once');
  return ids;
};

/**
 * Loads the chosen services in order and works out each one's length for this
 * customer: a booking's length is those added up. The public page only
 * offers services shown there. Runs inside the booking's transaction.
 */
const resolveServices = async (
  tx: Prisma.TransactionClient,
  shopId: string,
  ids: string[],
  opts: { publicOnly: boolean; customer?: DurationCustomer | null },
) => {
  const found = await tx.service.findMany({
    where: {
      id: { in: ids },
      shopId,
      isActive: true,
      ...(opts.publicOnly && { showOnPublicPage: true }),
    },
  });
  if (found.length !== ids.length) throw new AppError(404, 'Service not found');
  const byId = new Map(found.map((s) => [s.id, s]));
  const lines = [];
  for (const [position, id] of ids.entries()) {
    const service = byId.get(id)!;
    const duration = await resolveDuration(tx, shopId, service, opts.customer);
    lines.push({
      service,
      duration,
      create: {
        service: { connect: { id } },
        name: service.name,
        duration,
        price: service.price,
        position,
      },
    });
  }
  return {
    primary: lines[0].service,
    lines: lines.map((l) => l.create),
    totalDuration: lines.reduce((sum, l) => sum + l.duration, 0),
  };
};

/** A member who does every one of these services (the explicit-provider check for several services). */
const assertDoesAll = async (
  tx: Prisma.TransactionClient,
  staffId: string,
  ids: string[],
  // Customers may only book a member for what that member does, even a single
  // service. The shop's own staff may put one service on anyone.
  context: BookingContext = 'internal',
) => {
  if (ids.length < 2 && context !== 'public') return;
  const count = await tx.staffService.count({
    where: { userShopId: staffId, serviceId: { in: ids } },
  });
  if (count !== ids.length)
    throw new AppError(
      400,
      'Selected staff member does not do all of these services',
    );
};

export const PRODUCT_OUT_OF_STOCK = 'PRODUCT_OUT_OF_STOCK';

export interface ProductLineInput {
  productId: string;
  quantity: number;
}

/**
 * Checks the products a booking reserves and returns the lines to store.
 * Stock is only checked, never changed (it moves when a line is marked sold).
 * A customer cannot reserve more than is left; the owner and managers can,
 * once they have accepted it with PRODUCT_OUT_OF_STOCK in `overrideRules`.
 * Runs inside the booking's transaction.
 */
const resolveProductLines = async (
  tx: Prisma.TransactionClient,
  shopId: string,
  lines: ProductLineInput[] | undefined,
  caller: { role: string; overrideRules?: readonly string[] } | null,
) => {
  if (!lines || lines.length === 0)
    return {
      create: [] as Prisma.BookingProductCreateWithoutBookingInput[],
      overridden: false,
    };
  await assertProductsFeature(shopId, tx);

  const ids = lines.map((l) => l.productId);
  if (new Set(ids).size !== ids.length)
    throw new AppError(400, 'A product can only be listed once');
  const products = await tx.product.findMany({
    where: { id: { in: ids }, shopId },
  });
  if (products.length !== ids.length)
    throw new AppError(404, 'Product not found', 'PRODUCT_NOT_FOUND');
  const byId = new Map(products.map((p) => [p.id, p]));

  const short = lines.filter((l) => l.quantity > byId.get(l.productId)!.stock);
  const canOverride = !!caller && canManage(caller.role);
  const accepted =
    canOverride && !!caller?.overrideRules?.includes(PRODUCT_OUT_OF_STOCK);
  if (short.length > 0 && !accepted) {
    const names = short.map((l) => byId.get(l.productId)!.name).join(', ');
    const message = `Not enough in stock: ${names}`;
    throw new AppError(422, message, PRODUCT_OUT_OF_STOCK, undefined, {
      violations: [
        { code: PRODUCT_OUT_OF_STOCK, message, overridable: canOverride },
      ],
      productIds: short.map((l) => l.productId),
    });
  }

  return {
    // Each line gets its own timestamp, one millisecond apart, so they keep
    // the order the products were chosen in.
    create: lines.map((l, i) => {
      const p = byId.get(l.productId)!;
      return {
        createdAt: new Date(Date.now() + i),
        product: { connect: { id: p.id } },
        name: p.name,
        unitPrice: p.price,
        quantity: l.quantity,
      };
    }),
    overridden: short.length > 0,
  };
};

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

// The placeholder a blocked slot is booked on: one per shop, created the
// first time a slot is blocked. Its empty phone can never match a real
// customer's (a booking's phone is validated), and the web app shows its name
// translated.
export const SYSTEM_CUSTOMER_PHONE = '';
const findOrCreateSystemCustomer = (
  tx: Prisma.TransactionClient,
  shopId: string,
) =>
  tx.customer.upsert({
    where: { shopId_phone: { shopId, phone: SYSTEM_CUSTOMER_PHONE } },
    update: {},
    create: {
      shopId,
      name: 'Blocked',
      phone: SYSTEM_CUSTOMER_PHONE,
      isSystem: true,
    },
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
    // null = a blocked slot, held by the shop's system customer.
    customer: { name: string; phone: string; email?: string } | null;
    // Public bookings must never overwrite an existing customer's name/email;
    // owner/staff bookings may (see findOrCreateCustomer).
    overwriteCustomer: boolean;
    notes?: string;
    cancelToken: string;
    // Owner/staff creation only: the rules accepted, and who created it.
    overriddenRules?: string[];
    createdById?: string;
    // The products reserved with it, already checked (resolveProductLines).
    products?: Prisma.BookingProductCreateWithoutBookingInput[];
    // Its services, in order (resolveServices); serviceId is the first.
    services?: Prisma.BookingServiceCreateWithoutBookingInput[];
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

  const customer = p.customer
    ? await findOrCreateCustomer(tx, p.shopId, p.customer, p.overwriteCustomer)
    : await findOrCreateSystemCustomer(tx, p.shopId);

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
      locale: currentLocale(),
      ...(p.products?.length && { products: { create: p.products } }),
      ...(p.services?.length && { services: { create: p.services } }),
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

// How often a no-preference booking re-picks its provider after losing one.
const ANY_STAFF_ATTEMPTS = 4;

export const createBooking = async (
  slug: string,
  data: {
    name: string;
    phone: string;
    email?: string;
    serviceId?: string;
    // Several services, done one after another (the first is the primary).
    serviceIds?: string[];
    staffId: string | null | undefined;
    startTime: string; // ISO string — rename from `date`
    notes?: string;
    products?: ProductLineInput[];
  },
) => {
  const startTime = new Date(data.startTime);
  const cancelToken = randomUUID(); // only persisted by the attempt that commits

  const attempt = () =>
    serializableTransaction(async (tx) => {
      const shop = await tx.shop.findFirst({ where: { slug, isActive: true } });
      if (!shop) throw new AppError(404, 'Shop not found');
      if (isShopLocked(shop))
        throw new AppError(
          403,
          'This shop is not taking online bookings right now.',
          'SHOP_LOCKED',
        );

      // One or more services, done one after another: the booking runs as long
      // as they take together. A returning customer (matched by phone) gets
      // their own duration for each.
      const serviceIds = requestedServiceIds(data);
      const chosen = await resolveServices(tx, shop.id, serviceIds, {
        publicOnly: true,
        customer: { phone: data.phone },
      });
      const endTime = new Date(
        startTime.getTime() + chosen.totalDuration * 60_000,
      );

      // The requested staff member, or — with no preference — whichever free
      // team member working then has the fewest bookings that day.
      const staff = data.staffId
        ? await resolveBookableStaff(tx, shop.id, data.staffId, 'public')
        : await pickAnyStaff(tx, {
            shopId: shop.id,
            serviceId: serviceIds,
            context: 'public',
            timezone: shop.timezone,
            maxAdvanceDays: shop.maxAdvanceDays,
            slotIntervalMinutes: shop.slotIntervalMinutes,
            startTime,
            endTime,
          });
      if (!staff) throw staffUnavailable(data.staffId);
      await assertDoesAll(tx, staff.id, serviceIds, 'public');

      // Strict on the public path — there is no override. The schedule checked is
      // the assigned team member's own, the same one the slots endpoint used.
      await assertBookingRules({
        db: tx,
        shopId: shop.id,
        timezone: shop.timezone,
        maxAdvanceDays: shop.maxAdvanceDays,
        slotIntervalMinutes: shop.slotIntervalMinutes,
        scheduleStaffId: staff.id,
        startTime,
        endTime,
      });

      // Nobody can reserve past the stock on the public path.
      const reserved = await resolveProductLines(
        tx,
        shop.id,
        data.products,
        null,
      );

      return claimSlotAndCreate(tx, {
        shopId: shop.id,
        serviceId: chosen.primary.id,
        services: chosen.lines,
        staffId: staff.id,
        startTime,
        endTime,
        customer: { name: data.name, phone: data.phone, email: data.email },
        overwriteCustomer: false,
        notes: data.notes,
        cancelToken,
        products: reserved.create,
      });
    });

  if (data.staffId) return attempt();
  // No preference: the provider is picked before their lock is taken, so two
  // parallel requests can pick the same one. The loser tries again, and the
  // pick then sees the winner's booking and moves to someone who is free.
  for (let n = 1; ; n++) {
    try {
      return await attempt();
    } catch (err) {
      const lostThePick = err instanceof AppError && err.code === 'SLOT_TAKEN';
      if (!lostThePick || n >= ANY_STAFF_ATTEMPTS) throw err;
    }
  }
};

// ── Owner / Staff booking creation ──────────────────────────────────────────

export const createBookingForShop = async (
  userId: string,
  shopId: string,
  data: {
    // Hold the time as a blocked slot instead of booking a customer; name,
    // phone and email are then ignored.
    block?: boolean;
    name: string;
    phone: string;
    email?: string;
    serviceId?: string;
    // Several services, done one after another (the first is the primary).
    serviceIds?: string[];
    staffId?: string | null;
    startTime: string;
    notes?: string;
    // Booking rules the caller explicitly accepts, by code (validated to the
    // overridable set). Never bypasses the overlap check.
    overrideRules?: string[];
    products?: ProductLineInput[];
  },
) => {
  const startTime = new Date(data.startTime);
  const cancelToken = randomUUID();

  return serializableTransaction(async (tx) => {
    // Verify caller is an active member of the shop
    const caller = await requireShopAccess(userId, shopId, { db: tx });
    const callerCanViewCustomer = canViewCustomerDetails(caller);

    // A blocked slot holds the first service's standard length; a booking runs
    // as long as all its services take, each for this customer.
    const serviceIds = data.block
      ? requestedServiceIds(data).slice(0, 1)
      : requestedServiceIds(data);
    const chosen = await resolveServices(tx, shopId, serviceIds, {
      publicOnly: false,
      customer: data.block ? null : { phone: data.phone },
    });
    const endTime = new Date(
      startTime.getTime() + chosen.totalDuration * 60_000,
    );

    const shop = await tx.shop.findUniqueOrThrow({
      where: { id: shopId },
      select: {
        timezone: true,
        maxAdvanceDays: true,
        slotIntervalMinutes: true,
      },
    });

    // The requested staff member, or — with no preference — whichever free
    // team member working then has the fewest bookings that day.
    const staff = data.staffId
      ? await resolveBookableStaff(tx, shopId, data.staffId, 'internal')
      : await pickAnyStaff(tx, {
          shopId,
          serviceId: serviceIds,
          context: 'internal',
          timezone: shop.timezone,
          maxAdvanceDays: shop.maxAdvanceDays,
          slotIntervalMinutes: shop.slotIntervalMinutes,
          startTime,
          endTime,
          overrideRules: data.overrideRules,
        });
    if (!staff) throw staffUnavailable(data.staffId);
    await assertDoesAll(tx, staff.id, serviceIds);

    // Same rules as the public path; a violation is only allowed if its code
    // is in overrideRules. The overlap check in claimSlotAndCreate is never
    // skipped.
    const overriddenRules = await assertBookingRules({
      db: tx,
      shopId,
      timezone: shop.timezone,
      maxAdvanceDays: shop.maxAdvanceDays,
      slotIntervalMinutes: shop.slotIntervalMinutes,
      scheduleStaffId: staff.id,
      startTime,
      endTime,
      overrideRules: data.overrideRules,
    });

    // A blocked slot has no customer, so nothing is reserved with it.
    const reserved = await resolveProductLines(
      tx,
      shopId,
      data.block ? undefined : data.products,
      { role: caller.role, overrideRules: data.overrideRules },
    );

    const booking = await claimSlotAndCreate(tx, {
      shopId,
      serviceId: chosen.primary.id,
      services: chosen.lines,
      staffId: staff.id,
      startTime,
      endTime,
      products: reserved.create,
      customer: data.block
        ? null
        : { name: data.name, phone: data.phone, email: data.email },
      // Owner/staff may correct a customer's details on the way (matches the
      // wizard's autofill UI); the public path never may (see
      // claimSlotAndCreate), and neither may a member who is not allowed to
      // see or edit customer details: their booking attaches to the existing
      // customer unchanged.
      overwriteCustomer: callerCanViewCustomer,
      notes: data.notes,
      cancelToken,
      overriddenRules: reserved.overridden
        ? [...overriddenRules, PRODUCT_OUT_OF_STOCK]
        : overriddenRules,
      createdById: userId,
    });
    // The full row, for the confirmation email. The controller redacts the
    // customer in the response using callerCanViewCustomer.
    return { ...booking, callerCanViewCustomer };
  });
};

// The shop's IANA timezone — every wall-clock <-> UTC conversion uses it.
const getShopTimezone = async (shopId: string) =>
  (await getShopTimeSettings(shopId)).timezone;

// Timezone plus the slot grid step, for callers that build slot grids.
const getShopTimeSettings = async (shopId: string) => {
  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    select: { timezone: true, slotIntervalMinutes: true, maxAdvanceDays: true },
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
  // An in-hours start that is not on the shop's own slot grid (only possible
  // when the caller asked for a finer intervalMinutes): booking it is a
  // 'custom time' exception.
  offGrid?: boolean;
}

export type SlotsResult =
  | { status: 'closed'; slots?: OwnerSlotInfo[] }
  | { status: 'ok'; slots: SlotInfo[] | OwnerSlotInfo[] };

// Picks, for one start time, the most useful view of it across team members:
// a free in-hours slot beats a free out-of-hours one, which beats a booked
// in-hours one, which beats the rest.
const slotRank = (s: OwnerSlotInfo) =>
  (s.available ? 2 : 0) + (s.outsideHours ? 0 : 1);

export const getAvailableSlots = async (
  shopId: string,
  date: string,
  staffId: string | null,
  serviceId: string,
  context: BookingContext = 'public',
  // Authenticated owner/staff view only: also list out-of-hours times. The
  // public route never passes this.
  options: {
    includeOutsideHours?: boolean;
    intervalMinutes?: number;
    // Rescheduling an existing booking: its own service stays usable even if
    // the service has since been deactivated (only new bookings are blocked).
    forBookingId?: string;
    // Who the booking is for, when known: their own duration for the service
    // decides which times fit. A rescheduled booking's customer is implied.
    customer?: DurationCustomer;
    // Several services done one after another: the times offered fit all of
    // them added up, and only members who do every one are considered.
    serviceIds?: string[];
  } = {},
): Promise<SlotsResult> => {
  const withOutside = options.includeOutsideHours === true;
  // `date` is a calendar date in the shop's timezone; its weekday does not
  // depend on any timezone.
  if (!DATE_ONLY_RE.test(date))
    throw new AppError(400, 'date must be YYYY-MM-DD');

  const closed = (): SlotsResult =>
    withOutside ? { status: 'closed', slots: [] } : { status: 'closed' };

  // Whose hours and bookings decide availability: the requested staff member
  // (validated: active + bookable in this context), or — with no preference —
  // every eligible team member. A member with no schedule of their own is not
  // working; there are no shop-wide hours to fall back on.
  // Moving a booking that has several services keeps all of them, and its length.
  const existingBooking = options.forBookingId
    ? await prisma.booking.findFirst({
        where: { id: options.forBookingId, shopId },
        select: {
          customerId: true,
          serviceId: true,
          services: { select: { serviceId: true, duration: true } },
        },
      })
    : null;
  const keepsServices =
    !options.serviceIds &&
    !!existingBooking &&
    existingBooking.services.length > 1 &&
    existingBooking.serviceId === serviceId;
  const serviceIds = keepsServices
    ? existingBooking.services.map((s) => s.serviceId)
    : options.serviceIds && options.serviceIds.length > 0
      ? options.serviceIds
      : [serviceId];
  if (
    serviceIds.length > MAX_SERVICES_PER_BOOKING ||
    new Set(serviceIds).size !== serviceIds.length
  )
    throw new AppError(400, 'Invalid list of services');

  const eligible = await listEligibleStaff(prisma, shopId, serviceIds, context);
  let team: UserShop[];
  if (staffId) {
    const member = await resolveBookableStaff(prisma, shopId, staffId, context);
    // On the public page a member is only offered for what they do.
    const offered =
      !!member &&
      (context !== 'public' || eligible.some((e) => e.id === member.id));
    team = offered ? [member] : [];
  } else {
    team = eligible;
  }
  if (team.length === 0) return closed();

  const services = await prisma.service.findMany({
    where: {
      id: { in: serviceIds },
      shopId,
      OR: [
        // Internal-only services are closed to the public page.
        {
          isActive: true,
          ...(context === 'public' && { showOnPublicPage: true }),
        },
        ...(options.forBookingId
          ? [
              { bookings: { some: { id: options.forBookingId, shopId } } },
              {
                bookingServices: {
                  some: { bookingId: options.forBookingId },
                },
              },
            ]
          : []),
      ],
    },
  });
  if (services.length !== serviceIds.length) return closed();

  const forBooking = !options.customer ? existingBooking : null;
  // The services' lengths added up, each for this customer (a kept booking
  // keeps the lengths it was made with).
  let duration = 0;
  for (const service of services) {
    duration += keepsServices
      ? existingBooking!.services.find((s) => s.serviceId === service.id)!
          .duration
      : await resolveDuration(
          prisma,
          shopId,
          service,
          options.customer ?? forBooking,
        );
  }

  const {
    timezone: zone,
    slotIntervalMinutes,
    maxAdvanceDays,
  } = await getShopTimeSettings(shopId);
  const { start: dayStart, end: dayEnd } = dayBoundsUtc(date, zone);
  // The caller may look at a finer (or coarser) grid than the shop's own, for
  // this one booking; times off the shop grid are flagged.
  const step = options.intervalMinutes ?? slotIntervalMinutes;
  const now = new Date();
  // A customer cannot book the past or beyond the advance window (the booking
  // rules refuse both), so the public grid does not offer those times either.
  const today = todayInZone(zone, now);
  const outsideWindow =
    context === 'public' &&
    (date < today || date > addDays(today, maxAdvanceDays));

  const memberHours = await Promise.all(
    team.map(async (m) => ({
      member: m,
      hours: await loadDayHours(prisma, shopId, m.id, date),
    })),
  );
  const anyHours = memberHours.some((m) => m.hours);
  if (!anyHours && !withOutside) return { status: 'closed' };

  // On a closed day (or a provider's day off) there is no opening to size the
  // out-of-hours grid from: use the team's regular hours for that weekday.
  const closedDayRanges: DayHours[] =
    withOutside && memberHours.some((m) => !m.hours)
      ? ((await loadTeamRegularHours(prisma, shopId, date, [
          ...new Set([...eligible, ...team].map((m) => m.id)),
        ])) ?? [DEFAULT_CLOSED_DAY_HOURS])
      : [];

  const perMember = await Promise.all(
    memberHours.map(async ({ member, hours }) => {
      // Bookings that overlap the shop-local day for this staff member —
      // excluding statuses that don't actually hold the slot (matches the
      // create-time conflict check's exclusion set), so a canceled/no-show
      // booking doesn't keep blocking its old time from being offered again.
      const existingBookings = await prisma.booking.findMany({
        where: {
          shopId,
          staffId: member.id,
          status: { notIn: SLOT_FREEING_STATUSES },
          startTime: { lt: dayEnd },
          endTime: { gt: dayStart },
          // Rescheduling: the booking being moved never blocks its own new
          // time (same exclusion as the update-time overlap check).
          ...(options.forBookingId && { id: { not: options.forBookingId } }),
        },
        select: { startTime: true, endTime: true },
      });
      const isFree = (c: { start: Date; end: Date }) =>
        !existingBookings.some(
          (b) => b.startTime < c.end && b.endTime > c.start,
        );

      if (!withOutside) {
        const slots: OwnerSlotInfo[] = hours
          ? buildSlotCandidates(
              date,
              zone,
              hours,
              duration,
              slotIntervalMinutes,
            ).map((c) => {
              const past = context === 'public' && c.start < now;
              return {
                time: c.time,
                available: !outsideWindow && !past && isFree(c),
                outsideHours: false,
                past,
              };
            })
          : [];
        return slots;
      }

      // Owner/staff view: the usual in-hours grid plus the out-of-hours grid.
      const inHours = hours
        ? buildSlotCandidates(date, zone, hours, duration, step)
        : [];
      const shopGridTimes = new Set(
        hours && step !== slotIntervalMinutes
          ? buildSlotCandidates(
              date,
              zone,
              hours,
              duration,
              slotIntervalMinutes,
            ).map((c) => c.time)
          : inHours.map((c) => c.time),
      );
      const outsideCandidates = buildOutsideHoursCandidates(
        date,
        zone,
        hours ?? [],
        closedDayRanges,
        duration,
        step,
      );
      const all = [
        ...inHours.map((c) => ({
          ...c,
          reason: undefined as OutsideReason | undefined,
        })),
        ...outsideCandidates,
      ].sort((a, b) => a.start.getTime() - b.start.getTime());
      return all.map(
        (c): OwnerSlotInfo => ({
          time: c.time,
          available: isFree(c),
          outsideHours: c.reason !== undefined,
          past: c.start < now,
          ...(c.reason && { reason: c.reason }),
          ...(c.reason === undefined &&
            !shopGridTimes.has(c.time) && { offGrid: true }),
        }),
      );
    }),
  );

  // Combine the team's views of each start time (a single member passes
  // through unchanged). Every theoretical slot is listed, flagged with whether
  // it's actually free — callers decide whether to filter these down
  // (public/customer view) or show booked ones disabled (internal view).
  const byTime = new Map<string, OwnerSlotInfo>();
  for (const slots of perMember) {
    for (const slot of slots) {
      const current = byTime.get(slot.time);
      if (!current || slotRank(slot) > slotRank(current))
        byTime.set(slot.time, slot);
    }
  }
  const merged = [...byTime.values()].sort((a, b) =>
    a.time.localeCompare(b.time),
  );

  if (withOutside) return { status: anyHours ? 'ok' : 'closed', slots: merged };
  return {
    status: 'ok',
    slots: merged.map(({ time, available }) => ({ time, available })),
  };
};

// ── Owner / Staff ────────────────────────────────────────────────────────────

export const listBookings = async (
  userId: string,
  shopId: string,
  filters: { date?: string; status?: BookingStatus; staffId?: string },
) => {
  const canViewCustomer = canViewCustomerDetails(
    await requireShopAccess(userId, shopId),
  );
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
    omit: NO_CANCEL_TOKEN,
    include: {
      customer: true,
      service: true,
      products: PRODUCT_LINES,
      services: SERVICE_LINES,
      ...RESCHEDULE_LINKS,
    },
    orderBy: { startTime: 'asc' },
  });

  return bookings.map((b) => ({
    ...b,
    customer: redactCustomer(b.customer, canViewCustomer),
  }));
};

// Blocked slots hold time but are not appointments: counts and "upcoming"
// lists leave them out.
const NOT_BLOCKED = { customer: { isSystem: false } } as const;

export const getBookingStats = async (userId: string, shopId: string) => {
  const canViewCustomer = canViewCustomerDetails(
    await requireShopAccess(userId, shopId),
  );
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
        ...NOT_BLOCKED,
      },
    }),
    prisma.booking.count({
      where: {
        shopId,
        startTime: { gte: now },
        status: { notIn: ['CANCELED', 'NO_SHOW'] },
        ...NOT_BLOCKED,
      },
    }),
    prisma.booking.findMany({
      where: {
        shopId,
        startTime: { gte: now },
        status: { notIn: ['CANCELED', 'NO_SHOW'] },
        ...NOT_BLOCKED,
      },
      omit: NO_CANCEL_TOKEN,
      include: {
        customer: true,
        service: true,
        staff: { select: { id: true, name: true, email: true } },
        products: PRODUCT_LINES,
        services: SERVICE_LINES,
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
    omit: NO_CANCEL_TOKEN,
    include: {
      customer: true,
      service: true,
      products: PRODUCT_LINES,
      services: SERVICE_LINES,
      ...RESCHEDULE_LINKS,
    },
  });
  if (!booking || booking.shopId !== shopId)
    throw new AppError(404, 'Booking not found');
  return booking;
};

export const getBooking = async (
  userId: string,
  shopId: string,
  bookingId: string,
) => {
  const canViewCustomer = canViewCustomerDetails(
    await requireShopAccess(userId, shopId),
  );
  const booking = await loadBooking(prisma, shopId, bookingId);
  return {
    ...booking,
    customer: redactCustomer(booking.customer, canViewCustomer),
  };
};

const RESCHEDULABLE_STATUSES: BookingStatus[] = ['PENDING', 'CONFIRMED'];

/**
 * Reschedule = the old booking stays at its old time as a CANCELED reference
 * (so it frees that slot like any canceled booking) and a new one, linked back
 * to it, is created at the new time. Runs inside the caller's transaction; the
 * caller has already checked the booking rules for the new time.
 */
const rescheduleInTx = async (
  tx: Prisma.TransactionClient,
  existing: {
    id: string;
    shopId: string;
    customerId: string;
    status: BookingStatus;
    notes: string | null;
    createdById: string | null;
    locale: string;
  },
  p: {
    serviceId: string;
    staffId: string;
    startTime: Date;
    endTime: Date;
    notes?: string | null;
    overriddenRules?: string[];
    // A different service was chosen: it replaces the booking's services.
    // Otherwise they move over to the new booking, with its length.
    newService?: { id: string; name: string; price: number };
  },
) => {
  const notReschedulable = () =>
    new AppError(
      409,
      'Only an upcoming booking can be rescheduled',
      'BOOKING_NOT_RESCHEDULABLE',
    );
  if (!RESCHEDULABLE_STATUSES.includes(existing.status))
    throw notReschedulable();

  assertBookingLength(p.startTime, p.endTime);
  await lockProvider(tx, p.staffId); // queue behind other writes for this provider

  // Conditional on the status so two reschedules of the same booking racing
  // each other can't both win: the second one finds it already CANCELED.
  const released = await tx.booking.updateMany({
    where: { id: existing.id, status: { in: RESCHEDULABLE_STATUSES } },
    data: { status: BookingStatus.CANCELED },
  });
  if (released.count === 0) throw notReschedulable();

  // The old booking no longer holds its time, so it can't conflict with itself.
  const conflict = await tx.booking.findFirst({
    where: overlapWhere(p.staffId, p.startTime, p.endTime),
  });
  if (conflict)
    throw new AppError(409, 'Time slot is already booked', 'SLOT_TAKEN');

  const created = await tx.booking.create({
    data: {
      shopId: existing.shopId,
      customerId: existing.customerId,
      serviceId: p.serviceId,
      staffId: p.staffId,
      startTime: p.startTime,
      endTime: p.endTime,
      status: existing.status,
      notes: p.notes !== undefined ? p.notes : existing.notes,
      // A fresh link: the old booking's link must not act on the new one.
      cancelToken: randomUUID(),
      overriddenRules: p.overriddenRules ?? [],
      createdById: existing.createdById,
      rescheduledFromId: existing.id,
      locale: existing.locale,
    },
  });
  // Its services come with it: a different one replaces them, otherwise they
  // move over (a single one takes the booking's new length).
  const minutes = Math.round(
    (p.endTime.getTime() - p.startTime.getTime()) / 60_000,
  );
  if (p.newService) {
    await tx.bookingService.create({
      data: {
        bookingId: created.id,
        serviceId: p.newService.id,
        name: p.newService.name,
        duration: minutes,
        price: p.newService.price,
        position: 0,
      },
    });
  } else {
    const lines = await tx.bookingService.count({
      where: { bookingId: existing.id },
    });
    await tx.bookingService.updateMany({
      where: { bookingId: existing.id },
      data: {
        bookingId: created.id,
        ...(lines === 1 && { duration: minutes }),
      },
    });
  }
  // The reserved products (and their sold marks) stay with the appointment.
  await tx.bookingProduct.updateMany({
    where: { bookingId: existing.id },
    data: { bookingId: created.id },
  });
  return tx.booking.findUniqueOrThrow({
    where: { id: created.id },
    include: { ...BOOKING_INCLUDE, ...RESCHEDULE_LINKS },
  });
};

export const updateBooking = async (
  userId: string,
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
) =>
  // Everything is read inside the (retried) transaction — see the note on the
  // create functions.
  serializableTransaction(async (tx) => {
    // Moving or editing a booking is a managing action: staff may change a
    // booking's status, but only the owner or a manager may reschedule it.
    const callerCanViewCustomer = canViewCustomerDetails(
      await requireShopAccess(userId, shopId, {
        db: tx,
        role: 'manager',
        forbiddenMessage:
          'Only the shop owner or a manager can change a booking',
      }),
    );
    const existing = await loadBooking(tx, shopId, bookingId); // 404 if gone

    // Any service/staff being referenced must belong to this shop.
    let newService: {
      id: string;
      name: string;
      price: number;
      duration: number;
      isActive: boolean;
    } | null = null;
    if (data.serviceId) {
      newService = await tx.service.findFirst({
        where: { id: data.serviceId, shopId },
      });
      if (!newService) throw new AppError(404, 'Service not found');
      // Keeping the booking's current service is always fine; moving it TO a
      // deactivated one is not.
      if (data.serviceId !== existing.serviceId && !newService.isActive)
        throw new AppError(404, 'Service not found');
    }
    const staffChanged =
      data.staffId !== undefined && data.staffId !== existing.staffId;
    if (data.staffId) {
      // Moving a booking to a different staff member requires them to be
      // active; resending the unchanged staffId (whose member may have been
      // deactivated since) only has to belong to the shop.
      const newStaff = await tx.userShop.findFirst({
        where: {
          id: data.staffId,
          shopId,
          ...(staffChanged && { active: true }),
        },
      });
      if (!newStaff) throw new AppError(404, 'Staff member not found');
    }

    const serviceChanged =
      !!data.serviceId && data.serviceId !== existing.serviceId;
    // Anything that moves the booking in time — a new start, a new staff
    // member, or a new service (which changes how long it runs) — is a
    // scheduling change: end time is recomputed and the overlap check re-runs.
    // Notes-only edits skip all of that.
    // Re-sending the current start time (a form that always posts it) is not
    // a reschedule and must not replace the booking.
    const startChanged =
      !!data.startTime &&
      new Date(data.startTime).getTime() !== existing.startTime.getTime();
    const schedulingChanged = startChanged || serviceChanged || staffChanged;

    if (!schedulingChanged) {
      const updated = await tx.booking.update({
        where: { id: bookingId },
        data: {
          ...(data.notes !== undefined && { notes: data.notes }),
          ...(data.serviceId && { serviceId: data.serviceId }),
        },
        include: { ...BOOKING_INCLUDE, ...RESCHEDULE_LINKS },
      });
      return { booking: updated, callerCanViewCustomer, previous: null };
    }

    const finalStaffId = data.staffId ?? existing.staffId;
    const finalStartTime = data.startTime
      ? new Date(data.startTime)
      : existing.startTime;
    // A booking with several services keeps its length (and them) unless a
    // different service is chosen.
    const duration =
      !serviceChanged && existing.services.length > 1
        ? (existing.endTime.getTime() - existing.startTime.getTime()) / 60_000
        : await resolveDuration(tx, shopId, newService ?? existing.service, {
            customerId: existing.customerId,
          });
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

    // The overlap check is in rescheduleInTx and is never bypassable.
    const booking = await rescheduleInTx(tx, existing, {
      serviceId: data.serviceId ?? existing.serviceId,
      staffId: finalStaffId,
      startTime: finalStartTime,
      endTime: finalEndTime,
      notes: data.notes,
      overriddenRules,
      newService: serviceChanged && newService ? newService : undefined,
    });
    return {
      booking,
      callerCanViewCustomer,
      // What the customer's "rescheduled" email compares against.
      previous: { startTime: existing.startTime },
    };
  });

export const updateBookingStatus = async (
  userId: string,
  shopId: string,
  bookingId: string,
  status: BookingStatus,
) =>
  serializableTransaction(async (tx) => {
    const canViewCustomer = canViewCustomerDetails(
      await requireShopAccess(userId, shopId, { db: tx }),
    );
    const existing = await loadBooking(tx, shopId, bookingId); // 404 if gone

    // The old half of a reschedule is only a reference: re-opening it would
    // put the customer in two slots at once.
    if (existing.rescheduledTo)
      throw new AppError(
        409,
        'This booking was rescheduled and can no longer be changed',
        'BOOKING_RESCHEDULED',
      );

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
      omit: NO_CANCEL_TOKEN,
      include: {
        customer: true,
        service: true,
        products: PRODUCT_LINES,
        services: SERVICE_LINES,
        ...RESCHEDULE_LINKS,
      },
    });
    return {
      ...updated,
      customer: redactCustomer(updated.customer, canViewCustomer),
    };
  });

// ── Customer self-service (token links in the confirmation email) ───────────

const HOUR_MS = 60 * 60_000;

type CustomerChangeBlock =
  | 'BOOKING_RESCHEDULED'
  | 'BOOKING_ALREADY_CANCELED'
  | 'BOOKING_COMPLETED'
  | 'BOOKING_NO_SHOW'
  | 'BOOKING_IN_PAST'
  | 'CANCEL_WINDOW_CLOSED'
  | 'RESCHEDULE_DISABLED'
  | 'RESCHEDULE_WINDOW_CLOSED';

const BLOCK_MESSAGES: Record<CustomerChangeBlock, [number, string]> = {
  BOOKING_RESCHEDULED: [409, 'Booking was rescheduled to a new time'],
  BOOKING_ALREADY_CANCELED: [409, 'Booking is already cancelled'],
  BOOKING_COMPLETED: [409, 'Booking is already completed'],
  BOOKING_NO_SHOW: [409, 'Booking was marked as a no-show'],
  BOOKING_IN_PAST: [409, 'Booking has already started or passed'],
  CANCEL_WINDOW_CLOSED: [409, 'It is too close to the booking to cancel it'],
  RESCHEDULE_DISABLED: [403, 'This shop does not allow rescheduling online'],
  RESCHEDULE_WINDOW_CLOSED: [
    409,
    'It is too close to the booking to reschedule it',
  ],
};

const blockError = (code: CustomerChangeBlock) =>
  new AppError(BLOCK_MESSAGES[code][0], BLOCK_MESSAGES[code][1], code);

type TokenBooking = {
  status: BookingStatus;
  startTime: Date;
  rescheduledTo: { id: string } | null;
  shop: {
    isActive: boolean;
    customerRescheduleEnabled: boolean;
    cancelCutoffHours: number;
    rescheduleCutoffHours: number;
  } & Parameters<typeof isShopLocked>[0];
};

// Why the customer can't change this booking at all, whatever the action.
const stateBlock = (
  b: TokenBooking,
  now: number,
): CustomerChangeBlock | null => {
  // Checked first: a rescheduled booking is CANCELED too, but "it moved" is
  // the useful thing to tell the customer.
  if (b.rescheduledTo) return 'BOOKING_RESCHEDULED';
  if (b.status === BookingStatus.CANCELED) return 'BOOKING_ALREADY_CANCELED';
  if (b.status === BookingStatus.COMPLETED) return 'BOOKING_COMPLETED';
  if (b.status === BookingStatus.NO_SHOW) return 'BOOKING_NO_SHOW';
  if (b.startTime.getTime() <= now) return 'BOOKING_IN_PAST';
  return null;
};

// The shop's cutoff: locked once the start is closer than `hours` away.
const insideCutoff = (startTime: Date, hours: number, now: number) =>
  startTime.getTime() - now < hours * HOUR_MS;

/** Owners and managers are never subject to these; only the email links. */
export const cancelBlock = (b: TokenBooking, now = Date.now()) =>
  stateBlock(b, now) ??
  (insideCutoff(b.startTime, b.shop.cancelCutoffHours, now)
    ? 'CANCEL_WINDOW_CLOSED'
    : null);

export const rescheduleBlock = (b: TokenBooking, now = Date.now()) =>
  stateBlock(b, now) ??
  // A locked shop takes no new bookings, and a reschedule makes one.
  (!b.shop.customerRescheduleEnabled ||
  !b.shop.isActive ||
  isShopLocked(b.shop, new Date(now))
    ? 'RESCHEDULE_DISABLED'
    : insideCutoff(b.startTime, b.shop.rescheduleCutoffHours, now)
      ? 'RESCHEDULE_WINDOW_CLOSED'
      : null);

const TOKEN_INCLUDE = {
  customer: true,
  service: true,
  shop: true,
  staff: { select: { id: true, name: true, email: true } },
  rescheduledTo: { select: { id: true, startTime: true } },
  products: PRODUCT_LINES,
  services: SERVICE_LINES,
} as const;

const loadByToken = async (db: Prisma.TransactionClient, token: string) => {
  const booking = await db.booking.findUnique({
    where: { cancelToken: token },
    include: TOKEN_INCLUDE,
  });
  if (!booking)
    throw new AppError(404, 'Booking not found', 'BOOKING_NOT_FOUND');
  return booking;
};

/** What the customer's cancel / reschedule pages show before acting. */
export const getBookingByToken = async (token: string) => {
  const booking = await loadByToken(prisma, token);
  return {
    booking,
    cancelBlock: cancelBlock(booking),
    rescheduleBlock: rescheduleBlock(booking),
  };
};

/** The booking a public slots request is rescheduling, if the token is its. */
export const findBookingIdByToken = async (shopId: string, token: string) => {
  const booking = await prisma.booking.findUnique({
    where: { cancelToken: token },
    select: { id: true, shopId: true },
  });
  return booking?.shopId === shopId ? booking.id : undefined;
};

export const rescheduleBookingByToken = async (
  token: string,
  data: { startTime: string; staffId?: string | null },
) => {
  const startTime = new Date(data.startTime);

  return serializableTransaction(async (tx) => {
    const existing = await loadByToken(tx, token);
    const block = rescheduleBlock(existing);
    if (block) throw blockError(block);

    // Staying with the same team member is always fine while they're active;
    // switching needs someone customers may book.
    const staffChanged = !!data.staffId && data.staffId !== existing.staffId;
    const staff = staffChanged
      ? await resolveBookableStaff(tx, existing.shopId, data.staffId!, 'public')
      : await tx.userShop.findFirst({
          where: {
            id: existing.staffId,
            shopId: existing.shopId,
            active: true,
          },
        });
    if (!staff) throw staffUnavailable(data.staffId ?? existing.staffId);
    if (staffChanged)
      await assertDoesAll(
        tx,
        staff.id,
        existing.services.length > 0
          ? existing.services.map((line) => line.serviceId)
          : [existing.serviceId],
        'public',
      );

    if (!staffChanged && startTime.getTime() === existing.startTime.getTime())
      throw new AppError(
        400,
        'Pick a different time or team member',
        'BOOKING_UNCHANGED',
      );

    const duration =
      existing.services.length > 1
        ? (existing.endTime.getTime() - existing.startTime.getTime()) / 60_000
        : await resolveDuration(tx, existing.shopId, existing.service, {
            customerId: existing.customerId,
          });
    const endTime = new Date(startTime.getTime() + duration * 60_000);

    // Strict, like a public booking: no overrides.
    await assertBookingRules({
      db: tx,
      shopId: existing.shopId,
      timezone: existing.shop.timezone,
      maxAdvanceDays: existing.shop.maxAdvanceDays,
      slotIntervalMinutes: existing.shop.slotIntervalMinutes,
      scheduleStaffId: staff.id,
      startTime,
      endTime,
    });

    const booking = await rescheduleInTx(tx, existing, {
      serviceId: existing.serviceId,
      staffId: staff.id,
      startTime,
      endTime,
    });
    return { booking, previous: { startTime: existing.startTime } };
  });
};

export const cancelBookingByToken = async (token: string) => {
  const booking = await loadByToken(prisma, token);
  const block = cancelBlock(booking);
  if (block) throw blockError(block);

  // Conditional write: only one request takes a booking out of an active
  // state. A second cancel, or one that lost to a reschedule, is told what
  // the booking is now instead of "cancelled".
  const { count } = await prisma.booking.updateMany({
    where: {
      id: booking.id,
      status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
    },
    data: { status: BookingStatus.CANCELED },
  });
  if (count === 0)
    throw blockError(
      cancelBlock(await loadByToken(prisma, token)) ??
        'BOOKING_ALREADY_CANCELED',
    );

  return prisma.booking.findUniqueOrThrow({
    where: { id: booking.id },
    include: {
      customer: true,
      service: true,
      shop: true,
      services: SERVICE_LINES,
    },
  });
};

// ── Reserved products: quantity, sold / not sold ────────────────────────────

/**
 * Changes a reserved product on a booking: its quantity and/or whether it was
 * sold. A quantity of 0 keeps the line (it may be a slip) but it no longer
 * counts; removing it is a separate, deliberate request. Marking it sold takes the quantity out of the
 * product's stock (never below 0, and only what was really taken is given
 * back later); marking it not sold, changing the quantity or removing it
 * first returns what it took. Any active member of the shop may do this, but
 * only the owner and managers may raise a quantity past what is left.
 */
export const updateBookingProductLine = async (
  userId: string,
  shopId: string,
  bookingId: string,
  lineId: string,
  change: {
    saleStatus?: 'RESERVED' | 'SOLD' | 'NOT_SOLD';
    quantity?: number;
  },
) =>
  prisma.$transaction(async (tx) => {
    const caller = await requireShopAccess(userId, shopId, { db: tx });
    // Lock the line before reading it, so a second click at the same moment
    // waits and then sees what the first one did instead of repeating it.
    await tx.$queryRaw`SELECT id FROM "BookingProduct" WHERE id = ${lineId} FOR UPDATE`;
    const line = await tx.bookingProduct.findFirst({
      where: { id: lineId, bookingId, booking: { shopId } },
    });
    if (!line) throw new AppError(404, 'Reserved product not found');

    const quantity = change.quantity ?? line.quantity;
    const saleStatus = change.saleStatus ?? line.saleStatus;
    let stockTaken = line.stockTaken;

    if (line.productId) {
      // Then the product, so two clicks cannot both take the last one.
      await tx.$queryRaw`SELECT id FROM "Product" WHERE id = ${line.productId} FOR UPDATE`;
      const product = await tx.product.findUniqueOrThrow({
        where: { id: line.productId },
      });
      // What the stock would be if this line had never taken anything.
      let stock = product.stock + line.stockTaken;
      stockTaken = 0;

      if (
        quantity > line.quantity &&
        quantity > stock &&
        !canManage(caller.role)
      ) {
        const message = `Not enough in stock: ${product.name}`;
        throw new AppError(422, message, PRODUCT_OUT_OF_STOCK, undefined, {
          violations: [
            { code: PRODUCT_OUT_OF_STOCK, message, overridable: false },
          ],
          productIds: [product.id],
        });
      }
      if (quantity > 0 && saleStatus === 'SOLD') {
        stockTaken = Math.min(quantity, stock);
        stock -= stockTaken;
      }
      if (stock !== product.stock)
        await tx.product.update({ where: { id: product.id }, data: { stock } });
    }

    return tx.bookingProduct.update({
      where: { id: line.id },
      data: { saleStatus, quantity, stockTaken },
      select: PRODUCT_LINES.select,
    });
  });

/** Takes a reserved product off a booking, giving back any stock it took. */
export const removeBookingProductLine = async (
  userId: string,
  shopId: string,
  bookingId: string,
  lineId: string,
) =>
  prisma.$transaction(async (tx) => {
    await requireShopAccess(userId, shopId, { db: tx });
    await tx.$queryRaw`SELECT id FROM "BookingProduct" WHERE id = ${lineId} FOR UPDATE`;
    const line = await tx.bookingProduct.findFirst({
      where: { id: lineId, bookingId, booking: { shopId } },
    });
    if (!line) throw new AppError(404, 'Reserved product not found');

    if (line.productId && line.stockTaken > 0) {
      await tx.$queryRaw`SELECT id FROM "Product" WHERE id = ${line.productId} FOR UPDATE`;
      await tx.product.update({
        where: { id: line.productId },
        data: { stock: { increment: line.stockTaken } },
      });
    }
    await tx.bookingProduct.delete({ where: { id: line.id } });
    return { id: line.id, deleted: true as const };
  });
