import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { AppError } from './errorHandler';
import { Feature } from '../config/planFeatures';

export const requireFeature = (feature: Feature) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId!;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { plan: true },
      });

      if (!user) {
        throw new AppError(404, 'User not found');
      }

      if (!user.plan) {
        throw new AppError(500, 'User plan configuration is missing');
      }

      // Only boolean features (CREATE_SHOP, SMS_REMINDERS, ADVANCED_ANALYTICS) work with this
      // middleware. Numeric quota features (MAX_STAFF, MAX_BOOKINGS_PER_MONTH) require separate
      // quota-checking logic since their values are numbers, not booleans.
      const features = user.plan.features as Record<string, unknown>;

      if (features[feature] !== true) {
        throw new AppError(403, 'Your current plan does not include access to this feature.');
      }

      next();
    } catch (err) {
      next(err);
    }
  };
};
