import { prisma } from './prisma';
import { logger } from './logger';

export const cleanupExpiredTokens = async () => {
  const now = new Date();

  const [refreshTokens, pendingRegistrations, passwordResetTokens] = await Promise.all([
    prisma.refreshToken.deleteMany({ where: { expiresAt: { lt: now } } }),
    prisma.pendingRegistration.deleteMany({ where: { expiresAt: { lt: now } } }),
    prisma.passwordResetToken.deleteMany({ where: { expiresAt: { lt: now } } }),
  ]);

  logger.info(
    `Cleanup: removed ${refreshTokens.count} refresh tokens, ` +
    `${pendingRegistrations.count} pending registrations, ` +
    `${passwordResetTokens.count} password reset tokens`,
  );
};

// Run every 6 hours
export const startCleanupJob = () => {
  const INTERVAL_MS = 6 * 60 * 60 * 1000;

  // Run once on startup, then on interval
  cleanupExpiredTokens().catch((err) => logger.error(err, 'Cleanup job failed'));

  setInterval(() => {
    cleanupExpiredTokens().catch((err) => logger.error(err, 'Cleanup job failed'));
  }, INTERVAL_MS);

  logger.info('Token cleanup job started (runs every 6 hours)');
};
