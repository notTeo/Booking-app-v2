import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { prisma } from '../utils/prisma';
import { canManageManagers, requireShopAccess } from '../utils/shopAccess';
import {
  generateRandomToken,
  getInviteTokenExpiry,
  hashToken,
} from '../utils/jwt';
import { sendInviteEmail } from './email.service';
import {
  assertStaffCapacity,
  assertTeamFeatures,
  countsAsStaff,
} from './plan.service';

export interface UpdateMemberRoleDto {
  role: 'owner' | 'manager' | 'staff';
  canViewCustomerDetails?: boolean;
  canManageManagers?: boolean;
  canEditShopSettings?: boolean;
  email?: string;
  active?: boolean;
  bookableByCustomers?: boolean;
  bookableInternally?: boolean;
}

export interface CreateTeamMemberDto {
  name: string;
  email?: string;
  role: 'manager' | 'staff';
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
  canManageManagers: true,
  canEditShopSettings: true,
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

const MANAGER_ONLY = {
  role: 'manager',
  forbiddenMessage: 'Only the shop owner or a manager can manage team members',
} as const;

const TRANSFER_FIRST =
  'The owner cannot be changed or removed. Transfer ownership first.';

type Caller = Awaited<ReturnType<typeof requireShopAccess>>;

// Anything that touches a manager — adding one, promoting to or demoting from
// the role, editing, inviting or removing one — needs the owner, or a manager
// the owner has let manage managers. Everyone else manages staff only.
const requireManagerAccess = (caller: Caller, ...roles: string[]) => {
  if (roles.includes('manager') && !canManageManagers(caller))
    throw new AppError(403, 'The shop owner has not let you manage managers');
};

// memberId is UserShop.id — a member may not have a login (User) yet
async function requireMemberInShop(memberId: string, shopId: string) {
  const member = await prisma.userShop.findFirst({
    where: { id: memberId, shopId },
    select: MEMBER_SELECT,
  });
  if (!member) throw new AppError(404, 'Member not found');
  return member;
}

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
  const caller = await requireShopAccess(userId, shopId, MANAGER_ONLY);
  requireManagerAccess(caller, dto.role);

  // A new member is bookable, so they take one of the plan's staff places.
  await assertStaffCapacity(shopId);
  if (dto.role === 'manager' || dto.sendEmail !== false)
    await assertTeamFeatures(shopId);

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
  const caller = await requireShopAccess(userId, shopId, MANAGER_ONLY);
  const member = await requireMemberInShop(memberId, shopId);
  requireManagerAccess(caller, member.role, dto.role);

  // A manager's two extra permissions are the owner's to give. They are sent
  // with every save of the member form, so only an actual change is refused,
  // and they are cleared when the member is not (or no longer) a manager.
  const permission = (key: 'canManageManagers' | 'canEditShopSettings') => {
    if (dto.role !== 'manager') return false;
    const wanted = dto[key] ?? member[key];
    if (wanted !== member[key] && caller.role !== 'owner')
      throw new AppError(
        403,
        "Only the shop owner can change a manager's permissions",
      );
    return wanted;
  };
  const managerPermissions = {
    canManageManagers: permission('canManageManagers'),
    canEditShopSettings: permission('canEditShopSettings'),
  };

  // A shop has one owner. Only the owner edits their own row, and its role
  // changes only through transferOwnership — never here, in either direction.
  if (member.role === 'owner') {
    if (member.userId !== userId)
      throw new AppError(403, 'Only the owner can edit the owner');
    if (dto.role !== 'owner') throw new AppError(400, TRANSFER_FIRST);
  } else if (dto.role === 'owner') {
    throw new AppError(
      400,
      'A shop has one owner. Use transfer ownership to change it.',
    );
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
  // never be turned off for the owner role.
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

  if (
    countsAsStaff({ active, bookableByCustomers, bookableInternally }) &&
    !countsAsStaff(member)
  )
    await assertStaffCapacity(shopId, memberId);
  if (dto.role === 'manager' && member.role !== 'manager')
    await assertTeamFeatures(shopId);

  const updated = await prisma.userShop.update({
    where: { id: memberId },
    data: {
      role: dto.role,
      ...(dto.canViewCustomerDetails !== undefined && {
        canViewCustomerDetails: dto.canViewCustomerDetails,
      }),
      ...(email !== undefined && { email }),
      ...managerPermissions,
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
  const caller = await requireShopAccess(userId, shopId, MANAGER_ONLY);
  const member = await requireMemberInShop(memberId, shopId);
  requireManagerAccess(caller, member.role);

  // The owner leaves by handing the shop over (or deleting it), never by
  // being removed — not even by themself.
  if (member.role === 'owner') {
    if (member.userId !== userId)
      throw new AppError(403, 'Only the owner can edit the owner');
    throw new AppError(400, TRANSFER_FIRST);
  }

  await prisma.userShop.delete({
    where: { id: memberId },
  });

  logger.info(
    `Member ${memberId} removed from shop ${shopId} by user ${userId}`,
  );
};

// Hands the shop to a manager: they become the owner and the caller becomes a
// manager, in one step so the shop never has zero or two owners.
export const transferOwnership = async (
  userId: string,
  shopId: string,
  memberId: string,
) => {
  const caller = await requireShopAccess(userId, shopId, {
    role: 'owner',
    forbiddenMessage: 'Only the shop owner can transfer ownership',
  });
  const member = await requireMemberInShop(memberId, shopId);

  if (member.role !== 'manager' || !member.active || !member.userId)
    throw new AppError(
      400,
      'Ownership can only be transferred to an active manager who has a login',
    );

  await prisma.$transaction([
    // The old owner starts as a plain manager, like any other; the new owner
    // decides what more to allow. The flags mean nothing on the owner's row.
    prisma.userShop.update({
      where: { id: caller.id },
      data: {
        role: 'manager',
        canManageManagers: false,
        canEditShopSettings: false,
      },
    }),
    prisma.userShop.update({
      where: { id: memberId },
      data: {
        role: 'owner',
        canManageManagers: false,
        canEditShopSettings: false,
      },
    }),
  ]);

  logger.info(
    `Ownership of shop ${shopId} transferred from user ${userId} to member ${memberId}`,
  );
  return getMember(userId, shopId, memberId);
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
  const caller = await requireShopAccess(userId, shopId, MANAGER_ONLY);
  const member = await requireMemberInShop(memberId, shopId);
  requireManagerAccess(caller, member.role);

  if (member.userId) throw new AppError(400, 'This member already has a login');
  await assertTeamFeatures(shopId);
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
        role: member.role,
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
  const caller = await requireShopAccess(userId, shopId, MANAGER_ONLY);
  const member = await requireMemberInShop(memberId, shopId);
  requireManagerAccess(caller, member.role);

  await prisma.shopInvite.deleteMany({
    where: { userShopId: memberId, status: 'pending' },
  });

  logger.info(
    `Pending login invite cancelled for member ${memberId} in shop ${shopId} by user ${userId}`,
  );
  return getMember(userId, shopId, memberId);
};
