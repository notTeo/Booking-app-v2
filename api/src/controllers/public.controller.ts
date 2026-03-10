import { Request, Response, NextFunction } from 'express';
import { successResponse } from '../utils/response';
import { getShopInfoService } from '../services/public.service'

export const getShopInfo = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const slug = req.params.slug as string;
    const data = await getShopInfoService(slug);
    successResponse(res, data, 200);
  } catch (err) {
    next(err);
  }
};