/** Monthly plan prices in euro, per shop, excluding VAT. */
export const PLAN_PRICES = { solo: 19, team: 35, business: 59 } as const;

/** Paying for a year costs this many months fewer than twelve. */
export const YEARLY_FREE_MONTHS = 2;

/** A plan's price for a whole year, in euro, excluding VAT. */
export const yearlyPrice = (monthly: number) => monthly * (12 - YEARLY_FREE_MONTHS);

/** Plan names as shown everywhere; they are not translated. */
export const PLAN_NAMES = { SOLO: 'Solo', TEAM: 'Team', BUSINESS: 'Business' } as const;
