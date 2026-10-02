import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { prisma } from '../utils/prisma';
import { requireShopAccess } from '../utils/shopAccess';
import {
  generateRandomToken,
  getInviteTokenExpiry,
  hashToken,
} from '../utils/jwt';
import { sendInviteEmail } from './email.service';

export interface UpdateMemberRoleDto {
  role: 'owner' | 'staff';
  canViewCustomerDetails?: boolean;
  email?: string;
  active?: boolean;
  bookableByCustomers?: boolean;
  bookableInternally?: boolean;
}

export interface CreateTeamMemberDto {
  name: string;
  email?: string;
  role: 'owner' | 'staff';
  canViewCustomerDetails?: boolean;
  sendEmail?: boolean;
}

const MEMBER_SELECT = {
  id: true,
  userId: true,
  shopId: true,
  role: true,
  name: true,
  email: true,
  canViewCustomerDetails: true,
  active: true,
  bookableByCustomers: true,
  bookableInternally: true,
  createdAt: true,
  invites: {
    where: { status: 'pending' as const },
    select: { id: true },
    take: 1,
  },
} as const;

const shapeMember = <T extends { invites: { id: string }[] }>(member: T) => {
  const { invites, ...rest } = member;
  return { ...rest, hasPendingInvite: invites.length > 0 };
};

const OWNER_ONLY = {
  role: 'owner',
  ownerMessage: 'Only the shop owner can manage team members',
} as const;

// memberId is UserShop.id — a member may not have a login (User) yet
async function requireMemberInShop(memberId: string, shopId: string) {
  const member = await prisma.userShop.findFirst({
    where: { id: memberId, shopId },
    select: MEMBER_SELECT,
  });
  if (!member) throw new AppError(404, 'Member not found');
  return member;
}

// Owners who can actually manage the shop, other than `memberId`: the owner
// role alone is not enough, they must be active and have a login. A shop must
// always keep at least one.
const countOtherManagingOwners = (shopId: string, memberId: string) =>
  prisma.userShop.count({
    where: {
      shopId,
      role: 'owner',
      active: true,
      userId: { not: null },
      id: { not: memberId },
    },
  });

export const getMembers = async (userId: string, shopId: string) => {
  await requireShopAccess(userId, shopId);
  const members = await prisma.userShop.findMany({
    where: { shopId },
    select: MEMBER_SELECT,
    orderBy: { createdAt: 'asc' },
  });
  return members.map(shapeMember);
};

export const getMember = async (
  userId: string,
  shopId: string,
  memberId: string,
) => {
  await requireShopAccess(userId, shopId);
  return shapeMember(await requireMemberInShop(memberId, shopId));
};

export const createTeamMember = async (
  userId: string,
  shopId: string,
  dto: CreateTeamMemberDto,
) => {
  await requireShopAccess(userId, shopId, OWNER_ONLY);

  const email = dto.email ? dto.email.toLowerCase() : null;

  if (email) {
    const existing = await prisma.userShop.findFirst({
      where: { shopId, email: { equals: email, mode: 'insensitive' } },
    });
    if (existing)
      throw new AppError(
        409,
        'A team member with this email already exists in this shop',
      );
  }

  const member = await prisma.userShop.create({
    data: {
      shopId,
      userId: null,
      name: dto.name,
      email,
      role: dto.role,
      canViewCustomerDetails: dto.canViewCustomerDetails ?? true,
    },
    select: MEMBER_SELECT,
  });

  logger.info(
    `Team member ${member.id} created in shop ${shopId} by user ${userId}`,
  );

  if (dto.sendEmail !== false) {
    await sendLoginInvite(userId, shopId, member.id);
    return getMember(userId, shopId, member.id);
  }

  return shapeMember(member);
};

