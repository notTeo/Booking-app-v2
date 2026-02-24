import bcrypt from 'bcrypt';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { LoginDto, RegisterDto } from '../types/auth.types';
import { logger } from '../utils/logger';
import { generateRandomToken, getEmailTokenExpiry, getPasswordResetTokenExpiry, getRefreshTokenExpiry, signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { randomUUID } from 'crypto';
import { sendEmailChangeVerification, sendPasswordResetEmail, sendVerificationEmail } from './email.service';

export const registerUser = async ({ email, password }: RegisterDto) => {
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    logger.warn(`Registration attempt with existing email: ${email}`);
    throw new AppError(409, 'Email already in use');
  }

  const existingPending = await prisma.pendingRegistration.findUnique({
    where: { email },
  });
  if (existingPending) {
    await prisma.pendingRegistration.delete({ where: { email } });
  }

  const passwordHash = await bcrypt.hash(password, 12);


  const token = generateRandomToken();


  await prisma.pendingRegistration.create({
    data: {
      email,
      passwordHash,
      token,
      expiresAt: getEmailTokenExpiry(),
    },
  });


  await sendVerificationEmail(email, token);

  logger.info(`Pending registration created for: ${email}`);
};

export const loginUser = async ({ email, password }: LoginDto) => {
  const user = await prisma.user.findUnique({
    where: {email},
  })

  if(!user){
    logger.warn(`Login attempt with existing email: ${email}`);
    throw new AppError(401, 'Invalid credentials')
  }

  if (!user.passwordHash) {
    // OAuth-only account — no password set
    throw new AppError(401, 'Invalid credentials');
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

  if(!isPasswordValid){
    logger.warn(`Failed login attempt for: ${email}`);
    throw new AppError(401, 'Invalid credentials')
  }

  const accessToken = signAccessToken(user.id);
  const refreshToken = signRefreshToken(user.id);
  const family = randomUUID();

  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      family,
      userId: user.id,
      expiresAt: getRefreshTokenExpiry(),
    },
  });

  logger.info(`User logged in: ${user.email}`);

  return {
    user: {
      id: user.id,
      email: user.email,
      isVerified: user.isVerified,
      createdAt: user.createdAt,
    },
    accessToken,
    refreshToken,
  };
};

export const refreshAccessToken = async (token: string) => {
  let payload: { userId: string };
  try {
    payload = verifyRefreshToken(token);
  } catch {
    throw new AppError(401, 'Invalid refresh token');
  }

  const stored = await prisma.refreshToken.findUnique({
    where: { token },
  });

  if (!stored) {
    // Valid JWT but token not in DB — it was already rotated: reuse attack detected.
    // Invalidate the entire token family to protect the account.
    logger.warn(`Refresh token reuse detected for userId: ${payload.userId}. Invalidating all sessions.`);
    await prisma.refreshToken.deleteMany({
      where: { userId: payload.userId },
    });
    throw new AppError(401, 'Session invalidated. Please log in again.');
  }

  if (stored.expiresAt < new Date()) {
    await prisma.refreshToken.delete({ where: { token } });
    throw new AppError(401, 'Refresh token expired');
  }

  await prisma.refreshToken.delete({ where: { token } });

  const newRefreshToken = signRefreshToken(payload.userId);

  await prisma.refreshToken.create({
    data: {
      token: newRefreshToken,
      family: stored.family,
      userId: payload.userId,
      expiresAt: getRefreshTokenExpiry(),
    },
  });

  const accessToken = signAccessToken(payload.userId);

  logger.info(`Access token refreshed for userId: ${payload.userId}`);

  return { accessToken, newRefreshToken };
}

export const logoutUser = async (token: string) => {
  await prisma.refreshToken.deleteMany({
    where: { token },
  });

  logger.info('User logged out');
};

export const verifyEmail = async (token: string) => {

  const pending = await prisma.pendingRegistration.findUnique({
    where: { token },
  });

  if (!pending) {
    throw new AppError(400, 'Invalid verification token');
  }

  if (pending.expiresAt < new Date()) {
    await prisma.pendingRegistration.delete({ where: { token } });
    throw new AppError(400, 'Verification token expired');
  }

  const user = await prisma.user.create({
    data: {
      email: pending.email,
      passwordHash: pending.passwordHash,
      isVerified: true,
    },
    select: {
      id: true,
      email: true,
      isVerified: true,
      createdAt: true,
    },
  });

  await prisma.pendingRegistration.delete({ where: { token } });

  logger.info(`Email verified and user created: ${user.email}`);
  return user;
};

