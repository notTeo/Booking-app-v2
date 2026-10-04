import type { ShopRole } from '../api/shop.api';

/** The owner and managers run the shop; only the owner can delete or transfer it. */
export const canManageShop = (role: ShopRole | undefined) => role === 'owner' || role === 'manager';

/** Badge variant for a role, wherever one is shown. */
export const ROLE_BADGE: Record<ShopRole, string> = {
  owner: 'badge--accent',
  manager: 'badge--info',
  staff: 'badge--neutral',
};
