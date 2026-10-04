import type { Prisma } from '../../dist/generated/prisma';
import { AppError } from '../middleware/errorHandler';
import { prisma } from './prisma';

interface ShopAccessOptions {
  // The lowest role allowed (403 for members below it): 'manager' lets the
  // owner and managers through, 'owner' only the owner.
  role?: 'owner' | 'manager';
  // 403 message when the caller's role is too low.
  forbiddenMessage?: string;
  // Run inside a transaction.
  db?: Prisma.TransactionClient | typeof prisma;
}

// The owner and managers run the shop; the owner alone can delete it or hand
// it over.
export const canManage = (role: string) =>
  role === 'owner' || role === 'manager';

export const MANAGER_ONLY = { role: 'manager' } as const;

/**
 * The one rule for shop access: a caller has access to a shop only through a
 * UserShop row for it with `active = true`. Anyone else — a non-member or a
 * deactivated member — gets the same 404, so a shop's existence isn't
 * revealed. 403 is reserved for an active member whose role is below the one
 * the action needs. Returns the caller's membership.
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
      opts.forbiddenMessage ?? 'Only the shop owner can do this',
    );
  if (opts.role === 'manager' && !canManage(membership.role))
    throw new AppError(
      403,
      opts.forbiddenMessage ?? 'Only the shop owner or a manager can do this',
    );
  return membership;
};

// Whether a member can see customer contact info — the owner and managers
// always can; staff only when their own membership flag allows it.
export const canViewCustomerDetails = (membership: {
  role: string;
  canViewCustomerDetails: boolean;
}) => canManage(membership.role) || membership.canViewCustomerDetails;
