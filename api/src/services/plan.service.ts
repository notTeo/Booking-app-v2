import type { ShopPlan, SubscriptionStatus } from '../../dist/generated/prisma';
import { AppError } from '../middleware/errorHandler';
import { prisma } from '../utils/prisma';

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

const PLAN_SELECT = {
  plan: true,
  subscriptionStatus: true,
  trialEndsAt: true,
} as const;

const loadPlan = async (shopId: string) => {
  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    select: PLAN_SELECT,
  });
  if (!shop) throw new AppError(404, 'Shop not found');
  return shop;
};

// A member takes one of the plan's staff places while they can be booked.
export const countsAsStaff = (m: {
  active: boolean;
  bookableByCustomers: boolean;
  bookableInternally: boolean;
}) => m.active && (m.bookableByCustomers || m.bookableInternally);

export const countBookableStaff = (shopId: string, exceptMemberId?: string) =>
  prisma.userShop.count({
    where: {
      shopId,
      active: true,
      OR: [{ bookableByCustomers: true }, { bookableInternally: true }],
      ...(exceptMemberId && { id: { not: exceptMemberId } }),
    },
  });

// Refuses one more bookable staff member when the plan's places are taken.
// `exceptMemberId` is the member being edited, so they are not counted twice.
export const assertStaffCapacity = async (
  shopId: string,
  exceptMemberId?: string,
) => {
  const { plan } = await loadPlan(shopId);
  const { staffLimit } = PLAN_LIMITS[plan];
  if ((await countBookableStaff(shopId, exceptMemberId)) >= staffLimit)
    throw new AppError(
      403,
      `This shop's plan allows ${staffLimit} bookable staff. Upgrade the plan to add more.`,
      'PLAN_STAFF_LIMIT',
      undefined,
      { plan, staffLimit },
    );
};

// Login invites and the manager role come with the Team plan and above.
export const assertTeamFeatures = async (shopId: string) => {
  const { plan } = await loadPlan(shopId);
  if (!PLAN_LIMITS[plan].teamFeatures)
    throw new AppError(
      403,
      "This shop's plan does not include team invites or managers. Upgrade the plan to use them.",
      'PLAN_FEATURE',
      undefined,
      { plan },
    );
};

// A shop row without its plan columns, for responses the public can read.
export const withoutPlan = <T extends PlanFields>(
  shop: T,
): Omit<T, keyof PlanFields> => {
  const rest: Partial<T> = { ...shop };
  delete rest.plan;
  delete rest.subscriptionStatus;
  delete rest.trialEndsAt;
  return rest as Omit<T, keyof PlanFields>;
};
