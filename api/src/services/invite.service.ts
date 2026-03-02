import crypto from 'crypto';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { prisma } from '../utils/prisma';
import { generateRandomToken, getInviteTokenExpiry } from '../utils/jwt';
import { sendInviteEmail } from './email.service';

export interface CreateInviteDto {
  email: string;
  role: 'owner' | 'staff';
}

const hashToken = (token: string) =>
  crypto.createHash('sha256').update(token).digest('hex');

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

async function requireMembership(userId: string, shopId: string) {
  const membership = await prisma.userShop.findUnique({
    where: { userId_shopId: { userId, shopId } },
  });
  if (!membership) throw new AppError(404, 'Shop not found');
  return membership;
}

async function requireOwner(userId: string, shopId: string) {
  const membership = await requireMembership(userId, shopId);
  if (membership.role !== 'owner')
    throw new AppError(403, 'Only the shop owner can manage invites');
  return membership;
}

export const createInvite = async (
  createdById: string,
  shopId: string,
  dto: CreateInviteDto,
) => {
  await requireOwner(createdById, shopId);

  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    select: { id: true, name: true },
  });
  if (!shop) throw new AppError(404, 'Shop not found');

  const createdBy = await prisma.user.findUnique({
    where: { id: createdById },
    select: { email: true },
  });
  if (!createdBy) throw new AppError(404, 'User not found');

  // Check if invitee is already a member
  const existingMember = await prisma.userShop.findFirst({
    where: {
      shopId,
      user: { email: { equals: dto.email, mode: 'insensitive' } },
    },
  });
  if (existingMember) throw new AppError(409, 'This user is already a member of the shop');

  // Check for active pending invite for same email + shop
  const existingInvite = await prisma.shopInvite.findFirst({
    where: {
      shopId,
      email: { equals: dto.email, mode: 'insensitive' },
      status: 'pending',
      expiresAt: { gt: new Date() },
    },
  });
  if (existingInvite) throw new AppError(409, 'An active invite already exists for this email');

  const plainToken = generateRandomToken();
  const tokenHash = hashToken(plainToken);

  const invite = await prisma.shopInvite.create({
    data: {
      shopId,
      email: dto.email.toLowerCase(),
      role: dto.role,
      tokenHash,
      expiresAt: getInviteTokenExpiry(),
      createdById,
    },
    select: INVITE_SELECT,
  });

  //await sendInviteEmail(dto.email, plainToken, shop.name, createdBy.email, dto.role);
  await sendInviteEmail("nikostheodosis05@gmail.com", plainToken, shop.name, createdBy.email, dto.role);

  logger.info(`Invite created for ${dto.email} to shop ${shopId} by user ${createdById}`);
  return invite;
};

export const getShopInvites = async (userId: string, shopId: string) => {
  await requireOwner(userId, shopId);
  return prisma.shopInvite.findMany({
    where: { shopId },
    select: INVITE_SELECT,
    orderBy: { createdAt: 'desc' },
  });
};

export const revokeInvite = async (
  userId: string,
  shopId: string,
  inviteId: string,
) => {
  await requireOwner(userId, shopId);

  const invite = await prisma.shopInvite.findUnique({ where: { id: inviteId } });
  if (!invite || invite.shopId !== shopId) throw new AppError(404, 'Invite not found');
  if (invite.status !== 'pending') throw new AppError(400, 'Only pending invites can be revoked');

  await prisma.shopInvite.delete({ where: { id: inviteId } });
  logger.info(`Invite ${inviteId} revoked by user ${userId}`);
};

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

  // Idempotency: check if already a member
  const existingMembership = await prisma.userShop.findUnique({
    where: { userId_shopId: { userId, shopId: invite.shopId } },
  });
  if (existingMembership)
    throw new AppError(409, 'You are already a member of this shop');

  await prisma.$transaction([
    prisma.userShop.create({
      data: { userId, shopId: invite.shopId, role: invite.role },
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
