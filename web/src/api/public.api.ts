import client from './client';

export interface ShopHour {
  id: string;
  openTime: string;
  closeTime: string;
  startTime: string;
  endTime: string;
}

export interface ShopDay {
  id: string;
  dayOfWeek: number;
  day: string;
  hours: ShopHour[];
  isOpen: boolean;
}

export interface ShopWorkingSchedule {
  id: string;
  isActive: boolean;
  staffId: string | null;
  days: ShopDay[];
  startDate: string;
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
  userId: string;
  shopId: string;
  role: 'owner' | 'staff';
  createdAt: string;
  user: {
    id: string;
    name: string;
  };
  staffServices: StaffService[];
}

export interface ShopInfo {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  phone: string | null;
  lat: number | null;
  lng: number | null;
  formattedAddress: string | null;
  placeId: string | null;
  timezone: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  services: Service[];
  shopWorkingSchedules: ShopWorkingSchedule[];
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
