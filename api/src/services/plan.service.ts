import type { ShopPlan, SubscriptionStatus } from '../../dist/generated/prisma';
import { AppError } from '../middleware/errorHandler';
import { prisma } from '../utils/prisma';

// The one place for what each plan allows. The pricing pages in the web app
// describe the same limits (web/src/config/pricing.ts and the translations).
export const PLAN_LIMITS: Record<
  ShopPlan,
  { staffLimit: number; teamFeatures: boolean; products: boolean }
> = {
  SOLO: { staffLimit: 1, teamFeatures: false, products: false },
  TEAM: { staffLimit: 5, teamFeatures: true, products: true },
  BUSINESS: { staffLimit: 15, teamFeatures: true, products: true },
};

export const PLANS = Object.keys(PLAN_LIMITS) as ShopPlan[];

// A user's first shop is free for this long, on the plan they picked for it.
export const TRIAL_DAYS = 30;
// The plan of a shop created without one.
export const DEFAULT_PLAN: ShopPlan = 'TEAM';

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

// Products (listing them, reserving them with a booking) are on the Team and
// Business plans.
export const assertProductsFeature = async (
  shopId: string,
  db: Pick<typeof prisma, 'shop'> = prisma,
) => {
  const shop = await db.shop.findUnique({
    where: { id: shopId },
    select: PLAN_SELECT,
  });
  if (!shop) throw new AppError(404, 'Shop not found');
  if (!PLAN_LIMITS[shop.plan].products)
    throw new AppError(
      403,
      "This shop's plan does not include products. Upgrade the plan to use them.",
      'PLAN_FEATURE',
      undefined,
      { plan: shop.plan },
    );
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

// An owner may switch plan while the shop's free trial runs; after it, a plan
// is set by hand (admin/setShopPlan) until a payment provider does it.
// A smaller plan switches off what it does not include and deletes nothing:
// bookable staff beyond its places are deactivated (the owner stays, then the
// longest-standing members), and so are the products when it has none.
export const changeShopPlan = async (shopId: string, plan: ShopPlan) => {
  const current = await loadPlan(shopId);
  if (current.subscriptionStatus !== 'TRIALING' || isShopLocked(current))
    throw new AppError(
      409,
      "The plan can only be changed during the shop's free trial. Contact us to change it.",
      'PLAN_CHANGE_UNAVAILABLE',
      undefined,
      { plan: current.plan },
    );

  const limits = PLAN_LIMITS[plan];
  return prisma.$transaction(async (tx) => {
    const bookable = await tx.userShop.findMany({
      where: {
        shopId,
        active: true,
        OR: [{ bookableByCustomers: true }, { bookableInternally: true }],
      },
      select: { id: true, role: true },
      orderBy: { createdAt: 'asc' },
    });
    const kept = [
      ...bookable.filter((m) => m.role === 'owner'),
      ...bookable.filter((m) => m.role !== 'owner'),
    ].slice(0, limits.staffLimit);
    const extra = bookable.filter((m) => !kept.includes(m)).map((m) => m.id);
    if (extra.length)
      await tx.userShop.updateMany({
        where: { id: { in: extra } },
        data: { active: false },
      });

    if (!limits.products)
      await tx.product.updateMany({
        where: { shopId, isActive: true },
        data: { isActive: false },
      });

    return tx.shop.update({ where: { id: shopId }, data: { plan } });
  });
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
