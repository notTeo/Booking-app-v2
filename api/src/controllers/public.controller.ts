import { Request, Response, NextFunction } from 'express';
import { successResponse } from '../utils/response';
import { logger } from '../utils/logger';
import { getShopInfoService } from '../services/public.service';
import { createBooking as createBookingService, cancelBookingByToken, getAvailableSlots } from '../services/booking.service';
import {
  sendBookingConfirmationEmail,
  sendCancellationConfirmationEmail,
  sendNewBookingNotificationEmail,
} from '../services/email.service';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';

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

    prisma.userShop
      .findFirst({ where: { shopId: booking.shopId, role: 'owner' }, include: { user: true } })
      .then((owner) => {
        if (!owner?.user.email) return;
        return sendNewBookingNotificationEmail({
          email: owner.user.email,
          customerName: booking.customer.name,
          customerPhone: booking.customer.phone,
          shopName: booking.shop.name,
          serviceName: booking.service.name,
          staffName: booking.staff.user.name ?? 'Staff',
          startTime: booking.startTime,
          timezone: booking.shop.timezone,
        });
      })
      .catch((err) => logger.error(err, 'Failed to send new booking notification email'));
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

    if (booking.customer.email) {
      sendCancellationConfirmationEmail({
        email: booking.customer.email,
        customerName: booking.customer.name,
        shopName: booking.shop.name,
        serviceName: booking.service.name,
        startTime: booking.startTime,
        timezone: booking.shop.timezone,
      }).catch((err) => logger.error(err, 'Failed to send cancellation confirmation email'));
    }
  } catch (err) {
    next(err);
  }
};

export const getPublicSlots = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const slug = req.params.slug as string;
    const date = req.query['date'] as string;
    const staffId = (req.query['staffId'] as string) ?? null;
    const serviceId = req.query['serviceId'] as string;

    const shop = await prisma.shop.findUnique({
      where: { slug, isActive: true },
      select: { id: true },
    });
    if (!shop) throw new AppError(404, 'Shop not found');

    const slots = await getAvailableSlots(shop.id, date, staffId, serviceId);
    successResponse(res, slots);
  } catch (err) {
    next(err);
  }
};
