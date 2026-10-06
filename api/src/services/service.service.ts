import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { requireShopAccess } from '../utils/shopAccess';
import type { Prisma } from '../../dist/generated/prisma';

interface ServiceDto {
  name?: string;
  description?: string;
  duration?: number;
  price?: number;
  isActive?: boolean;
  showOnPublicPage?: boolean;
}

// ── helpers ──────────────────────────────────────────────

const MANAGER_ONLY = {
  role: 'manager',
  forbiddenMessage: 'Only the shop owner or a manager can perform this action',
} as const;

// Request bodies are never spread into Prisma: only these fields are taken.
const pickFields = (dto: ServiceDto) => {
  const out: Prisma.ServiceUncheckedUpdateInput = {};
  if (dto.name !== undefined) out.name = dto.name;
  if (dto.description !== undefined) out.description = dto.description;
  if (dto.duration !== undefined) out.duration = dto.duration;
  if (dto.price !== undefined) out.price = dto.price;
  if (dto.isActive !== undefined) out.isActive = dto.isActive;
  if (dto.showOnPublicPage !== undefined)
    out.showOnPublicPage = dto.showOnPublicPage;
  return out;
};

// ── service CRUD ──────────────────────────────────────────

export const createService = async (
  userId: string,
  shopId: string,
  dto: ServiceDto,
) => {
  await requireShopAccess(userId, shopId, MANAGER_ONLY);

  const service = await prisma.service.create({
    data: {
      ...(pickFields(dto) as Prisma.ServiceUncheckedCreateInput),
      shopId,
    },
  });

  logger.info(`Service created: ${service.id} in shop ${shopId}`);
  return service;
};

export const getServices = async (userId: string, shopId: string) => {
  await requireShopAccess(userId, shopId);

  return prisma.service.findMany({
    where: { shopId },
    orderBy: { createdAt: 'asc' },
  });
};

export const getServiceById = async (
  userId: string,
  shopId: string,
  serviceId: string,
) => {
  await requireShopAccess(userId, shopId);

  const service = await prisma.service.findFirst({
    where: { id: serviceId, shopId },
    include: {
      staffServices: {
        include: {
          userShop: {
            select: { id: true, name: true, email: true },
          },
        },
      },
    },
  });

  if (!service) throw new AppError(404, 'Service not found');
  return service;
};

export const updateService = async (
  userId: string,
  shopId: string,
  serviceId: string,
  dto: ServiceDto,
) => {
  await requireShopAccess(userId, shopId, MANAGER_ONLY);

  const existing = await prisma.service.findFirst({
    where: { id: serviceId, shopId },
  });
  if (!existing) throw new AppError(404, 'Service not found');

  const updated = await prisma.service.update({
    where: { id: serviceId, shopId },
    data: pickFields(dto),
  });

  logger.info(`Service updated: ${serviceId}`);
  return updated;
};

export const deleteService = async (
  userId: string,
  shopId: string,
  serviceId: string,
) => {
  await requireShopAccess(userId, shopId, MANAGER_ONLY);

  const existing = await prisma.service.findFirst({
    where: { id: serviceId, shopId },
  });
  if (!existing) throw new AppError(404, 'Service not found');

  // Bookings (past or future) reference the service and are never deleted
  // with it; the owner deactivates it instead.
  const bookingCount =
    (await prisma.booking.count({ where: { serviceId } })) +
    (await prisma.bookingService.count({ where: { serviceId } }));
  if (bookingCount > 0)
    throw new AppError(
      409,
      "This service has bookings. Deactivate it instead so customers can't book it.",
      'SERVICE_HAS_BOOKINGS',
    );

  await prisma.service.delete({ where: { id: serviceId } });
  logger.info(`Service deleted: ${serviceId}`);
};

// ── staff assignment ──────────────────────────────────────

export const assignStaffToService = async (
  userId: string,
  shopId: string,
  serviceId: string,
  userShopId: string,
) => {
  await requireShopAccess(userId, shopId, MANAGER_ONLY);

  // verify service belongs to this shop
  const service = await prisma.service.findFirst({
    where: { id: serviceId, shopId },
  });
  if (!service) throw new AppError(404, 'Service not found');

  // verify the userShopId being assigned actually belongs to this shop
  const targetMembership = await prisma.userShop.findFirst({
    where: { id: userShopId, shopId },
  });
  if (!targetMembership)
    throw new AppError(404, 'Staff member not found in this shop');

  const assignment = await prisma.staffService.create({
    data: { userShopId, serviceId },
  });

  logger.info(`Staff ${userShopId} assigned to service ${serviceId}`);
  return assignment;
};

export const unassignStaffFromService = async (
  userId: string,
  shopId: string,
  serviceId: string,
  userShopId: string,
) => {
  await requireShopAccess(userId, shopId, MANAGER_ONLY);

  const assignment = await prisma.staffService.findFirst({
    where: {
      userShopId,
      serviceId,
      service: { shopId },
      userShop: { shopId },
    },
  });
  if (!assignment) throw new AppError(404, 'Assignment not found');

  await prisma.staffService.delete({ where: { id: assignment.id } });
  logger.info(`Staff ${userShopId} unassigned from service ${serviceId}`);
};

export const getMemberServices = async (
  userId: string,
  shopId: string,
  memberId: string,
) => {
  await requireShopAccess(userId, shopId);

  // memberId is UserShop.id
  const targetMembership = await prisma.userShop.findFirst({
    where: { id: memberId, shopId },
  });
  if (!targetMembership)
    throw new AppError(404, 'Staff member not found in this shop');

  return prisma.staffService.findMany({
    where: { userShopId: targetMembership.id },
    include: { service: true },
    orderBy: { createdAt: 'asc' },
  });
};
