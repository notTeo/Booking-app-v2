import { currentLocale } from '../utils/locale';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { LoginDto, RegisterDto } from '../types/auth.types';
import { logger } from '../utils/logger';
import {
  generateRandomToken,
  getEmailTokenExpiry,
  getPasswordResetTokenExpiry,
  getRefreshTokenExpiry,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../utils/jwt';
import { randomUUID } from 'crypto';
import { TERMS_VERSION } from '../config/terms';
import { USER_SELECT, toUserDto, type UserDto } from '../utils/userDto';
import {
  sendEmailChangeVerification,
  sendPasswordResetEmail,
  sendVerificationEmail,
} from './email.service';

export const registerUser = async ({ name, email, password }: RegisterDto) => {
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    logger.warn('Registration attempt with existing email');
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
      termsVersion: TERMS_VERSION,
      termsAcceptedAt: new Date(),
      expiresAt: getEmailTokenExpiry(),
    },
  });

  await sendVerificationEmail(email, token, name);

  logger.info('Pending registration created');
};

export const registerUserWithInvite = async (
  { name, email, password }: RegisterDto,
  plainToken: string,
) => {
  const tokenHash = crypto
    .createHash('sha256')
    .update(plainToken)
    .digest('hex');

  const invite = await prisma.shopInvite.findUnique({
    where: { tokenHash },
    include: { shop: { select: { id: true, name: true, slug: true } } },
  });

  if (!invite) throw new AppError(400, 'Invalid invite token');
  if (invite.status !== 'pending')
    throw new AppError(400, 'Invite already used');
  if (invite.expiresAt < new Date())
    throw new AppError(400, 'Invite has expired');
  if (invite.email.toLowerCase() !== email.toLowerCase())
    throw new AppError(400, 'Email does not match the invite');

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser)
    throw new AppError(
      409,
      'Email already in use — please log in and accept the invite',
    );

  const passwordHash = await bcrypt.hash(password, 12);
  const family = randomUUID();

  const accessToken = signAccessToken('placeholder'); // replaced in transaction
  let finalAccessToken = accessToken;
  let finalRefreshToken = '';
  let createdUser: UserDto;

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name,
        email,
        passwordHash,
        isVerified: true,
        termsVersion: TERMS_VERSION,
        termsAcceptedAt: new Date(),
      },
      select: USER_SELECT,
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
        createdAt: new Date(),
      },
    });

    finalAccessToken = signAccessToken(user.id);
    finalRefreshToken = newRefreshToken;
    createdUser = toUserDto(user);
  });

  logger.info(
    `User ${createdUser!.id} registered via invite → shop ${invite.shopId}`,
  );
  return {
    user: createdUser!,
    accessToken: finalAccessToken,
    refreshToken: finalRefreshToken,
    shopSlug: invite.shop!.slug,
  };
};

export const loginUser = async ({
  email,
  password,
  rememberMe = true,
}: LoginDto) => {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    logger.warn('Login attempt for unknown email');
    throw new AppError(401, 'Invalid credentials');
  }

  if (!user.passwordHash) {
    // OAuth-only account — no password set
    throw new AppError(401, 'Invalid credentials');
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

  if (!isPasswordValid) {
    logger.warn(`Failed login attempt for userId: ${user.id}`);
    throw new AppError(401, 'Invalid credentials');
  }

  // Remember the language they use the app in, for emails sent to them later
  // (new-booking notices) when they are not the one making the request.
  const locale = currentLocale();
  if (user.locale !== locale)
    await prisma.user.update({ where: { id: user.id }, data: { locale } });

  const accessToken = signAccessToken(user.id);
  const refreshToken = signRefreshToken(user.id);
  const family = randomUUID();

  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      family,
      userId: user.id,
      expiresAt: getRefreshTokenExpiry(rememberMe),
      rememberMe,
      createdAt: new Date(),
    },
  });

  logger.info(`User logged in: ${user.id}`);

  return {
    user: toUserDto(user),
    accessToken,
    refreshToken,
    rememberMe,
  };
};

