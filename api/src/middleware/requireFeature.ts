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
