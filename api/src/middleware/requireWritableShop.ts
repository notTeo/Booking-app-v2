import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { AppError } from './errorHandler';
import { isShopLocked } from '../services/plan.service';

// A locked shop (trial ended, or subscription inactive) is read-only for its
// members. Mounted after `authenticate` on a shop's routes: reads pass, and so
// does anyone who is not an active member, so the route itself still answers
// them with its usual 404. `allowDelete` keeps deletion open, so customer data
// can always be erased on request.
export const requireWritableShop =
  (opts: { allowDelete?: boolean } = {}) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (req.method === 'GET' || req.method === 'HEAD') return next();
      if (opts.allowDelete && req.method === 'DELETE') return next();

      const shopId = (req.params.shopId ?? req.params.id) as string | undefined;
      const userId = req.user?.userId;
      if (!shopId || !userId) return next();

      const membership = await prisma.userShop.findFirst({
        where: { userId, shopId, active: true },
        select: {
          shop: {
            select: { plan: true, subscriptionStatus: true, trialEndsAt: true },
          },
        },
      });
      if (membership && isShopLocked(membership.shop))
        throw new AppError(
          403,
          'This shop is read-only until a plan is set for it.',
          'SHOP_LOCKED',
        );
      next();
    } catch (err) {
      next(err);
    }
  };
