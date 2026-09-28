import { prisma } from '../utils/prisma';

// Booking rules reject past times, and tests use fixed future dates, so the
// clock is frozen (Date only — timers and I/O keep running) at a known
// instant. Individual tests may override with vi.setSystemTime.
export const TEST_NOW = new Date('2026-12-01T09:00:00.000Z');

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'], now: TEST_NOW });
});

// Clean up test data after each test
afterEach(async () => {
  vi.useRealTimers();
  await prisma.refreshToken.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.emailVerificationToken.deleteMany();
  await prisma.pendingRegistration.deleteMany();
  await prisma.pendingEmailChange.deleteMany();
  await prisma.shop.deleteMany();
  await prisma.user.deleteMany();
});

// Disconnect Prisma after all tests
afterAll(async () => {
  await prisma.$disconnect();
});
