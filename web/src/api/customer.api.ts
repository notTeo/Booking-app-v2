import client from './client';
import type { BookingStatus } from './booking.api';
import type { Overview } from './overview.api';
import { deletePhoto, putPhoto, type PhotoCrop, type PhotoFields } from './photo.api';

/** The photo is absent on rows that do not carry it; null for staff who may not see customer details. */
export interface Customer extends Partial<PhotoFields> {
  id: string;
  shopId: string;
  name: string;
  phone: string;
  email: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  contactHidden?: boolean;
  /** Customer list only: at least one service has a custom duration for them. */
  hasCustomDurations?: boolean;
  /** Customer list only (owner and managers): their own changes wait for approval. */
  hasPendingChanges?: boolean;
}

/**
 * What a customer asked to change on the shop's public sign-up page. Nothing is
 * applied until the owner or a manager accepts. A null field was not changed.
 */
export interface CustomerChangeRequest {
  name: string | null;
  phone: string | null;
  email: string | null;
  photoUrl: string | null;
  createdAt: string;
}

/** How long one service takes for one customer, when not the service's standard time. */
export interface CustomerServiceDuration {
  serviceId: string;
  duration: number; // minutes
}

export interface CustomerListResult {
  items: Customer[];
  total: number;
  page: number;
  limit: number;
  /** How many customers have changes waiting (0 for staff). */
  pendingChangesCount?: number;
}

export interface CustomerBooking {
  id: string;
  startTime: string;
  endTime: string;
  status: BookingStatus;
  service: {
    name: string;
    duration: number;
    price: number;
  };
  /** Every service of the booking, in order (the first is `service`). */
  services?: { name: string; duration: number; price: number }[];
  staff: { name: string };
}

export interface CustomerBookingsResult {
  items: CustomerBooking[];
  total: number;
  page: number;
  limit: number;
}

export interface CustomerDetail extends Customer {
  totalVisits: number;
  totalSpent: number;
  /** Lifetime booking counts by status, in the shop overview's shape. */
  totals: Overview['totals'];
  serviceDurations: CustomerServiceDuration[];
  /** Owner and managers only; null when nothing is waiting. */
  changeRequest?: CustomerChangeRequest | null;
}

export interface UpdateCustomerDto {
  name?: string;
  phone?: string;
  email?: string | null;
  notes?: string | null;
}

const base = (shopId: string) => `/api/shops/${shopId}/customers`;

export const getCustomers = (
  shopId: string,
  search?: string,
  page = 1,
  limit = 20,
  /** Only customers with a custom duration for some service. */
  hasCustomDurations = false,
  /** Only customers whose own changes wait for approval. */
  pendingChanges = false,
) =>
  client
    .get(base(shopId), {
      params: {
        ...(search ? { search } : {}),
        ...(hasCustomDurations ? { hasCustomDurations: true } : {}),
        ...(pendingChanges ? { pendingChanges: true } : {}),
        page,
        limit,
      },
    })
    .then((r) => r.data.data as CustomerListResult);

export const getCustomer = (shopId: string, customerId: string) =>
  client.get(`${base(shopId)}/${customerId}`).then((r) => r.data.data as CustomerDetail);

/** The customer's booking history, newest first. */
export const getCustomerBookings = (shopId: string, customerId: string, page = 1, limit = 10) =>
  client
    .get(`${base(shopId)}/${customerId}/bookings`, { params: { page, limit } })
    .then((r) => r.data.data as CustomerBookingsResult);

export interface CreateCustomerDto {
  name: string;
  phone: string;
  email?: string | null;
  notes?: string | null;
}

/** Add a customer by hand. A phone the shop already has is a 409 `CUSTOMER_EXISTS` carrying that customer's `customerId`. */
export const createCustomer = (shopId: string, dto: CreateCustomerDto) =>
  client.post(base(shopId), dto).then((r) => r.data.data as Customer);

/** Owner and managers. */
export const setCustomerPhoto = (shopId: string, customerId: string, file: File | null, crop: PhotoCrop) =>
  putPhoto<Customer>(`${base(shopId)}/${customerId}/photo`, file, crop);

export const removeCustomerPhoto = (shopId: string, customerId: string) =>
  deletePhoto<Customer>(`${base(shopId)}/${customerId}/photo`);

/** Apply what the customer asked to change (owner and managers). */
export const acceptCustomerChanges = (shopId: string, customerId: string) =>
  client.post(`${base(shopId)}/${customerId}/change-request/accept`).then((r) => r.data.data as CustomerDetail);

export const rejectCustomerChanges = (shopId: string, customerId: string) =>
  client.delete(`${base(shopId)}/${customerId}/change-request`).then((r) => r.data.data as CustomerDetail);

export const updateCustomer = (shopId: string, customerId: string, dto: UpdateCustomerDto) =>
  client.patch(`${base(shopId)}/${customerId}`, dto).then((r) => r.data.data as Customer);

/** Replace the customer's custom service durations; a service left out goes back to its standard time. */
export const setCustomerServiceDurations = (shopId: string, customerId: string, items: CustomerServiceDuration[]) =>
  client
    .put(`${base(shopId)}/${customerId}/service-durations`, { items })
    .then((r) => r.data.data as CustomerServiceDuration[]);

export interface CustomerExport {
  exportedAt: string;
  customer: Customer;
  bookings: {
    id: string;
    startTime: string;
    endTime: string;
    status: BookingStatus;
    notes: string | null;
    service: string;
    staff: string;
    createdAt: string;
  }[];
}

export const exportCustomer = (shopId: string, customerId: string) =>
  client.get(`${base(shopId)}/${customerId}/export`).then((r) => r.data.data as CustomerExport);

export const deleteCustomer = (shopId: string, customerId: string) =>
  client.delete(`${base(shopId)}/${customerId}`).then(() => undefined);

export interface MergedCustomer extends Customer {
  movedBookings: number;
}

/** Merge `sourceId` into `targetId`: the source's bookings move over and the source is removed. */
export const mergeCustomer = (shopId: string, targetId: string, sourceId: string) =>
  client
    .post(`${base(shopId)}/${targetId}/merge`, { sourceCustomerId: sourceId })
    .then((r) => r.data.data as MergedCustomer);

export interface CustomerExportRow {
  name: string;
  phone: string;
  email: string | null;
  notes: string | null;
  createdAt: string;
  bookings: number;
}

/** Every customer of the shop (owner and managers). */
export const exportAllCustomers = (shopId: string) =>
  client.get(`${base(shopId)}/export-all`).then((r) => r.data.data as CustomerExportRow[]);

export interface ImportRow {
  name: string;
  phone: string;
  email?: string;
  notes?: string;
}

export type ImportRowProblem = 'name_missing' | 'name_too_long' | 'phone_invalid' | 'email_invalid' | 'notes_too_long';

export interface ImportResult {
  created: number;
  updated: number;
  skipped: number;
  /** `row` is the position in the batch that was sent, from 0. */
  errors: { row: number; reason: ImportRowProblem }[];
}

/** The API takes at most this many rows per request. */
export const IMPORT_BATCH_SIZE = 500;

export const importCustomers = (shopId: string, rows: ImportRow[]) =>
  client.post(`${base(shopId)}/import`, { rows }).then((r) => r.data.data as ImportResult);
