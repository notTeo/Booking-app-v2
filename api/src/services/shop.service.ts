import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

export interface CreateShopDto {
  name: string;
  slug: string;
  description?: string;
  phone?: string;
  formattedAddress?: string;
  timezone?: string;
  maxAdvanceDays?: number;
}

export interface UpdateShopDto {
  name?: string;
  description?: string;
  phone?: string;
  formattedAddress?: string;
  timezone?: string;
  maxAdvanceDays?: number;
  isActive?: boolean;
}

// Explicit whitelists: request bodies are never spread into Prisma calls, so
// clients can't set columns (id, createdAt, isActive on create) or smuggle
// nested relation writes (members/services/...) through extra fields.
const CREATE_FIELDS = [
  'name',
  'slug',
  'description',
  'phone',
  'formattedAddress',
  'timezone',
  'maxAdvanceDays',
] as const;
// slug is deliberately absent: it is immutable after creation.
const UPDATE_FIELDS = [
  'name',
  'description',
  'phone',
  'formattedAddress',
  'timezone',
  'maxAdvanceDays',
  'isActive',
] as const;

const pick = <T extends object, K extends keyof T>(
  source: T,
  keys: readonly K[],
): Pick<T, K> => {
  const out = {} as Pick<T, K>;
  for (const key of keys) {
    if (source[key] !== undefined) out[key] = source[key];
  }
  return out;
};

export const createShop = async (userId: string, dto: CreateShopDto) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isPro: true, name: true, email: true },
  });
  if (!user?.isPro) {
    throw new AppError(403, 'Creating a shop requires a Pro account.');
  }

  const existing = await prisma.shop.findUnique({ where: { slug: dto.slug } });
  if (existing) throw new AppError(409, 'A shop with this slug already exists');

  const shop = await prisma.shop.create({
    data: {
      ...pick(dto, CREATE_FIELDS),
      members: {
        create: { userId, role: 'owner', name: user.name, email: user.email },
      },
    },
    include: { members: { where: { userId } } },
  });

  logger.info(`Shop created: ${shop.id} by user ${userId}`);
  return { ...shop, role: shop.members[0].role };
};

export const getMyShops = async (userId: string) => {
  const memberships = await prisma.userShop.findMany({
    where: { userId, active: true },
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

export const updateShop = async (
  userId: string,
  shopId: string,
  dto: UpdateShopDto,
) => {
  const membership = await prisma.userShop.findUnique({
    where: { userId_shopId: { userId, shopId } },
  });

  if (!membership) throw new AppError(404, 'Shop not found');
  if (membership.role !== 'owner')
    throw new AppError(403, 'Only the shop owner can update this shop');

  const shop = await prisma.shop.update({
    where: { id: shopId },
    data: pick(dto, UPDATE_FIELDS),
  });

  logger.info(`Shop updated: ${shop.id} by user ${userId}`);
  return { ...shop, role: membership.role };
};

export const deleteShop = async (userId: string, shopId: string) => {
  const membership = await prisma.userShop.findUnique({
    where: { userId_shopId: { userId, shopId } },
  });

  if (!membership) throw new AppError(404, 'Shop not found');
  if (membership.role !== 'owner')
    throw new AppError(403, 'Only the shop owner can delete this shop');

  await prisma.shop.delete({ where: { id: shopId } });

  logger.info(`Shop deleted: ${shopId} by user ${userId}`);
};
