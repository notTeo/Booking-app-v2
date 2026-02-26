import client from './client';

export type ShopRole = 'owner' | 'staff';

export interface Shop {
  id: string;
  name: string;
  slug: string;
  description?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  timezone: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  role: ShopRole;
}

export interface CreateShopDto {
  name: string;
  slug: string;
  description?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  timezone?: string;
}

export interface UpdateShopDto extends Partial<CreateShopDto> {
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
