import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { LoginDto, RegisterDto } from '../types/auth.types';
import { logger } from '../utils/logger';
import { generateRandomToken, getEmailTokenExpiry, getPasswordResetTokenExpiry, getRefreshTokenExpiry, signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { randomUUID } from 'crypto';
import { sendEmailChangeVerification, sendPasswordResetEmail, sendVerificationEmail } from './email.service';

export const registerUser = async ({ name, email, password }: RegisterDto) => {
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
      name,
      email,
      passwordHash,
      token,
      expiresAt: getEmailTokenExpiry(),
    },
  });


  await sendVerificationEmail(email, token, name);

  logger.info(`Pending registration created for: ${email}`);
};

export const registerUserWithInvite = async (
  { name, email, password }: RegisterDto,
  plainToken: string,
) => {
  const tokenHash = crypto.createHash('sha256').update(plainToken).digest('hex');

  const invite = await prisma.shopInvite.findUnique({
    where: { tokenHash },
    include: { shop: { select: { id: true, name: true, slug: true } } },
  });

  if (!invite) throw new AppError(400, 'Invalid invite token');
  if (invite.status !== 'pending') throw new AppError(400, 'Invite already used');
  if (invite.expiresAt < new Date()) throw new AppError(400, 'Invite has expired');
  if (invite.email.toLowerCase() !== email.toLowerCase())
    throw new AppError(400, 'Email does not match the invite');

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser)
    throw new AppError(409, 'Email already in use — please log in and accept the invite');

  const passwordHash = await bcrypt.hash(password, 12);
  const family = randomUUID();

  const accessToken = signAccessToken('placeholder'); // replaced in transaction
  let finalAccessToken = accessToken;
  let finalRefreshToken = '';
  let createdUser: { id: string; name: string; email: string; isVerified: boolean; createdAt: Date };

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { name, email, passwordHash, isVerified: true },
      select: { id: true, name:true, email: true, isVerified: true, createdAt: true },
    });

    // Link the new login to the placeholder team member this invite grants
    // access to, instead of creating a new membership — the member (and
    // their booking history) already exists from before the invite was sent.
    await tx.userShop.update({
      where: { id: invite.userShopId },
      data: { userId: user.id },
    });

    await tx.shopInvite.update({
      where: { id: invite.id },
      data: { status: 'accepted', acceptedById: user.id },
    });

    const newRefreshToken = signRefreshToken(user.id);
    await tx.refreshToken.create({
      data: {
        token: newRefreshToken,
        family,
        userId: user.id,
        expiresAt: getRefreshTokenExpiry(),
      },
    });

    finalAccessToken = signAccessToken(user.id);
    finalRefreshToken = newRefreshToken;
    createdUser = user;
  });

  logger.info(`User registered via invite: ${email} → shop ${invite.shopId}`);
  return {
    user: createdUser!,
    accessToken: finalAccessToken,
    refreshToken: finalRefreshToken,
    shopSlug: invite.shop!.slug,
  };
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
      name: user.name,
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
      name: pending.name,
      email: pending.email,
      passwordHash: pending.passwordHash,
      isVerified: true,
    },
    select: {
      id: true,
      email: true,
      name:true,
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

  await sendPasswordResetEmail(email, token, user.name);

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

type UpdatedUser = { id: string; name: string | null; email: string; isVerified: boolean; createdAt: Date };

export const updateUser = async (
  userId: string,
  data: { email?: string; password?: string; name?: string },
): Promise<{ user: UpdatedUser } | { message: string } | { user: UpdatedUser; message: string }> => {
  // Name and password apply immediately, in one update; email goes through a
  // pending verification instead, so it's handled separately below.
  const immediateChanges: { name?: string; passwordHash?: string } = {};
  if (data.name) immediateChanges.name = data.name;
  if (data.password) immediateChanges.passwordHash = await bcrypt.hash(data.password, 12);
  const hasImmediateChanges = Object.keys(immediateChanges).length > 0;

  let message: string | undefined;

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
    message = 'Verification email sent to your new address';
  }

  if (data.password) {
    await prisma.refreshToken.deleteMany({ where: { userId } });
    logger.info(`Password updated for userId: ${userId}`);
  }
  if (data.name) {
    logger.info(`Name updated for userId: ${userId}`);
  }

  // Email-only change (the original single-field contract): no immediate
  // column changed, so return just the verification message, no user.
  if (!hasImmediateChanges) {
    if (message) return { message };
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true, name: true, email: true, isVerified: true, createdAt: true },
    });
    return { user };
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: immediateChanges,
    select: { id: true, name: true, email: true, isVerified: true, createdAt: true },
  });

  return message ? { user, message } : { user };
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
    if (!password) throw new AppError(401, 'Invalid password');
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

  await sendVerificationEmail(email, token, pending.name);

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