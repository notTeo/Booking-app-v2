import type { ShopPlan } from '../api/shop.api';

// The new-shop flow: Plan and Shop at /shops/new, then these at
// /shops/<slug>/setup. Which setup steps exist depends on the plan.

export const SETUP_STEPS = ['hours', 'services', 'team', 'products', 'share'] as const;
export type SetupStep = (typeof SETUP_STEPS)[number];

/** The setup steps of a shop on a plan with (or without) team features and products. */
export const setupSteps = (plan: { teamFeatures: boolean; products: boolean }): SetupStep[] =>
  SETUP_STEPS.filter((step) => (step === 'team' ? plan.teamFeatures : step === 'products' ? plan.products : true));

/** What each plan has, for what is shown before the API says so (its PLAN_LIMITS). */
export const PLAN_FEATURES: Record<ShopPlan, { staffLimit: number; teamFeatures: boolean; products: boolean }> = {
  SOLO: { staffLimit: 1, teamFeatures: false, products: false },
  TEAM: { staffLimit: 5, teamFeatures: true, products: true },
  BUSINESS: { staffLimit: 15, teamFeatures: true, products: true },
};

/** Smallest to largest: a plan earlier in the list than the shop's is a step down. */
export const PLAN_ORDER: ShopPlan[] = ['SOLO', 'TEAM', 'BUSINESS'];

export const isSetupStep = (value: string | null): value is SetupStep =>
  SETUP_STEPS.includes(value as SetupStep);

const STORAGE_KEY = 'onboarding-plan';

const toPlan = (value: string | null | undefined): ShopPlan | null => {
  const plan = value?.toUpperCase() as ShopPlan | undefined;
  return plan && PLAN_ORDER.includes(plan) ? plan : null;
};

/** Keeps the plan clicked on the marketing site (`?plan=team`) until the shop is created. */
export function rememberPlan(value: string | null) {
  const plan = toPlan(value);
  if (!plan) return;
  try {
    localStorage.setItem(STORAGE_KEY, plan);
  } catch {
    // Private mode or blocked storage: the plan step just starts on Team.
  }
}

/** The plan picked on the marketing site, or Team. */
export function recallPlan(): ShopPlan {
  try {
    return toPlan(localStorage.getItem(STORAGE_KEY)) ?? 'TEAM';
  } catch {
    return 'TEAM';
  }
}

export function forgetPlan() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing was stored.
  }
}

/** A booking link suggested from the shop's name: lowercase a-z, 0-9 and single hyphens, 40 at most. */
export const slugFromName = (name: string): string =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+/, '')
    .slice(0, 40)
    .replace(/-+$/, '');

/** Query key of a shop's setup progress (GET /shops/<id>/setup). */
export const shopSetupKey = (shopId: string | undefined) => ['shop-setup', shopId] as const;
