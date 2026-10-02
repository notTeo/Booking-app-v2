import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { canViewCustomerDetails, requireShopAccess } from '../utils/shopAccess';

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

export interface UpdateShopDto {
  name?: string;
  description?: string;
  phone?: string;
  formattedAddress?: string;
  timezone?: string;
  maxAdvanceDays?: number;
  slotIntervalMinutes?: number;
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
  'slotIntervalMinutes',
] as const;
// slug is deliberately absent: it is immutable after creation.
const UPDATE_FIELDS = [
  'name',
  'description',
  'phone',
  'formattedAddress',
  'timezone',
  'maxAdvanceDays',
  'slotIntervalMinutes',
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

// What a shop response says about the caller's own membership: their role,
// and whether they may see customer contact details (owners always may).
const memberView = (m: { role: string; canViewCustomerDetails: boolean }) => ({
  role: m.role,
  canViewCustomerDetails: canViewCustomerDetails(m),
});

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
  return { ...shop, ...memberView(shop.members[0]) };
};

export const getMyShops = async (userId: string) => {
  const memberships = await prisma.userShop.findMany({
    where: { userId, active: true },
    include: { shop: true },
  });

  return memberships.map(({ shop, ...m }) => ({ ...shop, ...memberView(m) }));
};

export const getShopById = async (userId: string, shopId: string) => {
  const membership = await requireShopAccess(userId, shopId);
  const shop = await prisma.shop.findUniqueOrThrow({ where: { id: shopId } });

  return { ...shop, ...memberView(membership) };
};

export const updateShop = async (
  userId: string,
  shopId: string,
  dto: UpdateShopDto,
) => {
  const membership = await requireShopAccess(userId, shopId, {
    role: 'owner',
    ownerMessage: 'Only the shop owner can update this shop',
  });

  const shop = await prisma.shop.update({
    where: { id: shopId },
    data: pick(dto, UPDATE_FIELDS),
  });

  logger.info(`Shop updated: ${shop.id} by user ${userId}`);
  return { ...shop, ...memberView(membership) };
};

export const deleteShop = async (userId: string, shopId: string) => {
  await requireShopAccess(userId, shopId, {
    role: 'owner',
    ownerMessage: 'Only the shop owner can delete this shop',
  });

  await prisma.shop.delete({ where: { id: shopId } });

  logger.info(`Shop deleted: ${shopId} by user ${userId}`);
};
