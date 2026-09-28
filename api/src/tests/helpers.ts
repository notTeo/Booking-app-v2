import { prisma } from '../utils/prisma';
import { signAccessToken } from '../utils/jwt';

let counter = 0;
export const unique = () => `${Date.now()}-${++counter}`;

export const authHeader = (token: string) => ({
  Authorization: `Bearer ${token}`,
});

// A fully-formed tenant: verified Pro owner, shop, owner membership (who is
// also the bookable staff member), one service assigned to that staff member.
export async function createTenant(label: string) {
  const id = unique();
  const user = await prisma.user.create({
    data: {
      name: label,
      email: `${label.toLowerCase()}-${id}@example.com`,
      isVerified: true,
      isPro: true,
    },
  });
  const shop = await prisma.shop.create({
    data: { name: label, slug: `${label.toLowerCase()}-${id}` },
  });
  const staff = await prisma.userShop.create({
    data: { userId: user.id, shopId: shop.id, role: 'owner', name: label },
  });
  const service = await prisma.service.create({
    data: { shopId: shop.id, name: 'Cut', duration: 30, price: 2000 },
  });
  await prisma.staffService.create({
    data: { userShopId: staff.id, serviceId: service.id },
  });
  return { user, shop, staff, service, token: signAccessToken(user.id) };
}

export type Tenant = Awaited<ReturnType<typeof createTenant>>;

export async function createBookingRow(
  t: Tenant,
  start = '2027-07-01T09:00:00.000Z',
) {
  const customer = await prisma.customer.create({
    data: { shopId: t.shop.id, name: 'Cust', phone: unique() },
  });
  const startTime = new Date(start);
  return prisma.booking.create({
    data: {
      shopId: t.shop.id,
      customerId: customer.id,
      serviceId: t.service.id,
      staffId: t.staff.id,
      startTime,
      endTime: new Date(startTime.getTime() + 30 * 60 * 1000),
    },
  });
}
