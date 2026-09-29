// Creates the Hairology tenant from api/src/admin/hairologyData.ts. Safe on
// production: it only creates, refuses if the shop exists, and adds no demo
// data. Needs HAIROLOGY_OWNER_NAME and HAIROLOGY_OWNER_EMAIL; the password is
// HAIROLOGY_OWNER_PASSWORD or generated and printed once.
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { seedHairology } from '../src/admin/seedHairology';
import { prisma } from '../src/utils/prisma';

async function main() {
  const ownerName = process.env.HAIROLOGY_OWNER_NAME;
  const ownerEmail = process.env.HAIROLOGY_OWNER_EMAIL;
  if (!ownerName || !ownerEmail) {
    throw new Error('Set HAIROLOGY_OWNER_NAME and HAIROLOGY_OWNER_EMAIL.');
  }
  const r = await seedHairology({
    ownerName,
    ownerEmail,
    password: process.env.HAIROLOGY_OWNER_PASSWORD || undefined,
  });
  console.log(
    `Hairology created: /${r.shop.slug}, ${r.services.length} services, ${r.staffCount} team member(s)`,
  );
  console.log('  owner email:', r.user.email);
  if (r.generatedPassword) {
    console.log(
      '  password:   ',
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
