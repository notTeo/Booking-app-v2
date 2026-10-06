import { prisma } from '../utils/prisma';
import type { ShopPlan, SubscriptionStatus } from '../../dist/generated/prisma';
import {
  countBookableStaff,
  PLAN_LIMITS,
  TRIAL_DAYS,
} from '../services/plan.service';

export interface SetShopPlanInput {
  slug: string;
  // Omit to keep the shop's current plan (e.g. when only the status changes).
  plan?: ShopPlan;
  // Omit to make the shop ACTIVE.
  status?: SubscriptionStatus;
  // Only for TRIALING: how long the trial runs from now (default TRIAL_DAYS).
  trialDays?: number;
}

// Admin-only: sets a shop's plan and subscription status by hand, until a
// payment provider does it. Refuses a plan with fewer staff places than the
// shop has bookable staff, so nobody ends up over their limit.
export const setShopPlan = async (input: SetShopPlanInput) => {
  const shop = await prisma.shop.findUnique({ where: { slug: input.slug } });
  if (!shop) throw new Error(`No shop with slug "${input.slug}"`);

  const plan = input.plan ?? shop.plan;
  const status = input.status ?? 'ACTIVE';
  if (input.trialDays !== undefined) {
    if (status !== 'TRIALING')
      throw new Error('--trial-days only applies with --status trialing');
    if (!Number.isInteger(input.trialDays) || input.trialDays < 1)
      throw new Error('--trial-days must be a whole number of days, 1 or more');
  }

  const staff = await countBookableStaff(shop.id);
  const { staffLimit } = PLAN_LIMITS[plan];
  if (staff > staffLimit)
    throw new Error(
      `"${shop.slug}" has ${staff} bookable staff but ${plan} allows ${staffLimit}. ` +
        'Deactivate staff (or make them not bookable) first, or pick a larger plan.',
    );

  const trialEndsAt =
    status === 'TRIALING'
      ? new Date(
          Date.now() + (input.trialDays ?? TRIAL_DAYS) * 24 * 60 * 60 * 1000,
        )
      : shop.trialEndsAt;

  const updated = await prisma.shop.update({
    where: { id: shop.id },
    data: { plan, subscriptionStatus: status, trialEndsAt },
  });
  return { shop: updated, previous: shop, bookableStaff: staff };
};
