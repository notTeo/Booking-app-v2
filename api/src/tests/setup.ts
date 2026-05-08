import { prisma } from '../utils/prisma';

// Ensure plan seed rows exist before any test runs
beforeAll(async () => {
  await prisma.plan.upsert({
    where: { name: 'free' },
    update: {},
    create: {
      id: 'cm_plan_free_bookly_2026',
      name: 'free',
      displayName: 'Free',
      features: { CREATE_SHOP: false, MAX_STAFF: 1, MAX_BOOKINGS_PER_MONTH: 30, SMS_REMINDERS: false, ADVANCED_ANALYTICS: false },
      isActive: true,
      sortOrder: 0,
    },
  });
  await prisma.plan.upsert({
    where: { name: 'pro' },
    update: {},
    create: {
      id: 'cm_plan_pro_bookly_2026_',
      name: 'pro',
      displayName: 'Pro',
      features: { CREATE_SHOP: true, MAX_STAFF: 10, MAX_BOOKINGS_PER_MONTH: null, SMS_REMINDERS: true, ADVANCED_ANALYTICS: false },
      isActive: true,
      sortOrder: 1,
    },
  });
});

// Clean up test data after each test
afterEach(async () => {
  await prisma.refreshToken.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.emailVerificationToken.deleteMany();
  await prisma.pendingRegistration.deleteMany();
  await prisma.pendingEmailChange.deleteMany();
  await prisma.user.deleteMany();
});

// Disconnect Prisma after all tests
afterAll(async () => {
  await prisma.$disconnect();
});
