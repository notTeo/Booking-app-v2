import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { prisma } from '../utils/prisma';

export interface UpdateMemberRoleDto {
  role: 'owner' | 'staff';
}

const WITH_USER = {
  user: { select: { id: true, email: true } },
};

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
    throw new AppError(403, 'Only the shop owner can manage team members');
  return membership;
}

// memberId = User.id (not UserShop.id)
async function requireMemberInShop(memberId: string, shopId: string) {
  const member = await prisma.userShop.findUnique({
    where: { userId_shopId: { userId: memberId, shopId } },
    include: WITH_USER,
  });
  if (!member) throw new AppError(404, 'Member not found');
  return member;
}

export const getMembers = async (userId: string, shopId: string) => {
  await requireMembership(userId, shopId);
  return prisma.userShop.findMany({
    where: { shopId },
    include: WITH_USER,
    orderBy: { createdAt: 'asc' },
  });
};

export const getMember = async (userId: string, shopId: string, memberId: string) => {
  await requireMembership(userId, shopId);
  return requireMemberInShop(memberId, shopId);
};

export const updateMemberRole = async (
  userId: string,
  shopId: string,
  memberId: string,
  dto: UpdateMemberRoleDto,
) => {
  await requireOwner(userId, shopId);
  const member = await requireMemberInShop(memberId, shopId);

  // Prevent demoting the only owner
  if (dto.role === 'staff' && member.userId === userId) {
    const ownerCount = await prisma.userShop.count({
      where: { shopId, role: 'owner' },
    });
    if (ownerCount <= 1) throw new AppError(400, 'Cannot demote the only owner');
  }

  const updated = await prisma.userShop.update({
    where: { userId_shopId: { userId: memberId, shopId } },
    data: { role: dto.role },
    include: WITH_USER,
  });

  logger.info(`Member ${memberId} role updated to ${dto.role} in shop ${shopId} by user ${userId}`);
  return updated;
};

export const removeMember = async (userId: string, shopId: string, memberId: string) => {
  await requireOwner(userId, shopId);
  const member = await requireMemberInShop(memberId, shopId);

  // Prevent removing the last owner
  if (member.role === 'owner') {
    const ownerCount = await prisma.userShop.count({
      where: { shopId, role: 'owner' },
    });
    if (ownerCount <= 1) throw new AppError(400, 'Cannot remove the only owner');
  }

  await prisma.userShop.delete({
    where: { userId_shopId: { userId: memberId, shopId } },
  });

  logger.info(`Member ${memberId} removed from shop ${shopId} by user ${userId}`);
};
