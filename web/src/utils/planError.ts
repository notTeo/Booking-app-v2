import { PLAN_NAMES } from '../config/pricing';
import type { ShopPlan } from '../api/shop.api';

interface PlanStrings {
  staffLimitReached: string;
  featureNotInPlan: string;
  locked: string;
}

/** "The Team plan allows 5 bookable staff…" for a shop at its limit. */
export const staffLimitText = (s: PlanStrings, plan: ShopPlan, staffLimit: number) =>
  s.staffLimitReached.replace('{plan}', PLAN_NAMES[plan]).replace('{n}', String(staffLimit));

export const featureNotInPlanText = (s: PlanStrings, plan: ShopPlan) =>
  s.featureNotInPlan.replace('{plan}', PLAN_NAMES[plan]);

/**
 * The message for a request the shop's plan refused (staff limit, a feature
 * the plan lacks, or a locked shop), or undefined for any other error.
 */
export const planErrorMessage = (err: unknown, s: PlanStrings): string | undefined => {
  const data = (err as { response?: { data?: { code?: string; plan?: ShopPlan; staffLimit?: number } } } | null | undefined)
    ?.response?.data;
  if (!data) return undefined;
  if (data.code === 'PLAN_STAFF_LIMIT' && data.plan && data.staffLimit !== undefined)
    return staffLimitText(s, data.plan, data.staffLimit);
  if (data.code === 'PLAN_FEATURE' && data.plan) return featureNotInPlanText(s, data.plan);
  if (data.code === 'SHOP_LOCKED') return s.locked;
  return undefined;
};
