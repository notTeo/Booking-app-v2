import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';
import { signAccessToken, signRefreshToken, getRefreshTokenExpiry } from '../utils/jwt';
import { randomUUID } from 'crypto';

export const handleGoogleAuth = async (
  googleId: string,
  email: string,
  ) => {
  let user = await prisma.user.findUnique({
    where: { googleId },
  });

  if (!user) {
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      user = await prisma.user.update({
        where: { email },
        data: { googleId, isVerified: true },
      });
      logger.info(`Google account linked to existing user: ${email}`);
    } else {
      user = await prisma.user.create({
        data: {
          email,
          googleId,
          isVerified: true,
        },
      });
      logger.info(`New user created via Google OAuth: ${email}`);
    }
  }

  const accessToken = signAccessToken(user.id);
  const refreshToken = signRefreshToken(user.id);

  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      family: randomUUID(),
      userId: user.id,
      expiresAt: getRefreshTokenExpiry(),
    },
  });

  return { user, accessToken, refreshToken };
};