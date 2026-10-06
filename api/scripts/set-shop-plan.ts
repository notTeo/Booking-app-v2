// Admin-only: set a shop's plan and subscription status by hand. Run where
// DATABASE_URL points at the target database, e.g.
//   railway run npm run shop:plan -- --slug marias-salon --plan team
//   npm run shop:plan -- --slug marias-salon --status inactive
//   npm run shop:plan -- --slug marias-salon --status trialing --trial-days 14
// Without --status the shop becomes active; without --plan it keeps its plan.
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { parseArgs } from 'util';
import { setShopPlan } from '../src/admin/setShopPlan';
import { prisma } from '../src/utils/prisma';

const USAGE =
  'Usage: npm run shop:plan -- --slug <s> [--plan solo|team|business] [--status active|inactive|trialing] [--trial-days N]';

const PLANS = ['SOLO', 'TEAM', 'BUSINESS'] as const;
const STATUSES = ['ACTIVE', 'INACTIVE', 'TRIALING'] as const;

const oneOf = <T extends string>(
  value: string | undefined,
  allowed: readonly T[],
): T | undefined => {
  if (value === undefined) return undefined;
  const upper = value.toUpperCase() as T;
  if (!allowed.includes(upper)) throw new Error(USAGE);
  return upper;
};

async function main() {
  const { values } = parseArgs({
    options: {
      slug: { type: 'string' },
      plan: { type: 'string' },
      status: { type: 'string' },
      'trial-days': { type: 'string' },
    },
  });
  if (!values.slug || (!values.plan && !values.status)) throw new Error(USAGE);

  const r = await setShopPlan({
    slug: values.slug,
    plan: oneOf(values.plan, PLANS),
    status: oneOf(values.status, STATUSES),
    trialDays:
      values['trial-days'] === undefined
        ? undefined
        : Number(values['trial-days']),
  });

  console.log(`Shop /${r.shop.slug} (${r.shop.name})`);
  console.log(
    '  plan:          ',
    r.previous.plan,
    '->',
    r.shop.plan,
  );
  console.log(
    '  status:        ',
    r.previous.subscriptionStatus,
    '->',
    r.shop.subscriptionStatus,
  );
  if (r.shop.subscriptionStatus === 'TRIALING')
    console.log('  trial ends:    ', r.shop.trialEndsAt?.toISOString());
  console.log('  bookable staff:', r.bookableStaff);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e instanceof Error ? e.message : e);
    await prisma.$disconnect();
    process.exit(1);
  });
