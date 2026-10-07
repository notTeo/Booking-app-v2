import client from './client';
import type { ShopRole } from './shop.api';
import { isPlausiblePhone } from '../utils/phone';
import type { PhotoCrop } from './photo.api';

export interface OpeningRange {
  startTime: string;
  endTime: string;
}

export interface OpeningDay {
  day: 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN';
  hours: OpeningRange[];
}

export interface Service {
  id: string;
  name: string;
  description: string | null;
  duration: number;
  price: number;
}

export interface StaffService {
  service: {
    id: string;
    name: string;
  };
}

export interface ShopMember {
  id: string;
  shopId: string;
  role: ShopRole;
  createdAt: string;
  name: string;
  photoUrl: string | null;
  bookableByCustomers: boolean;
  bookableInternally: boolean;
  staffServices: StaffService[];
}

/** A product a customer can reserve with a booking. */
export interface PublicProduct {
  id: string;
  name: string;
  description: string | null;
  /** In cents. */
  price: number;
  stock: number;
  photoUrl: string | null;
}

/** A product reserved with a booking, as it is shown back to the customer. */
export interface ReservedProduct {
  name: string;
  quantity: number;
  /** In cents. */
  unitPrice: number;
}

export interface ProductLine {
  productId: string;
  quantity: number;
}

export interface ShopInfo {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  phone: string | null;
  formattedAddress: string | null;
  timezone: string;
  maxAdvanceDays: number;
  slotIntervalMinutes: number;
  /** Colour set and fonts of this page (see utils/branding.ts). */
  publicPalette: string;
  publicFont: string;
  /** The shop's photo, shown at the top of its page. */
  photoUrl: string | null;
  /** Customers may add a profile photo of themselves. */
  customerPhotosEnabled?: boolean;
  /** The shop's sign-up page (/<slug>/profile) is on. */
  customerProfilePageEnabled?: boolean;
  isActive: boolean;
  /** False while the shop takes no new online bookings (its plan has lapsed). */
  acceptingBookings: boolean;
  createdAt: string;
  updatedAt: string;
  services: Service[];
  /** Derived from the team's own schedules: per weekday, merged ranges (empty = closed). */
  openingHours: OpeningDay[];
  members: ShopMember[];
  /** Empty when the shop's plan has no products. */
  products: PublicProduct[];
}

export const getShopInfo = (slug: string) =>
  client.get(`/public/${slug}`).then((r) => r.data.data as ShopInfo);

export interface CustomerProfilePayload {
  name: string;
  phone: string;
  email?: string;
  /** "My number has changed": `phone` is then the old one the shop knows. */
  newPhone?: string;
  photo?: { file: File; crop: PhotoCrop };
  /** Only the photo counts (the booking page): the name is not a request to rename. */
  photoOnly?: boolean;
}

/**
 * The sign-up page's form (and the booking page's photo). A new customer, or a
 * first photo, is saved at once; changes to a customer the shop already has
 * wait for the shop to accept them. The answer is the same either way, so it
 * says nothing about who is already a customer.
 */
export const submitCustomerProfile = (slug: string, payload: CustomerProfilePayload) => {
  const form = new FormData();
  form.append('name', payload.name);
  form.append('phone', payload.phone);
  if (payload.email) form.append('email', payload.email);
  if (payload.newPhone) form.append('newPhone', payload.newPhone);
  if (payload.photoOnly) form.append('photoOnly', 'true');
  if (payload.photo) {
    form.append('crop', JSON.stringify(payload.photo.crop));
    form.append('photo', payload.photo.file);
  }
  return client.post(`/public/${slug}/profile`, form).then(() => undefined);
};

export interface CreateBookingPayload {
  name: string;
  phone: string;
  email?: string;
  /** The first service (also sent as serviceIds[0]). */
  serviceId: string;
  /** Several services, done one after another by the same provider. */
  serviceIds?: string[];
  staffId: string;
  startTime: string;       // ISO 8601 datetime
  notes?: string;
  products?: ProductLine[];
}

export interface BookingConfirmation {
  id: string;
  status: string;
  startTime: string;
  endTime: string;
  products: ReservedProduct[];
  /** What the services cost together, in cents. */
  servicePrice: number;
  services: { name: string; duration: number; price: number }[];
}

