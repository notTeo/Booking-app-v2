import client from './client';

export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELED' | 'NO_SHOW';

export interface BookingCustomer {
  id: string;
  name: string;
  phone: string;
  email: string | null;
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

const base = (shopId: string) => `/api/shops/${shopId}/bookings`;

export const listBookings = (shopId: string, params?: ListBookingsParams) =>
  client.get(base(shopId), { params }).then((r) => r.data.data as Booking[]);

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
}

export const createOwnerBooking = (shopId: string, payload: OwnerCreateBookingPayload) =>
  client.post(base(shopId), payload).then((r) => r.data.data as Booking);
