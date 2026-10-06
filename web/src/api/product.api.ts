import client from './client';
import { deletePhoto, putPhoto, type PhotoCrop, type PhotoFields } from './photo.api';

export interface Product extends PhotoFields {
  id: string;
  shopId: string;
  name: string;
  description: string | null;
  /** In cents. */
  price: number;
  /** How many are left. */
  stock: number;
  /** Where the shop buys it. Owner and managers only: absent for staff, never public. */
  supplierUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProductDto {
  name?: string;
  description?: string | null;
  price?: number;
  stock?: number;
  supplierUrl?: string | null;
}

const base = (shopId: string) => `/api/shops/${shopId}/products`;

export const getProducts = (shopId: string) =>
  client.get(base(shopId)).then((r) => r.data.data as Product[]);

export const getProduct = (shopId: string, id: string) =>
  client.get(`${base(shopId)}/${id}`).then((r) => r.data.data as Product);

export const createProduct = (shopId: string, dto: ProductDto & { name: string; price: number }) =>
  client.post(base(shopId), dto).then((r) => r.data.data as Product);

export const updateProduct = (shopId: string, id: string, dto: ProductDto) =>
  client.patch(`${base(shopId)}/${id}`, dto).then((r) => r.data.data as Product);

export const deleteProduct = (shopId: string, id: string) =>
  client.delete(`${base(shopId)}/${id}`).then(() => undefined);

/** A new photo, or (file null) a new crop of the stored one. */
export const setProductPhoto = (shopId: string, id: string, file: File | null, crop: PhotoCrop) =>
  putPhoto<Product>(`${base(shopId)}/${id}/photo`, file, crop);

export const removeProductPhoto = (shopId: string, id: string) =>
  deletePhoto<Product>(`${base(shopId)}/${id}/photo`);