export const createBooking = (slug: string, payload: CreateBookingPayload) =>
  client.post(`/public/${slug}/book`, payload).then((r) => r.data.data as BookingConfirmation);

export interface CancelBookingResult {
  id: string;
  status: string;
  shopName: string;
  serviceName: string;
  startTime: string;
  customerName: string;
}

export const cancelBooking = (token: string) =>
  client.post('/public/cancel', { token }).then((r) => r.data.data as CancelBookingResult);

/** Why a customer link is locked; the API's error `code` for the same action. */
export type CustomerChangeBlock =
  | 'BOOKING_RESCHEDULED'
  | 'BOOKING_ALREADY_CANCELED'
  | 'BOOKING_COMPLETED'
  | 'BOOKING_NO_SHOW'
  | 'BOOKING_IN_PAST'
  | 'CANCEL_WINDOW_CLOSED'
  | 'RESCHEDULE_DISABLED'
  | 'RESCHEDULE_WINDOW_CLOSED';

interface CustomerAction {
  allowed: boolean;
  reason: CustomerChangeBlock | null;
  cutoffHours: number;
}

/** A booking as its customer sees it from the link in their email. */
export interface ManagedBooking {
  id: string;
  status: string;
  startTime: string;
  endTime: string;
  customerName: string;
  shop: { slug: string; name: string; timezone: string; publicPalette: string; publicFont: string };
  service: { id: string; name: string; duration: number; price: number };
  staff: { id: string; name: string | null };
  /** Every service of the booking, in order (the first is `service`). */
  services: { id: string; name: string; duration: number; price: number }[];
  products: ReservedProduct[];
  rescheduledTo: { startTime: string } | null;
  cancel: CustomerAction;
  reschedule: CustomerAction;
}

export const getManagedBooking = (token: string) =>
  client.post('/public/booking', { token }).then((r) => r.data.data as ManagedBooking);

export interface RescheduleResult {
  id: string;
  status: string;
  startTime: string;
  endTime: string;
  shopName: string;
  serviceName: string;
  staffName: string | null;
}

export const rescheduleBookingByToken = (
  token: string,
  payload: { startTime: string; staffId?: string },
) =>
  client.post('/public/reschedule', { token, ...payload }).then((r) => r.data.data as RescheduleResult);

/** Why a slot is outside working hours (owner/staff view only). */
export type OutsideReason = 'BEFORE_OPENING' | 'BREAK' | 'AFTER_CLOSING' | 'CLOSED_DAY';

export interface SlotInfo {
  time: string; // "HH:MM"
  available: boolean; // false = overlaps an active booking
  // Only present on the authenticated owner slots (includeOutsideHours):
  outsideHours?: boolean;
  past?: boolean;
  reason?: OutsideReason;
  /** In hours but not on the shop's own slot grid (a finer interval was requested). */
  offGrid?: boolean;
}

export type SlotsResponse =
  // A closed day may still carry the out-of-hours grid (owner view).
  | { status: 'closed'; slots?: SlotInfo[] }
  | { status: 'ok'; slots: SlotInfo[] };

/** The `serviceIds` query value for several services; none for a single one. */
export const joinIds = (ids?: string[]) => (ids && ids.length > 1 ? ids.join(',') : undefined);

export const getPublicSlots = (
  slug: string,
  date: string,
  staffId: string | null,
  serviceId: string | null,
  /** A customer rescheduling: their own booking doesn't block its slot. */
  rescheduleToken?: string,
  /**
   * A returning customer's phone: the times offered then fit their own
   * duration for the service. A header, so it stays out of URLs and logs.
   */
  customerPhone?: string,
  /** All the services when there are several: the times fit them added up. */
  serviceIds?: string[],
) =>
  client
    .get(`/public/${slug}/slots`, {
      params: { date, staffId, serviceId, rescheduleToken, serviceIds: joinIds(serviceIds) },
      ...(customerPhone && isPlausiblePhone(customerPhone) && { headers: { 'X-Customer-Phone': customerPhone.trim() } }),
    })
    .then((r) => r.data.data as SlotsResponse);
