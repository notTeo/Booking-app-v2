import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { AppError } from './errorHandler';
import { Feature, PLAN_FEATURES, PRICE_TO_PLAN } from '../config/planFeatures';

export const requireFeature = (feature: Feature) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId!;

      const subscription = await prisma.subscription.findUnique({
        where: { userId },
      });

      if (!subscription || subscription.status !== 'active') {
        throw new AppError(403, 'An active subscription is required to access this feature.');
      }

      const plan = PRICE_TO_PLAN[subscription.stripePriceId];
      const allowedPlans = PLAN_FEATURES[feature] as readonly string[];

      if (!plan || !allowedPlans.includes(plan)) {
        throw new AppError(403, 'Your current plan does not include access to this feature.');
      }

      next();
    } catch (err) {
      next(err);
    }
  };
};
