import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

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

export interface UpdateShopDto {
  name?: string;
  slug?: string;
  description?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  timezone?: string;
  isActive?: boolean;
}

export const createShop = async (userId: string, dto: CreateShopDto) => {
  const existing = await prisma.shop.findUnique({ where: { slug: dto.slug } });
  if (existing) throw new AppError(409, 'A shop with this slug already exists');

  const shop = await prisma.shop.create({
    data: {
      ...dto,
      members: {
        create: { userId, role: 'owner' },
      },
    },
    include: { members: { where: { userId } } },
  });

  logger.info(`Shop created: ${shop.id} by user ${userId}`);
  return { ...shop, role: shop.members[0].role };
};

export const getMyShops = async (userId: string) => {
  const memberships = await prisma.userShop.findMany({
    where: { userId },
    include: { shop: true },
  });

  return memberships.map(({ shop, role }) => ({ ...shop, role }));
};

export const getShopById = async (userId: string, shopId: string) => {
  const membership = await prisma.userShop.findUnique({
    where: { userId_shopId: { userId, shopId } },
    include: { shop: true },
  });

  if (!membership) throw new AppError(404, 'Shop not found');

  return { ...membership.shop, role: membership.role };
};

export const updateShop = async (userId: string, shopId: string, dto: UpdateShopDto) => {
  const membership = await prisma.userShop.findUnique({
    where: { userId_shopId: { userId, shopId } },
  });

  if (!membership) throw new AppError(404, 'Shop not found');
  if (membership.role !== 'owner') throw new AppError(403, 'Only the shop owner can update this shop');

  if (dto.slug) {
    const existing = await prisma.shop.findFirst({
      where: { slug: dto.slug, NOT: { id: shopId } },
    });
    if (existing) throw new AppError(409, 'A shop with this slug already exists');
  }

  const shop = await prisma.shop.update({
    where: { id: shopId },
    data: dto,
  });

  logger.info(`Shop updated: ${shop.id} by user ${userId}`);
  return { ...shop, role: membership.role };
};

export const deleteShop = async (userId: string, shopId: string) => {
  const membership = await prisma.userShop.findUnique({
    where: { userId_shopId: { userId, shopId } },
  });

  if (!membership) throw new AppError(404, 'Shop not found');
  if (membership.role !== 'owner') throw new AppError(403, 'Only the shop owner can delete this shop');

  await prisma.shop.delete({ where: { id: shopId } });

  logger.info(`Shop deleted: ${shopId} by user ${userId}`);
};
