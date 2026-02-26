import { env } from './env';

export const PRICE_TO_PLAN: Record<string, string> = {
  [env.stripe.proPriceId]: 'pro',
};

export const PLAN_FEATURES = {
  CREATE_SHOP:        ['pro', 'business'],
  CUSTOM_DOMAIN:      ['business'],
  ADVANCED_ANALYTICS: ['business'],
} as const;

export type Feature = keyof typeof PLAN_FEATURES;
