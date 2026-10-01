import type { Prisma } from '../../dist/generated/prisma';
import { AppError } from '../middleware/errorHandler';
import { prisma } from './prisma';

interface ShopAccessOptions {
  // 'owner' additionally requires the owner role (403 for other members).
  role?: 'owner';
  // 403 message when `role: 'owner'` is required but the caller is staff.
  ownerMessage?: string;
  // Run inside a transaction.
  db?: Prisma.TransactionClient | typeof prisma;
}

/**
 * The one rule for shop access: a caller has access to a shop only through a
 * UserShop row for it with `active = true`. Anyone else — a non-member or a
 * deactivated member — gets the same 404, so a shop's existence isn't
 * revealed. 403 is reserved for an active member who lacks the owner role on
 * an owner-only action. Returns the caller's membership.
 */
export const requireShopAccess = async (
  userId: string,
  shopId: string,
  opts: ShopAccessOptions = {},
) => {
  const membership = await (opts.db ?? prisma).userShop.findFirst({
    where: { userId, shopId, active: true },
  });
  if (!membership) throw new AppError(404, 'Shop not found');
  if (opts.role === 'owner' && membership.role !== 'owner')
    throw new AppError(
      403,
      opts.ownerMessage ?? 'Only the shop owner can do this',
    );
  return membership;
};

// Whether a member can see customer contact info — owners always can; staff
// only when their own membership flag allows it.
export const canViewCustomerDetails = (membership: {
  role: string;
  canViewCustomerDetails: boolean;
}) => membership.role === 'owner' || membership.canViewCustomerDetails;
