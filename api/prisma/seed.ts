import { PrismaClient } from '../dist/generated/prisma';
import { PrismaPg } from '@prisma/adapter-pg';
import dotenv from 'dotenv';

dotenv.config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const freePlan = await prisma.plan.upsert({
    where: { name: 'free' },
    update: {}, // intentional: re-runs do not overwrite; update features manually or via migration
    create: {
      id: 'cm_plan_free_bookly_2026',
      name: 'free',
      displayName: 'Free',
      description: 'Get started with basic booking features.',
      features: {
        CREATE_SHOP: false,
        MAX_STAFF: 1,
        MAX_BOOKINGS_PER_MONTH: 30,
        SMS_REMINDERS: false,
        ADVANCED_ANALYTICS: false,
      },
      isActive: true,
      sortOrder: 0,
    },
  });

  const proPlan = await prisma.plan.upsert({
    where: { name: 'pro' },
    update: {}, // intentional: re-runs do not overwrite; update features manually or via migration
    create: {
      id: 'cm_plan_pro_bookly_2026_',
      name: 'pro',
      displayName: 'Pro',
      description: 'Full access for growing businesses.',
      features: {
        CREATE_SHOP: true,
        MAX_STAFF: 10,
        MAX_BOOKINGS_PER_MONTH: null,
        SMS_REMINDERS: true,
        ADVANCED_ANALYTICS: false,
      },
      isActive: true,
      sortOrder: 1,
    },
  });

  console.log('Seeded plans:', freePlan.name, proPlan.name);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
