import client from './client';

export type ShopRole = 'owner' | 'manager' | 'staff';

export interface Shop {
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
  reminderHoursBefore: number;
  isActive: boolean;
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
  reminderHoursBefore?: number;
  isActive?: boolean;
}

export const getMyShops = () =>
  client.get('/api/shops').then((r) => r.data.data as Shop[]);

export const getShop = (id: string) =>
  client.get(`/api/shops/${id}`).then((r) => r.data.data as Shop);

export const createShop = (dto: CreateShopDto) =>
  client.post('/api/shops', dto).then((r) => r.data.data as Shop);

export const updateShop = (id: string, dto: UpdateShopDto) =>
  client.patch(`/api/shops/${id}`, dto).then((r) => r.data.data as Shop);

export const deleteShop = (id: string) =>
  client.delete(`/api/shops/${id}`).then((r) => r.data);
