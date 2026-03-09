import { AppError } from "../middleware/errorHandler";
import { prisma } from '../utils/prisma';

const getShopInfo = async ( slug: string) => {
const shop = await prisma.shop.findUnique({
  where: { slug, isActive: true },
  include: {
    services: {
      where: { isActive: true },
      select: { id: true, name: true, description: true, duration: true, price: true }
    },
    shopWorkingSchedules: {
      where: { isActive: true, staffId: null }, // shop-level schedule only
      include: {
        days: {
          include: { hours: true }
        }
      }
    },
    members: {
      include: {
        user: {
          select: { id: true, name: true }
        },
        staffServices: {
          include: {
            service: {
              select: { id: true, name: true }
            }
          }
        }
      }
    }
  }
})

  if (!shop) throw new AppError(404, 'Shop not found');

  return shop;
};

