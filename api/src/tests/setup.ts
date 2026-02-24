import { prisma } from '../utils/prisma';

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
