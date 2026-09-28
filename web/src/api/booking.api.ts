import client from './client';
import type { SlotsResponse } from './public.api';

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
  status: BookingStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  customer: BookingCustomer;
  service: BookingService;
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

/** Slots for the shop's own staff (authenticated): honours "bookable internally". */
export const getOwnerSlots = (
  shopId: string,
  date: string,
  staffId: string | null,
  serviceId: string,
) =>
  client
    .get(`${base(shopId)}/slots`, { params: { date, staffId, serviceId } })
    .then((r) => r.data.data as SlotsResponse);

export const updateBookingStatus = (shopId: string, bookingId: string, status: BookingStatus) =>
  client
    .patch(`${base(shopId)}/${bookingId}/status`, { status })
    .then((r) => r.data.data as Booking);

export const deleteBooking = (shopId: string, bookingId: string) =>
  client.delete(`${base(shopId)}/${bookingId}`).then((r) => r.data);

export interface OwnerCreateBookingPayload {
  name: string;
  phone: string;
  email?: string;
  serviceId: string;
  staffId?: string;
  startTime: string; // ISO 8601
  notes?: string;
  /** Bypass the booking rules (never the overlap check). Sent only after the
   * user confirmed a rule violation the server reported with a 422 `code`. */
  override?: boolean;
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

export interface ApiErrorInfo {
  status?: number;
  code?: string;
  message?: string;
}

/** Pull status / machine code / message out of an axios error. */
export const getApiError = (err: unknown): ApiErrorInfo => {
  const r = (err as { response?: { status?: number; data?: { code?: string; message?: string } } })
    ?.response;
  return { status: r?.status, code: r?.data?.code, message: r?.data?.message };
};

export const isBookingRuleViolation = (
  e: ApiErrorInfo,
): e is ApiErrorInfo & { code: BookingRuleCode } =>
  e.status === 422 && (BOOKING_RULE_CODES as readonly string[]).includes(e.code ?? '');
