import client from './client';
import type { ShopInfo, SlotsResponse } from './public.api';

export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELED' | 'NO_SHOW';

export interface BookingCustomer {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  contactHidden?: boolean;
  /** The shop's "Blocked" placeholder: this booking is a blocked slot, not an appointment. */
  isSystem?: boolean;
}

export interface BookingService {
  id: string;
  name: string;
  duration: number;  // minutes
  price: number;     // cents
}

/** One product reserved with a booking, as the shop sees it. */
export interface BookingProductLine {
  id: string;
  /** Null once the product has been deleted: the line keeps the name and price it was reserved with. */
  productId: string | null;
  name: string;
  /** In cents. */
  unitPrice: number;
  quantity: number;
  saleStatus: 'RESERVED' | 'SOLD' | 'NOT_SOLD';
  /** What is left of the product now. Null once it has been deleted. */
  product: { stock: number; photoUrl: string | null } | null;
}

/** One service of a booking, as it was booked (name, minutes and price are copies). */
export interface BookingServiceLine {
  id: string;
  serviceId: string;
  name: string;
  duration: number;
  /** In cents. */
  price: number;
  position: number;
}

export interface Booking {
  id: string;
  shopId: string;
  customerId: string;
  serviceId: string;
  staffId: string;
  startTime: string;          // ISO datetime
  endTime: string;             // ISO datetime
  status: BookingStatus;
  notes: string | null;
  /** Overridable rule codes this booking violated AND the creator accepted, stored at creation time (never recomputed). */
  overriddenRules: string[];
  /** Who created it (owner/staff), or null if the creating member's account was later deleted. */
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
  customer: BookingCustomer;
  service: BookingService;
  /** The booking this one replaced when it was rescheduled. */
  rescheduledFrom?: BookingLink | null;
  /** Set on the old half of a reschedule: it stays CANCELED as a reference. */
  rescheduledTo?: BookingLink | null;
  products?: BookingProductLine[];
  /** Every service of the booking, in order; the first is `service`. */
  services?: BookingServiceLine[];
}

export interface BookingLink {
  id: string;
  startTime: string;
}

export interface ListBookingsParams {
  date?: string;         // YYYY-MM-DD
  status?: BookingStatus;
  staffId?: string;
}

export interface BookingWithStaff extends Booking {
  staff: { id: string; name: string; email: string };
}

export interface BookingStats {
  todayCount: number;
  upcomingCount: number;
  upcoming: BookingWithStaff[];
}

const base = (shopId: string) => `/api/shops/${shopId}/bookings`;

export const listBookings = (shopId: string, params?: ListBookingsParams) =>
  client.get(base(shopId), { params }).then((r) => r.data.data as Booking[]);

export const getBookingStats = (shopId: string) =>
  client.get(`${base(shopId)}/stats`).then((r) => r.data.data as BookingStats);

/**
 * Slots for the shop's own staff (authenticated): honours "bookable
 * internally". Always includes the out-of-hours grid (flagged per slot), so the
 * form knows which times need confirming; the toggle only decides what to show.
 */
export const getOwnerSlots = (
  shopId: string,
  date: string,
  staffId: string | null,
  serviceId: string,
  intervalMinutes?: number,
  /** Rescheduling: this booking doesn't block its own new time, and its own (possibly deactivated) service still resolves. */
  forBookingId?: string,
  /** Who the booking is for, when already picked: their own duration for the service decides which times fit. */
  customerId?: string,
  /** All the services when there are several: the times fit them added up. */
  serviceIds?: string[],
) =>
  client
    .get(`${base(shopId)}/slots`, {
      params: {
        date, staffId, serviceId, includeOutsideHours: true, intervalMinutes, forBookingId, customerId,
        serviceIds: serviceIds && serviceIds.length > 1 ? serviceIds.join(',') : undefined,
      },
    })
    .then((r) => r.data.data as SlotsResponse);

/** The owner/staff wizard's starting data: the shop info including internal-only services. */
export const getWizardInfo = (shopId: string) =>
  client.get(`${base(shopId)}/wizard-info`).then((r) => r.data.data as ShopInfo);

export const getBooking = (shopId: string, bookingId: string) =>
  client.get(`${base(shopId)}/${bookingId}`).then((r) => r.data.data as Booking);

export interface ReschedulePayload {
  startTime: string; // ISO 8601
  staffId?: string;
  /** Only when the service changes; the booking's length follows it. */
  serviceId?: string;
  /** Same contract as on creation: only codes the user explicitly accepted. */
  overrideRules?: BookingRuleCode[];
}

export const rescheduleBooking = (shopId: string, bookingId: string, payload: ReschedulePayload) =>
  client.patch(`${base(shopId)}/${bookingId}`, payload).then((r) => r.data.data as Booking);