// A second refresh carrying a just-rotated token is two tabs (or a page load
// plus an interceptor) racing, not theft. Inside this window it is a retryable
// 401 that leaves the winner's session alone; outside it, reuse still revokes.
export const REFRESH_RACE_WINDOW_MS = 10_000;

// The presented token is not in the table: it was rotated or never existed.
// Compares against createdAt, which every refreshToken.create sets from the
// app clock, so the window is measured on one clock.
const rejectRotatedToken = async (userId: string): Promise<never> => {
  const successor = await prisma.refreshToken.findFirst({
    where: {
      userId,
      createdAt: { gt: new Date(Date.now() - REFRESH_RACE_WINDOW_MS) },
    },
    select: { id: true },
  });
  if (successor)
    throw new AppError(
      401,
      'This session was just refreshed by another request. Retry.',
      'REFRESH_RACE',
    );

  // Valid JWT, no row, no recent successor: reuse attack detected.
  // Invalidate every session for the user to protect the account.
  logger.warn(
    `Refresh token reuse detected for userId: ${userId}. Invalidating all sessions.`,
  );
  await prisma.refreshToken.deleteMany({ where: { userId } });
  throw new AppError(401, 'Session invalidated. Please log in again.');
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

  if (!stored) return rejectRotatedToken(payload.userId);

  if (stored.expiresAt < new Date()) {
    await prisma.refreshToken.deleteMany({ where: { token } });
    throw new AppError(401, 'Refresh token expired');
  }

  const newRefreshToken = signRefreshToken(payload.userId);

  // Claim and replace in one transaction: only one concurrent request can
  // delete the row, and a loser waits on its lock until the successor exists.
  const rotated = await prisma.$transaction(async (tx) => {
    const { count } = await tx.refreshToken.deleteMany({ where: { token } });
    if (count !== 1) return false;
    await tx.refreshToken.create({
      data: {
        token: newRefreshToken,
        family: stored.family,
        userId: payload.userId,
        expiresAt: getRefreshTokenExpiry(stored.rememberMe),
        rememberMe: stored.rememberMe,
        createdAt: new Date(),
      },
    });
    return true;
  });
  if (!rotated) return rejectRotatedToken(payload.userId);

  const accessToken = signAccessToken(payload.userId);

  logger.info(`Access token refreshed for userId: ${payload.userId}`);

  return { accessToken, newRefreshToken, rememberMe: stored.rememberMe };
};

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
      termsVersion: pending.termsVersion,
      termsAcceptedAt: pending.termsAcceptedAt,
    },
    select: USER_SELECT,
  });

  await prisma.pendingRegistration.delete({ where: { token } });

  logger.info(`Email verified and user created: ${user.id}`);
  return toUserDto(user);
};

export const forgotPassword = async (email: string) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    logger.warn('Password reset attempt for unknown email');
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

  logger.info(`Password reset token created for userId: ${user.id}`);
};

export const getSessions = async (userId: string) => {
  const sessions = await prisma.refreshToken.findMany({
    where: { userId },
    select: { id: true, family: true, createdAt: true, expiresAt: true },
    orderBy: { createdAt: 'desc' },
  });
  return sessions;
};

export const revokeAllSessions = async (
  userId: string,
  currentToken: string,
) => {
  await prisma.refreshToken.deleteMany({
    where: { userId },
  });
  logger.info(`All sessions revoked for userId: ${userId}`);
};

export const updateUser = async (
  userId: string,
  data: {
    email?: string;
    password?: string;
    name?: string;
    currentPassword?: string;
  },
): Promise<
  { user: UserDto } | { message: string } | { user: UserDto; message: string }
