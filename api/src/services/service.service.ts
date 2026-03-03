import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

interface CreateServiceDto {
  name: string;
  description?: string;
  duration: number;
  price: number;
  isActive?: boolean;
}

interface UpdateServiceDto {
  name?: string;
  description?: string;
  duration?: number;
  price?: number;
  isActive?: boolean;
}

// ── helpers ──────────────────────────────────────────────

const getMembership = async (userId: string, shopId: string) => {
  const membership = await prisma.userShop.findUnique({
    where: { userId_shopId: { userId, shopId } },
  });
  if (!membership) throw new AppError(403, 'You are not a member of this shop');
  return membership;
};

const requireOwner = async (userId: string, shopId: string) => {
  const membership = await getMembership(userId, shopId);
  if (membership.role !== 'owner') throw new AppError(403, 'Only the shop owner can perform this action');
  return membership;
};

// ── service CRUD ──────────────────────────────────────────

export const createService = async (userId: string, shopId: string, dto: CreateServiceDto) => {
  await requireOwner(userId, shopId);

  const service = await prisma.service.create({
    data: { shopId, ...dto },
  });

  logger.info(`Service created: ${service.id} in shop ${shopId}`);
  return service;
};

export const getServices = async (userId: string, shopId: string) => {
  await getMembership(userId, shopId);

  return prisma.service.findMany({
    where: { shopId },
    orderBy: { createdAt: 'asc' },
  });
};

export const getServiceById = async (userId: string, shopId: string, serviceId: string) => {
  await getMembership(userId, shopId);

  const service = await prisma.service.findFirst({
    where: { id: serviceId, shopId },
    include: {
      staffServices: {
        include: {
          userShop: {
            include: { user: { select: { id: true, email: true } } },
          },
        },
      },
    },
  });

  if (!service) throw new AppError(404, 'Service not found');
  return service;
};

export const updateService = async (userId: string, shopId: string, serviceId: string, dto: UpdateServiceDto) => {
  await requireOwner(userId, shopId);

  const existing = await prisma.service.findFirst({ where: { id: serviceId, shopId } });
  if (!existing) throw new AppError(404, 'Service not found');

  const updated = await prisma.service.update({
    where: { id: serviceId },
    data: dto,
  });

  logger.info(`Service updated: ${serviceId}`);
  return updated;
};

export const deleteService = async (userId: string, shopId: string, serviceId: string) => {
  await requireOwner(userId, shopId);

  const existing = await prisma.service.findFirst({ where: { id: serviceId, shopId } });
  if (!existing) throw new AppError(404, 'Service not found');

  await prisma.service.delete({ where: { id: serviceId } });
  logger.info(`Service deleted: ${serviceId}`);
};

// ── staff assignment ──────────────────────────────────────

export const assignStaffToService = async (userId: string, shopId: string, serviceId: string, userShopId: string) => {
  await requireOwner(userId, shopId);

  // verify service belongs to this shop
  const service = await prisma.service.findFirst({ where: { id: serviceId, shopId } });
  if (!service) throw new AppError(404, 'Service not found');

  // verify the userShopId being assigned actually belongs to this shop
  const targetMembership = await prisma.userShop.findFirst({ where: { id: userShopId, shopId } });
  if (!targetMembership) throw new AppError(404, 'Staff member not found in this shop');

  const assignment = await prisma.staffService.create({
    data: { userShopId, serviceId },
  });

  logger.info(`Staff ${userShopId} assigned to service ${serviceId}`);
  return assignment;
};

export const unassignStaffFromService = async (userId: string, shopId: string, serviceId: string, userShopId: string) => {
  await requireOwner(userId, shopId);

  const assignment = await prisma.staffService.findFirst({
    where: { userShopId, serviceId },
  });
  if (!assignment) throw new AppError(404, 'Assignment not found');

  await prisma.staffService.delete({ where: { id: assignment.id } });
  logger.info(`Staff ${userShopId} unassigned from service ${serviceId}`);
};

export const getMemberServices = async (userId: string, shopId: string, memberId: string) => {
  await getMembership(userId, shopId);

  // memberId is User.id — resolve to the UserShop record to get UserShop.id
  const targetMembership = await prisma.userShop.findUnique({
    where: { userId_shopId: { userId: memberId, shopId } },
  });
  if (!targetMembership) throw new AppError(404, 'Staff member not found in this shop');

  return prisma.staffService.findMany({
    where: { userShopId: targetMembership.id },
    include: { service: true },
    orderBy: { createdAt: 'asc' },
  });
};