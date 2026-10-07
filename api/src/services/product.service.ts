import { Prisma } from '../../dist/generated/prisma';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { prisma } from '../utils/prisma';
import { canManage, requireShopAccess } from '../utils/shopAccess';
import { assertProductsFeature } from './plan.service';
import { PhotoCrop, storePhoto } from './photo.service';
import { removeStoredFiles } from './storage.service';

export interface ProductDto {
  name?: string;
  description?: string | null;
  price?: number;
  stock?: number;
  supplierUrl?: string | null;
  isActive?: boolean;
}

const MANAGER_ONLY = {
  role: 'manager',
  forbiddenMessage: 'Only the shop owner or a manager can manage products',
} as const;

// Request bodies are never spread into Prisma: only these fields are taken.
const pickFields = (dto: ProductDto) => {
  const out: Prisma.ProductUpdateInput = {};
  if (dto.name !== undefined) out.name = dto.name;
  if (dto.description !== undefined) out.description = dto.description || null;
  if (dto.price !== undefined) out.price = dto.price;
  if (dto.stock !== undefined) out.stock = dto.stock;
  if (dto.supplierUrl !== undefined) out.supplierUrl = dto.supplierUrl || null;
  if (dto.isActive !== undefined) out.isActive = dto.isActive;
  return out;
};

type ProductRow = Awaited<ReturnType<typeof findProduct>>;

// The supplier link is for the owner and managers only; staff see the rest.
const shape = (product: ProductRow, role: string) => {
  const { supplierUrl, ...rest } = product;
  return canManage(role) ? { ...rest, supplierUrl } : rest;
};

async function findProduct(shopId: string, productId: string) {
  const product = await prisma.product.findFirst({
    where: { id: productId, shopId },
  });
  if (!product) throw new AppError(404, 'Product not found');
  return product;
}

export const createProduct = async (
  userId: string,
  shopId: string,
  dto: Required<Pick<ProductDto, 'name' | 'price'>> & ProductDto,
) => {
  const caller = await requireShopAccess(userId, shopId, MANAGER_ONLY);
  await assertProductsFeature(shopId);
  const product = await prisma.product.create({
    data: {
      shopId,
      name: dto.name,
      price: dto.price,
      stock: dto.stock ?? 0,
      description: dto.description || null,
      supplierUrl: dto.supplierUrl || null,
      isActive: dto.isActive ?? true,
    },
  });
  logger.info(`Product created: ${product.id} in shop ${shopId}`);
  return shape(product, caller.role);
};

// Reading stays open after a downgrade, so existing products are not lost
// from view; only creating, editing and reserving need the plan.
export const getProducts = async (userId: string, shopId: string) => {
  const caller = await requireShopAccess(userId, shopId);
  const products = await prisma.product.findMany({
    where: { shopId },
    orderBy: { createdAt: 'asc' },
  });
  return products.map((p) => shape(p, caller.role));
};

export const getProduct = async (
  userId: string,
  shopId: string,
  productId: string,
) => {
  const caller = await requireShopAccess(userId, shopId);
  return shape(await findProduct(shopId, productId), caller.role);
};

export const updateProduct = async (
  userId: string,
  shopId: string,
  productId: string,
  dto: ProductDto,
) => {
  const caller = await requireShopAccess(userId, shopId, MANAGER_ONLY);
  await assertProductsFeature(shopId);
  await findProduct(shopId, productId);
  const product = await prisma.product.update({
    where: { id: productId },
    data: pickFields(dto),
  });
  return shape(product, caller.role);
};

export const deleteProduct = async (
  userId: string,
  shopId: string,
  productId: string,
) => {
  await requireShopAccess(userId, shopId, MANAGER_ONLY);
  const product = await findProduct(shopId, productId);
  // Bookings that reserved it keep their line (name and price), unlinked.
  await prisma.product.delete({ where: { id: productId } });
  await removeStoredFiles([product.photoUrl, product.photoOriginalUrl]);
  logger.info(`Product deleted: ${productId} in shop ${shopId}`);
};

export const setProductPhoto = async (
  userId: string,
  shopId: string,
  productId: string,
  file: Buffer | undefined,
  crop: PhotoCrop,
) => {
  const caller = await requireShopAccess(userId, shopId, MANAGER_ONLY);
  await assertProductsFeature(shopId);
  const current = await findProduct(shopId, productId);
  const { data, stale } = await storePhoto({
    shopId,
    shape: 'square',
    label: 'product',
    file,
    crop,
    current,
  });
  const product = await prisma.product.update({
    where: { id: productId },
    data: { ...data, photoCrop: { ...data.photoCrop } },
  });
  await removeStoredFiles(stale);
  return shape(product, caller.role);
};

export const removeProductPhoto = async (
  userId: string,
  shopId: string,
  productId: string,
) => {
  const caller = await requireShopAccess(userId, shopId, MANAGER_ONLY);
  const current = await findProduct(shopId, productId);
  const product = await prisma.product.update({
    where: { id: productId },
    data: { photoUrl: null, photoOriginalUrl: null, photoCrop: Prisma.DbNull },
  });
  await removeStoredFiles([current.photoUrl, current.photoOriginalUrl]);
  return shape(product, caller.role);
};