export const updateMemberRole = async (
  userId: string,
  shopId: string,
  memberId: string,
  dto: UpdateMemberRoleDto,
) => {
  await requireShopAccess(userId, shopId, OWNER_ONLY);
  const member = await requireMemberInShop(memberId, shopId);

  // Prevent demoting the only owner
  if (dto.role === 'staff' && member.role === 'owner') {
    if ((await countOtherManagingOwners(shopId, memberId)) === 0)
      throw new AppError(400, 'Cannot demote the only owner');
  }

  const email =
    dto.email !== undefined
      ? dto.email
        ? dto.email.toLowerCase()
        : null
      : undefined;
  if (email && email !== member.email) {
    const existing = await prisma.userShop.findFirst({
      where: {
        shopId,
        email: { equals: email, mode: 'insensitive' },
        id: { not: memberId },
      },
    });
    if (existing)
      throw new AppError(
        409,
        'A team member with this email already exists in this shop',
      );
  }

  // The owner must always be able to access their own shop — active can
  // never be turned off for the owner role, and promoting someone to owner
  // implicitly reactivates them.
  let active: boolean;
  if (dto.role === 'owner') {
    if (dto.active === false)
      throw new AppError(400, 'The owner cannot be set inactive');
    active = true;
  } else {
    active = dto.active !== undefined ? dto.active : member.active;
  }

  // Deactivating a member turns off both bookable toggles too — they should
  // never be selectable anywhere while inactive, regardless of what was sent.
  // Reactivating turns both back on, again regardless of what was sent: the
  // member form submits every field on each save, so the stale `false` values
  // it loaded for the inactive member would otherwise win.
  const reactivating = active && !member.active;
  const bookableByCustomers = !active
    ? false
    : reactivating
      ? true
      : dto.bookableByCustomers !== undefined
        ? dto.bookableByCustomers
        : member.bookableByCustomers;
  const bookableInternally = !active
    ? false
    : reactivating
      ? true
      : dto.bookableInternally !== undefined
        ? dto.bookableInternally
        : member.bookableInternally;

  const updated = await prisma.userShop.update({
    where: { id: memberId },
    data: {
      role: dto.role,
      ...(dto.canViewCustomerDetails !== undefined && {
        canViewCustomerDetails: dto.canViewCustomerDetails,
      }),
      ...(email !== undefined && { email }),
      active,
      bookableByCustomers,
      bookableInternally,
    },
    select: MEMBER_SELECT,
  });

  logger.info(
    `Member ${memberId} role updated to ${dto.role} in shop ${shopId} by user ${userId}`,
  );
  return shapeMember(updated);
};

export const removeMember = async (
  userId: string,
  shopId: string,
  memberId: string,
) => {
  await requireShopAccess(userId, shopId, OWNER_ONLY);
  const member = await requireMemberInShop(memberId, shopId);

  // Prevent removing the last owner
  if (member.role === 'owner') {
    if ((await countOtherManagingOwners(shopId, memberId)) === 0)
      throw new AppError(400, 'Cannot remove the only owner');
  }

  await prisma.userShop.delete({
    where: { id: memberId },
  });

  logger.info(
    `Member ${memberId} removed from shop ${shopId} by user ${userId}`,
  );
};

// Sends (or resends) the login invite for a member who has no login yet.
// Rotates the token each time, since the plain token from a prior send was
// never stored — this same function backs "send now", "send later", and
// "resend" from the team member's own page.
export const sendLoginInvite = async (
  userId: string,
  shopId: string,
  memberId: string,
) => {
  await requireShopAccess(userId, shopId, OWNER_ONLY);
  const member = await requireMemberInShop(memberId, shopId);

  if (member.userId) throw new AppError(400, 'This member already has a login');
  if (!member.active)
    throw new AppError(
      400,
      'Activate this member before sending an invite.',
      'MEMBER_INACTIVE',
    );
  if (!member.email)
    throw new AppError(
      400,
      'Add an email for this member before sending a login invite',
    );

  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    select: { id: true, name: true },
  });
  if (!shop) throw new AppError(404, 'Shop not found');

  const createdBy = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });
  if (!createdBy) throw new AppError(404, 'User not found');

  const plainToken = generateRandomToken();
  const tokenHash = hashToken(plainToken);

  const existingInvite = await prisma.shopInvite.findFirst({
    where: { userShopId: memberId, status: 'pending' },
  });

  if (existingInvite) {
    await prisma.shopInvite.update({
      where: { id: existingInvite.id },
      data: {
        tokenHash,
        expiresAt: getInviteTokenExpiry(),
        email: member.email,
      },
    });
  } else {
    await prisma.shopInvite.create({
      data: {
        shopId,
        userShopId: memberId,
        email: member.email,
        role: member.role,
        tokenHash,
        expiresAt: getInviteTokenExpiry(),
        createdById: userId,
      },
    });
  }

  await sendInviteEmail(
    member.email,
    plainToken,
    shop.name,
    createdBy.email,
    member.role,
  );
  logger.info(
    `Login invite sent to ${member.email} for member ${memberId} in shop ${shopId}`,
  );

  return getMember(userId, shopId, memberId);
};

// Withdraws a pending login invite without touching the member itself — they
// keep their booking history and stay bookable, just without a pending offer.
export const cancelLoginInvite = async (
  userId: string,
  shopId: string,
  memberId: string,
) => {
  await requireShopAccess(userId, shopId, OWNER_ONLY);
  await requireMemberInShop(memberId, shopId);

  await prisma.shopInvite.deleteMany({
    where: { userShopId: memberId, status: 'pending' },
  });

  logger.info(
    `Pending login invite cancelled for member ${memberId} in shop ${shopId} by user ${userId}`,
  );
  return getMember(userId, shopId, memberId);
};
