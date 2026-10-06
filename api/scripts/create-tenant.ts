// Admin-only: create a customer tenant (verified owner + active shop + owner
// membership). Run where DATABASE_URL points at the target database, e.g.
//   railway run npm run tenant:create -- --owner-name "Maria K" \
//     --owner-email maria@example.com --shop-name "Maria's Salon" --slug marias-salon
// The password comes from TENANT_PASSWORD (keeps it out of shell history) or is
// generated and printed once. The owner can change it via "Forgot password".
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { parseArgs } from 'util';
import { createTenant } from '../src/admin/createTenant';
import { prisma } from '../src/utils/prisma';

const USAGE =
  'Usage: npm run tenant:create -- --owner-name <n> --owner-email <e> --shop-name <n> --slug <s> [--timezone Europe/Athens] [--plan solo|team|business]';

async function main() {
  const { values } = parseArgs({
    options: {
      'owner-name': { type: 'string' },
      'owner-email': { type: 'string' },
      'shop-name': { type: 'string' },
      slug: { type: 'string' },
      timezone: { type: 'string' },
      plan: { type: 'string' },
    },
  });
  const {
    'owner-name': ownerName,
    'owner-email': ownerEmail,
    'shop-name': shopName,
    slug,
  } = values;
  if (!ownerName || !ownerEmail || !shopName || !slug) {
    throw new Error(USAGE);
  }
  const plan = values.plan?.toUpperCase();
  if (plan && plan !== 'SOLO' && plan !== 'TEAM' && plan !== 'BUSINESS') {
    throw new Error(USAGE);
  }

  const r = await createTenant({
    ownerName,
    ownerEmail,
    shopName,
    slug,
    timezone: values.timezone,
    plan,
    password: process.env.TENANT_PASSWORD || undefined,
  });

  console.log('Tenant created');
  console.log('  shop:        ', r.shop.name, `(/${r.shop.slug})`);
  console.log('  plan:        ', r.shop.plan);
  console.log('  owner email: ', r.user.email);
  if (r.generatedPassword) {
    console.log(
      '  password:    ',
      r.generatedPassword,
      ' <- shown once, share it securely',
    );
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e instanceof Error ? e.message : e);
    await prisma.$disconnect();
    process.exit(1);
  });
