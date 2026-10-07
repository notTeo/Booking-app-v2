import client from './client';
import { deletePhoto, putPhoto, type PhotoCrop, type PhotoFields } from './photo.api';

export type ShopRole = 'owner' | 'manager' | 'staff';
export type ShopPlan = 'SOLO' | 'TEAM' | 'BUSINESS';
export type SubscriptionStatus = 'TRIALING' | 'ACTIVE' | 'INACTIVE';

export interface Shop extends PhotoFields {
  id: string;
  name: string;
  slug: string;
  description?: string;
  phone?: string;
  formattedAddress?: string;
  timezone: string;
  maxAdvanceDays: number;
  slotIntervalMinutes: number;
  /** Customers may reschedule from the link in their confirmation email. */
  customerRescheduleEnabled: boolean;
  /** Hours before the start after which the customer links lock (0 = until it starts). */
  cancelCutoffHours: number;
  rescheduleCutoffHours: number;
  reminderEnabled: boolean;
  /** Customers may add a profile photo (public wizard and sign-up page). */
  customerPhotosEnabled: boolean;
  /** The public sign-up page at /<slug>/profile is on. */
  customerProfilePageEnabled: boolean;
  reminderHoursBefore: number;
  /** Colour set and fonts of the public booking page (see utils/branding.ts). */
  publicPalette: string;
  publicFont: string;
  isActive: boolean;
  plan: ShopPlan;
  subscriptionStatus: SubscriptionStatus;
  /** When the free trial ends (null unless it is, or was, on a trial). */
  trialEndsAt: string | null;
  /** Read-only, and taking no new public bookings: the trial ended or the subscription is inactive. */
  locked: boolean;
  /** How many bookable staff the plan allows. */
  staffLimit: number;
  /** Whether the plan has invites, the manager role and per-staff working hours. */
  teamFeatures: boolean;
  /** Whether the plan has products. */
  products: boolean;
  createdAt: string;
  updatedAt: string;
  role: ShopRole;
  /** Whether the signed-in member may see customer names, phones and emails here. */
  canViewCustomerDetails: boolean;
  /** The owner, or a manager the owner has let add, edit and remove managers. */
  canManageManagers: boolean;
  /** The owner, or a manager the owner has let edit the shop's settings. */
  canEditShopSettings: boolean;
}

export interface CreateShopDto {
  name: string;
  slug: string;
  description?: string;
  phone?: string;
  formattedAddress?: string;
  timezone?: string;
  maxAdvanceDays?: number;
  slotIntervalMinutes?: number;
}
export interface UpdateShopDto extends Partial<CreateShopDto> {
  customerRescheduleEnabled?: boolean;
  cancelCutoffHours?: number;
  rescheduleCutoffHours?: number;
  reminderEnabled?: boolean;
  customerPhotosEnabled?: boolean;
  customerProfilePageEnabled?: boolean;
  reminderHoursBefore?: number;
  publicPalette?: string;
  publicFont?: string;
  isActive?: boolean;
}

export const getMyShops = () =>
  client.get('/api/shops').then((r) => r.data.data as Shop[]);

export const getShop = (id: string) =>
  client.get(`/api/shops/${id}`).then((r) => r.data.data as Shop);

export const createShop = (dto: CreateShopDto) =>
  client.post('/api/shops', dto).then((r) => r.data.data as Shop);

/** The shop's photo on its booking page: a new file, or (file null) a new crop of the stored one. */
export const setShopPhoto = (id: string, file: File | null, crop: PhotoCrop) =>
  putPhoto<Shop>(`/api/shops/${id}/photo`, file, crop);

export const removeShopPhoto = (id: string) => deletePhoto<Shop>(`/api/shops/${id}/photo`);

export const updateShop = (id: string, dto: UpdateShopDto) =>
  client.patch(`/api/shops/${id}`, dto).then((r) => r.data.data as Shop);

export const deleteShop = (id: string) =>
  client.delete(`/api/shops/${id}`).then((r) => r.data);