export const updateBookingStatus = (shopId: string, bookingId: string, status: BookingStatus) =>
  client
    .patch(`${base(shopId)}/${bookingId}/status`, { status })
    .then((r) => r.data.data as Booking);

export interface OwnerCreateBookingPayload {
  /** Hold the time as a blocked slot instead of booking a customer; name and phone are then left out. */
  block?: boolean;
  name?: string;
  phone?: string;
  email?: string;
  /** The first service (also serviceIds[0]). */
  serviceId: string;
  /** Several services, done one after another by the same provider. */
  serviceIds?: string[];
  staffId?: string;
  startTime: string; // ISO 8601
  notes?: string;
  /** Rule violations the user explicitly accepted, by code (never the overlap
   * check). Sent only after the user confirmed the violations the server listed
   * in a 422. The server ignores nothing: any violation not listed here is
   * rejected again. */
  overrideRules?: (BookingRuleCode | typeof PRODUCT_OUT_OF_STOCK)[];
  /** Products reserved with the booking (not with a blocked slot). */
  products?: { productId: string; quantity: number }[];
}

/** The code of a reservation asking for more of a product than is left. */
export const PRODUCT_OUT_OF_STOCK = 'PRODUCT_OUT_OF_STOCK';

/** What changing a reserved product returns: the line as it is now, or that it was removed (quantity 0). */
export type BookingProductChange =
  | (Pick<BookingProductLine, 'id' | 'quantity' | 'saleStatus' | 'product'> & { deleted?: undefined })
  | { id: string; deleted: true };

/** Change a reserved product on a booking: its quantity and/or whether it was sold. A quantity of 0 keeps the line. */
export const updateBookingProductLine = (
  shopId: string,
  bookingId: string,
  lineId: string,
  change: { saleStatus?: BookingProductLine['saleStatus']; quantity?: number },
) =>
  client
    .patch(`${base(shopId)}/${bookingId}/products/${lineId}`, change)
    .then((r) => r.data.data as BookingProductChange);

/** Takes a reserved product off a booking for good (not the same as a quantity of 0). */
export const removeBookingProductLine = (shopId: string, bookingId: string, lineId: string) =>
  client
    .delete(`${base(shopId)}/${bookingId}/products/${lineId}`)
    .then((r) => r.data.data as { id: string; deleted: true });

export const createOwnerBooking = (shopId: string, payload: OwnerCreateBookingPayload) =>
  client.post(base(shopId), payload).then((r) => r.data.data as Booking);

/** Server-side booking-rule violations (HTTP 422). Owners may override these. */
export const BOOKING_RULE_CODES = [
  'BOOKING_IN_PAST',
  'BOOKING_BEYOND_ADVANCE_WINDOW',
  'SHOP_CLOSED',
  'OUTSIDE_OPENING_HOURS',
  'OFF_SLOT_GRID',
] as const;
export type BookingRuleCode = (typeof BOOKING_RULE_CODES)[number];

export interface RuleViolation {
  code: string;
  message: string;
  overridable: boolean;
}

export interface ApiErrorInfo {
  status?: number;
  code?: string;
  message?: string;
  /** Every booking rule the request broke (422), not just the first. */
  violations?: RuleViolation[];
  /** From the `Retry-After` response header on a 503 BOOKING_BUSY, in seconds. */
  retryAfterSeconds?: number;
}

/** Pull status / machine code / message out of an axios error. */
export const getApiError = (err: unknown): ApiErrorInfo => {
  const r = (
    err as {
      response?: {
        status?: number;
        data?: { code?: string; message?: string; violations?: RuleViolation[] };
        headers?: Record<string, string>;
      };
    }
  )?.response;
  const retryAfter = Number(r?.headers?.['retry-after']);
  return {
    status: r?.status,
    code: r?.data?.code,
    message: r?.data?.message,
    violations: r?.data?.violations,
    retryAfterSeconds: Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : undefined,
  };
};

export const isBookingRuleViolation = (
  e: ApiErrorInfo,
): e is ApiErrorInfo & { code: BookingRuleCode } =>
  e.status === 422 && (BOOKING_RULE_CODES as readonly string[]).includes(e.code ?? '');

/**
 * The rule codes the "book anyway" dialog may resend as `overrideRules`, or
 * null when the dialog must NOT be offered: not a 422 rule violation, or at
 * least one violation can never be overridden (the advance window).
 */
export const acceptableRuleCodes = (e: ApiErrorInfo): BookingRuleCode[] | null => {
  if (!isBookingRuleViolation(e)) return null;
  if (e.violations && e.violations.length > 0) {
    if (e.violations.some((v) => !v.overridable)) return null;
    return e.violations.map((v) => v.code as BookingRuleCode);
  }
  return e.code === 'BOOKING_BEYOND_ADVANCE_WINDOW' ? null : [e.code];
};
