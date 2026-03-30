import client from './client';
import type { BookingStatus } from './booking.api';

export interface Customer {
  id: string;
  shopId: string;
  name: string;
  phone: string;
  email: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerBooking {
  id: string;
  startTime: string;
  status: BookingStatus;
  service: {
    name: string;
    duration: number;
    price: number;
  };
}

export interface CustomerDetail extends Customer {
  bookings: CustomerBooking[];
}

export interface UpdateCustomerDto {
  name?: string;
  phone?: string;
  email?: string | null;
}

const base = (shopId: string) => `/api/shops/${shopId}/customers`;

export const getCustomers = (shopId: string, search?: string) =>
  client
    .get(base(shopId), { params: search ? { search } : undefined })
    .then((r) => r.data.data as Customer[]);

export const getCustomer = (shopId: string, customerId: string) =>
  client.get(`${base(shopId)}/${customerId}`).then((r) => r.data.data as CustomerDetail);

export const updateCustomer = (shopId: string, customerId: string, dto: UpdateCustomerDto) =>
  client.patch(`${base(shopId)}/${customerId}`, dto).then((r) => r.data.data as Customer);
