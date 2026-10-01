import client from './client';

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
  role: 'owner' | 'staff';
  createdAt: string;
  name: string;
  bookableByCustomers: boolean;
  bookableInternally: boolean;
  staffServices: StaffService[];
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
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  services: Service[];
  /** Derived from the team's own schedules: per weekday, merged ranges (empty = closed). */
  openingHours: OpeningDay[];
  members: ShopMember[];
}

export const getShopInfo = (slug: string) =>
  client.get(`/public/${slug}`).then((r) => r.data.data as ShopInfo);

export interface CreateBookingPayload {
  name: string;
  phone: string;
  email?: string;
  serviceId: string;
  staffId: string;
  startTime: string;       // ISO 8601 datetime
  notes?: string;
}

export interface BookingConfirmation {
  id: string;
  date: string;
  status: string;
  customer: { id: string; name: string; phone: string; email: string | null };
  service: { id: string; name: string; duration: number; price: number };
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

export const getPublicSlots = (
  slug: string,
  date: string,
  staffId: string | null,
  serviceId: string | null,
) =>
  client
    .get(`/public/${slug}/slots`, { params: { date, staffId, serviceId } })
    .then((r) => r.data.data as SlotsResponse);
