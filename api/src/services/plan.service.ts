import type { ShopPlan, SubscriptionStatus } from '../../dist/generated/prisma';

// The one place for what each plan allows. The pricing pages in the web app
// describe the same limits (web/src/config/pricing.ts and the translations).
export const PLAN_LIMITS: Record<
  ShopPlan,
  { staffLimit: number; teamFeatures: boolean }
> = {
  SOLO: { staffLimit: 1, teamFeatures: false },
  TEAM: { staffLimit: 5, teamFeatures: true },
  BUSINESS: { staffLimit: 15, teamFeatures: true },
};

// A user's first shop is free for this long, on this plan.
export const TRIAL_DAYS = 30;
export const TRIAL_PLAN: ShopPlan = 'TEAM';

export const trialEndFrom = (now: Date) =>
  new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);

interface PlanFields {
  plan: ShopPlan;
  subscriptionStatus: SubscriptionStatus;
  trialEndsAt: Date | null;
}

// A locked shop is read-only and takes no new public bookings: its trial has
// ended, or its subscription is inactive.
export const isShopLocked = (shop: PlanFields, now = new Date()) =>
  shop.subscriptionStatus === 'INACTIVE' ||
  (shop.subscriptionStatus === 'TRIALING' &&
    (!shop.trialEndsAt || shop.trialEndsAt <= now));

// What a shop response says about its plan, beside the stored columns.
export const planView = (shop: PlanFields) => ({
  locked: isShopLocked(shop),
  ...PLAN_LIMITS[shop.plan],
});