export const forgotPassword = async (email: string) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    logger.warn(`Password reset attempt for non-existent email: ${email}`);
    return;
  }

  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });

  const token = generateRandomToken();

  await prisma.passwordResetToken.create({
    data: {
      token,
      userId: user.id,
      expiresAt: getPasswordResetTokenExpiry(),
    },
  });

  await sendPasswordResetEmail(email, token);

  logger.info(`Password reset token created for: ${email}`);
};

export const getSessions = async (userId: string) => {
  const sessions = await prisma.refreshToken.findMany({
    where: { userId },
    select: { id: true, family: true, createdAt: true, expiresAt: true },
    orderBy: { createdAt: 'desc' },
  });
  return sessions;
};

export const revokeAllSessions = async (userId: string, currentToken: string) => {
  await prisma.refreshToken.deleteMany({
    where: { userId },
  });
  logger.info(`All sessions revoked for userId: ${userId}`);
};

export const updateUser = async (
  userId: string,
  data: { email?: string; password?: string },
): Promise<{ user: { id: string; email: string; isVerified: boolean; createdAt: Date } } | { message: string }> => {
  // Handle email change — create a pending verification instead of updating directly
  if (data.email) {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing && existing.id !== userId) {
      throw new AppError(409, 'Email already in use');
    }

    const token = generateRandomToken();
    await prisma.pendingEmailChange.upsert({
      where: { userId },
      update: { newEmail: data.email, token, expiresAt: getEmailTokenExpiry() },
      create: { userId, newEmail: data.email, token, expiresAt: getEmailTokenExpiry() },
    });

    await sendEmailChangeVerification(data.email, token);
    logger.info(`Email change verification sent for userId: ${userId}`);
    return { message: 'Verification email sent to your new address' };
  }

  // Handle password change (immediate)
  if (data.password) {
    const passwordHash = await bcrypt.hash(data.password, 12);
    await prisma.refreshToken.deleteMany({ where: { userId } });
    const user = await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
      select: { id: true, email: true, isVerified: true, createdAt: true },
    });
    logger.info(`Password updated for userId: ${userId}`);
    return { user };
  }

  // Nothing to update — return current user
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { id: true, email: true, isVerified: true, createdAt: true },
  });
  return { user };
};

export const verifyEmailChange = async (token: string) => {
  const pending = await prisma.pendingEmailChange.findUnique({ where: { token } });

  if (!pending) {
    throw new AppError(400, 'Invalid verification token');
  }

  if (pending.expiresAt < new Date()) {
    await prisma.pendingEmailChange.delete({ where: { token } });
    throw new AppError(400, 'Verification token expired');
  }

  const user = await prisma.user.update({
    where: { id: pending.userId },
    data: { email: pending.newEmail, isVerified: true },
    select: { id: true, email: true, isVerified: true, createdAt: true },
  });

  await prisma.pendingEmailChange.delete({ where: { token } });

  logger.info(`Email changed for userId: ${pending.userId} → ${pending.newEmail}`);
  return user;
};

export const deleteUser = async (userId: string, password?: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError(404, 'User not found');

  if (user.passwordHash) {
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new AppError(401, 'Invalid password');
  }

  // Delete related records first to avoid FK constraint violations
  await prisma.refreshToken.deleteMany({ where: { userId } });
  await prisma.passwordResetToken.deleteMany({ where: { userId } });

  await prisma.user.delete({ where: { id: userId } });
  logger.info(`User deleted: ${userId}`);
};

export const resendVerificationEmail = async (email: string) => {
  const pending = await prisma.pendingRegistration.findUnique({ where: { email } });

  if (!pending) {
    // Don't reveal whether the email exists or not
    logger.warn(`Resend verification requested for unknown/verified email: ${email}`);
    return;
  }

  const token = generateRandomToken();

  await prisma.pendingRegistration.update({
    where: { email },
    data: {
      token,
      expiresAt: getEmailTokenExpiry(),
    },
  });

  await sendVerificationEmail(email, token);

  logger.info(`Verification email resent to: ${email}`);
};

export const resetPassword = async (token: string, newPassword: string) => {

  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { token },
  });

  if (!resetToken) {
    throw new AppError(400, 'Invalid reset token');
  }

  if (resetToken.used) {
    throw new AppError(400, 'Reset token already used');
  }

  if (resetToken.expiresAt < new Date()) {
    await prisma.passwordResetToken.delete({ where: { token } });
    throw new AppError(400, 'Reset token expired');
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);

  await prisma.user.update({
    where: { id: resetToken.userId },
    data: { passwordHash },
  });

  await prisma.passwordResetToken.update({
    where: { token },
    data: { used: true },
  });

  await prisma.refreshToken.deleteMany({
    where: { userId: resetToken.userId },
  });

  logger.info(`Password reset for userId: ${resetToken.userId}`);
};