> => {
  // A new password or email takes over the account, so an access token alone
  // is not enough: the caller proves they know the current password.
  if (data.email || data.password) {
    const current = await prisma.user.findUnique({ where: { id: userId } });
    const ok =
      !!current?.passwordHash &&
      typeof data.currentPassword === 'string' &&
      (await bcrypt.compare(data.currentPassword, current.passwordHash));
    if (!ok)
      // 403, not 401: a 401 would send the client off to refresh its token.
      throw new AppError(
        403,
        'Current password is incorrect',
        'INVALID_PASSWORD',
      );
  }

  // Name and password apply immediately, in one update; email goes through a
  // pending verification instead, so it's handled separately below.
  const immediateChanges: { name?: string; passwordHash?: string } = {};
  if (data.name) immediateChanges.name = data.name;
  if (data.password)
    immediateChanges.passwordHash = await bcrypt.hash(data.password, 12);
  const hasImmediateChanges = Object.keys(immediateChanges).length > 0;

  let message: string | undefined;

  if (data.email) {
    const existing = await prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existing && existing.id !== userId) {
      throw new AppError(409, 'Email already in use');
    }

    const token = generateRandomToken();
    await prisma.pendingEmailChange.upsert({
      where: { userId },
      update: { newEmail: data.email, token, expiresAt: getEmailTokenExpiry() },
      create: {
        userId,
        newEmail: data.email,
        token,
        expiresAt: getEmailTokenExpiry(),
      },
    });

    await sendEmailChangeVerification(data.email, token);
    logger.info(`Email change verification sent for userId: ${userId}`);
    message = 'Verification email sent to your new address';
  }

  if (data.password) {
    await prisma.refreshToken.deleteMany({ where: { userId } });
    // An email change queued before this must not outlive the new password.
    if (!data.email)
      await prisma.pendingEmailChange.deleteMany({ where: { userId } });
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
      select: USER_SELECT,
    });
    return { user: toUserDto(user) };
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: immediateChanges,
    select: USER_SELECT,
  });

  return message
    ? { user: toUserDto(user), message }
    : { user: toUserDto(user) };
};

export const verifyEmailChange = async (token: string) => {
  const pending = await prisma.pendingEmailChange.findUnique({
    where: { token },
  });

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
    select: USER_SELECT,
  });

  await prisma.pendingEmailChange.delete({ where: { token } });

  logger.info(`Email changed for userId: ${pending.userId}`);
  return toUserDto(user);
};

export const deleteUser = async (userId: string, password?: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError(404, 'User not found');

  if (user.passwordHash) {
    // 403, not 401: the session is fine, the confirmation was wrong. A 401
    // would make the client's interceptor refresh the token and retry.
    if (!password)
      throw new AppError(403, 'Invalid password', 'INVALID_PASSWORD');
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new AppError(403, 'Invalid password', 'INVALID_PASSWORD');
  }

  // A shop has exactly one owner. Deleting the account removes the user's
  // memberships, so the owner has to delete the shop or transfer it to a
  // manager first, instead of leaving it live with no owner.
  const owned = await prisma.userShop.findMany({
    where: { userId, role: 'owner' },
    select: { shop: { select: { id: true, name: true, slug: true } } },
  });
  const stranded = owned.map((m) => m.shop);
  if (stranded.length > 0)
    throw new AppError(
      409,
      `You are the owner of ${stranded.map((s) => s.name).join(', ')}. Delete the shop or transfer ownership to a manager first.`,
      'SOLE_OWNER_OF_SHOP',
      undefined,
      { shops: stranded },
    );

  // Delete related records first to avoid FK constraint violations
  await prisma.refreshToken.deleteMany({ where: { userId } });
  await prisma.passwordResetToken.deleteMany({ where: { userId } });

  await prisma.user.delete({ where: { id: userId } });
  logger.info(`User deleted: ${userId}`);
};

export const resendVerificationEmail = async (email: string) => {
  const pending = await prisma.pendingRegistration.findUnique({
    where: { email },
  });

  if (!pending) {
    // Don't reveal whether the email exists or not
    logger.warn('Resend verification requested for unknown/verified email');
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

  logger.info('Verification email resent');
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
  // Whoever queued an email change may be who the reset is locking out.
  await prisma.pendingEmailChange.deleteMany({
    where: { userId: resetToken.userId },
  });

  logger.info(`Password reset for userId: ${resetToken.userId}`);
};
