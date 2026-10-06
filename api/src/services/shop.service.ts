import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import {
  canEditShopSettings,
  canManageManagers,
  canViewCustomerDetails,
  requireShopAccess,
} from '../utils/shopAccess';
import { planView, trialEndFrom, TRIAL_PLAN } from './plan.service';

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
  customerRescheduleEnabled?: boolean;
  cancelCutoffHours?: number;
  rescheduleCutoffHours?: number;
  reminderEnabled?: boolean;
  reminderHoursBefore?: number;
  publicPalette?: string;
  publicFont?: string;
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
  'customerRescheduleEnabled',
  'cancelCutoffHours',
  'rescheduleCutoffHours',
  'reminderEnabled',
  'reminderHoursBefore',
  'publicPalette',
  'publicFont',
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

// What a shop response says about the caller's own membership: their role
// and what it lets them do here (the owner always may do all of it).
const memberView = (m: {
  role: string;
  canViewCustomerDetails: boolean;
  canManageManagers: boolean;
  canEditShopSettings: boolean;
}) => ({
  role: m.role,
  canViewCustomerDetails: canViewCustomerDetails(m),
  canManageManagers: canManageManagers(m),
  canEditShopSettings: canEditShopSettings(m),
});

export const createShop = async (userId: string, dto: CreateShopDto) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true, trialUsedAt: true },
  });
  if (!user) throw new AppError(404, 'User not found');

  const existing = await prisma.shop.findUnique({ where: { slug: dto.slug } });
  if (existing) throw new AppError(409, 'A shop with this slug already exists');

  // Only a user's first shop gets the free trial; later ones wait, inactive,
  // until a plan is set for them.
  const now = new Date();
  const trial = !user.trialUsedAt;
  const [shop] = await prisma.$transaction([
    prisma.shop.create({
      data: {
        ...pick(dto, CREATE_FIELDS),
        plan: TRIAL_PLAN,
        subscriptionStatus: trial ? 'TRIALING' : 'INACTIVE',
        trialEndsAt: trial ? trialEndFrom(now) : null,
        members: {
          create: { userId, role: 'owner', name: user.name, email: user.email },
        },
      },
      include: { members: { where: { userId } } },
    }),
    ...(trial
      ? [
          prisma.user.update({
            where: { id: userId },
            data: { trialUsedAt: now },
          }),
        ]
      : []),
  ]);

  logger.info(`Shop created: ${shop.id} by user ${userId}`);
  return { ...shop, ...planView(shop), ...memberView(shop.members[0]) };
};

export const getMyShops = async (userId: string) => {
  const memberships = await prisma.userShop.findMany({
    where: { userId, active: true },
    include: { shop: true },
  });

  return memberships.map(({ shop, ...m }) => ({
    ...shop,
    ...planView(shop),
    ...memberView(m),
  }));
};

export const getShopById = async (userId: string, shopId: string) => {
  const membership = await requireShopAccess(userId, shopId);
  const shop = await prisma.shop.findUniqueOrThrow({ where: { id: shopId } });

  return { ...shop, ...planView(shop), ...memberView(membership) };
};

export const updateShop = async (
  userId: string,
  shopId: string,
  dto: UpdateShopDto,
) => {
  const membership = await requireShopAccess(userId, shopId, {
    role: 'manager',
    forbiddenMessage: 'Only the shop owner or a manager can update this shop',
  });

  if (!canEditShopSettings(membership))
    throw new AppError(
      403,
      'The shop owner has not let you edit shop settings',
    );

  // Taking the shop offline (or back online) is the owner's call. The settings
  // form sends isActive on every save, so only an actual change is refused.
  if (dto.isActive !== undefined && membership.role !== 'owner') {
    const current = await prisma.shop.findUnique({
      where: { id: shopId },
      select: { isActive: true },
    });
    if (current && current.isActive !== dto.isActive)
      throw new AppError(
        403,
        'Only the shop owner can activate or deactivate the shop',
      );
  }

  const shop = await prisma.shop.update({
    where: { id: shopId },
    data: pick(dto, UPDATE_FIELDS),
  });

  logger.info(`Shop updated: ${shop.id} by user ${userId}`);
  return { ...shop, ...planView(shop), ...memberView(membership) };
};

export const deleteShop = async (userId: string, shopId: string) => {
  await requireShopAccess(userId, shopId, {
    role: 'owner',
    forbiddenMessage: 'Only the shop owner can delete this shop',
  });

  await prisma.shop.delete({ where: { id: shopId } });

  logger.info(`Shop deleted: ${shopId} by user ${userId}`);
};
