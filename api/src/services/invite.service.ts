import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { prisma } from '../utils/prisma';
import { hashToken } from '../utils/jwt';

const INVITE_SELECT = {
  id: true,
  shopId: true,
  email: true,
  role: true,
  status: true,
  expiresAt: true,
  createdAt: true,
  updatedAt: true,
  createdBy: { select: { id: true, email: true } },
  shop: { select: { id: true, name: true, slug: true } },
} as const;

export const getMyInvites = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });
  if (!user) throw new AppError(404, 'User not found');

  const now = new Date();

  const [received, sent] = await Promise.all([
    prisma.shopInvite.findMany({
      where: {
        email: { equals: user.email, mode: 'insensitive' },
        status: 'pending',
        expiresAt: { gt: now },
      },
      select: INVITE_SELECT,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.shopInvite.findMany({
      where: { createdById: userId },
      select: INVITE_SELECT,
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return { received, sent };
};

export const acceptInvite = async (userId: string, inviteId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true },
  });
  if (!user) throw new AppError(404, 'User not found');

  const invite = await prisma.shopInvite.findUnique({
    where: { id: inviteId },
    include: { shop: { select: { id: true, slug: true } } },
  });

  if (!invite || invite.email.toLowerCase() !== user.email.toLowerCase())
    throw new AppError(404, 'Invite not found');

  if (invite.status !== 'pending')
    throw new AppError(400, 'Invite already accepted or declined');

  if (invite.expiresAt < new Date())
    throw new AppError(400, 'Invite has expired');

  // Idempotency: check the user doesn't already have a login-linked membership in this shop
  const existingMembership = await prisma.userShop.findUnique({
    where: { userId_shopId: { userId, shopId: invite.shopId } },
  });
  if (existingMembership)
    throw new AppError(409, 'You are already a member of this shop');

  await prisma.$transaction([
    // Link the user's login to the placeholder team member this invite grants access to,
    // instead of creating a new membership — the member (and their bookings) already exists.
    prisma.userShop.update({
      where: { id: invite.userShopId },
      data: { userId },
    }),
    prisma.shopInvite.update({
      where: { id: inviteId },
      data: { status: 'accepted', acceptedById: userId },
    }),
  ]);

  logger.info(`Invite ${inviteId} accepted by user ${userId}`);
  return { shopId: invite.shopId, shopSlug: invite.shop!.slug, role: invite.role };
};

export const declineInvite = async (userId: string, inviteId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });
  if (!user) throw new AppError(404, 'User not found');

  const invite = await prisma.shopInvite.findUnique({ where: { id: inviteId } });

  if (!invite || invite.email.toLowerCase() !== user.email.toLowerCase())
    throw new AppError(404, 'Invite not found');

  if (invite.status !== 'pending')
    throw new AppError(400, 'Invite already accepted or declined');

  await prisma.shopInvite.update({
    where: { id: inviteId },
    data: { status: 'expired' },
  });

  logger.info(`Invite ${inviteId} declined by user ${userId}`);
};

export const lookupInviteByToken = async (plainToken: string) => {
  const tokenHash = hashToken(plainToken);

  const invite = await prisma.shopInvite.findUnique({
    where: { tokenHash },
    include: {
      shop: { select: { id: true, name: true, slug: true } },
      createdBy: { select: { email: true } },
    },
  });

  if (!invite) throw new AppError(404, 'Invite not found');
  if (invite.status !== 'pending') throw new AppError(400, 'Invite already used');
  if (invite.expiresAt < new Date()) throw new AppError(400, 'Invite has expired');

  return {
    inviteId: invite.id,
    shopName: invite.shop.name,
    shopSlug: invite.shop.slug,
    role: invite.role,
    email: invite.email,
    invitedBy: invite.createdBy.email,
    expiresAt: invite.expiresAt,
  };
};
