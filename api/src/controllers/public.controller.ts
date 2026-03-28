import { Request, Response, NextFunction } from 'express';
import { successResponse } from '../utils/response';
import { getShopInfoService } from '../services/public.service';
import { createBooking as createBookingService } from '../services/booking.service';

export const getShopInfo = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const slug = req.params.slug as string;
    const data = await getShopInfoService(slug);
    successResponse(res, data, 200);
  } catch (err) {
    next(err);
  }
};

export const createBooking = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const slug = req.params.slug as string;
    const booking = await createBookingService(slug, req.body);
    successResponse(res, booking, 201);
  } catch (err) {
    next(err);
  }
};