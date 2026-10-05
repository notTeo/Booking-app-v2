import client from './client';
import type { ShopInfo, SlotsResponse } from './public.api';

export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELED' | 'NO_SHOW';

export interface BookingCustomer {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  contactHidden?: boolean;
}

export interface BookingService {
  id: string;
  name: string;
  duration: number;  // minutes
  price: number;     // cents
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
) =>
  client
    .get(`${base(shopId)}/slots`, {
      params: { date, staffId, serviceId, includeOutsideHours: true, intervalMinutes, forBookingId },
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
  name: string;
  phone: string;
  email?: string;
  serviceId: string;
  staffId?: string;
  startTime: string; // ISO 8601
  notes?: string;
  /** Rule violations the user explicitly accepted, by code (never the overlap
   * check). Sent only after the user confirmed the violations the server listed
   * in a 422. The server ignores nothing: any violation not listed here is
   * rejected again. */
  overrideRules?: BookingRuleCode[];
}

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
