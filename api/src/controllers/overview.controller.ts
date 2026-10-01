import type { NextFunction, Request, Response } from 'express';
import { successResponse } from '../utils/response';
import * as overviewService from '../services/overview.service';

export const getOverview = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user!.userId!;
    const shopId = req.params['shopId'] as string;
    const range = req.query['range'] as overviewService.OverviewRange;
    successResponse(
      res,
      await overviewService.getOverview(userId, shopId, range),
    );
  } catch (err) {
    next(err);
  }
};
