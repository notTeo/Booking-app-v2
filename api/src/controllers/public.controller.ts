import { Request, Response, NextFunction } from 'express';
import { successResponse } from '../utils/response';
import { logger } from '../utils/logger';
import { getShopInfoService } from '../services/public.service';
import { createBooking as createBookingService, cancelBookingByToken } from '../services/booking.service';
import { sendBookingConfirmationEmail } from '../services/email.service';

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

    if (booking.customer.email && booking.cancelToken) {
      sendBookingConfirmationEmail({
        email: booking.customer.email,
        customerName: booking.customer.name,
        shopName: booking.shop.name,
        serviceName: booking.service.name,
        staffName: booking.staff.user.name ?? 'Your staff member',
        startTime: booking.startTime,
        timezone: booking.shop.timezone,
        placeId: booking.shop.placeId,
        formattedAddress: booking.shop.formattedAddress,
        cancelToken: booking.cancelToken,
      }).catch((err) => logger.error(err, 'Failed to send booking confirmation email'));
    }
  } catch (err) {
    next(err);
  }
};

export const cancelBooking = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const booking = await cancelBookingByToken(req.body.token as string);
    successResponse(res, {
      id: booking.id,
      status: booking.status,
      shopName: booking.shop.name,
      serviceName: booking.service.name,
      startTime: booking.startTime,
      customerName: booking.customer.name,
    });
  } catch (err) {
    next(err);
  }
};