import { AppError } from '../middleware/errorHandler';
import { prisma } from '../utils/prisma';

async function requireMembership(userId: string, shopId: string) {
  const membership = await prisma.userShop.findUnique({
    where: { userId_shopId: { userId, shopId } },
  });
  if (!membership) throw new AppError(404, 'Shop not found');
  return membership;
}

async function requireCustomerInShop(customerId: string, shopId: string) {
  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer || customer.shopId !== shopId) throw new AppError(404, 'Customer not found');
  return customer;
}

export const listCustomers = async (userId: string, shopId: string, search?: string) => {
  await requireMembership(userId, shopId);

  return prisma.customer.findMany({
    where: {
      shopId,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search } },
        ],
      }),
    },
    orderBy: { createdAt: 'desc' },
  });
};

export const getCustomer = async (userId: string, shopId: string, customerId: string) => {
  await requireMembership(userId, shopId);
  await requireCustomerInShop(customerId, shopId);

  return prisma.customer.findUnique({
    where: { id: customerId },
    include: {
      bookings: {
        include: { service: true },
        orderBy: { startTime: 'desc' },
        take: 5,
      },
    },
  });
};



export const updateCustomer = async (
  userId: string,
  shopId: string,
  customerId: string,
  data: { name?: string; phone?: string; email?: string | null },
) => {
  await requireMembership(userId, shopId);
  await requireCustomerInShop(customerId, shopId);

  return prisma.customer.update({
    where: { id: customerId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.phone !== undefined && { phone: data.phone }),
      ...(data.email !== undefined && { email: data.email }),
    },
  });
};
