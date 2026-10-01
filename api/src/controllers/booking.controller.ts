import { Request, Response, NextFunction } from 'express';
import { BookingStatus } from '../../dist/generated/prisma';
import { successResponse } from '../utils/response';
import { logger } from '../utils/logger';
import { sendBookingConfirmationEmail } from '../services/email.service';
import * as bookingService from '../services/booking.service';
import { requireShopAccess } from '../utils/shopAccess';

export const createBooking = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user!.userId!;
    const shopId = req.params['shopId'] as string;
    const booking = await bookingService.createBookingForShop(
      userId,
      shopId,
      req.body,
    );
    successResponse(res, booking, 201);

    // Owner/staff created this booking themselves, so only the customer needs
    // a confirmation email — no "new booking" notification back to the owner.
    if (booking.customer.email && booking.cancelToken) {
      sendBookingConfirmationEmail({
        email: booking.customer.email,
        customerName: booking.customer.name,
        shopName: booking.shop.name,
        serviceName: booking.service.name,
        staffName: booking.staff.name ?? 'Your staff member',
        startTime: booking.startTime,
        endTime: booking.endTime,
        timezone: booking.shop.timezone,
        formattedAddress: booking.shop.formattedAddress,
        cancelToken: booking.cancelToken,
      }).catch((err) =>
        logger.error(err, 'Failed to send booking confirmation email'),
      );
    }
  } catch (err) {
    next(err);
  }
};

export const getAvailableSlots = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user!.userId!;
    const shopId = req.params['shopId'] as string;
    // Any member of the shop may look; anyone else gets a 404.
    await requireShopAccess(userId, shopId);
    const date = req.query['date'] as string;
    const staffId = (req.query['staffId'] as string | undefined) || null;
    const serviceId = req.query['serviceId'] as string;
    const slots = await bookingService.getAvailableSlots(
      shopId,
      date,
      staffId,
      serviceId,
      'internal',
      {
        includeOutsideHours:
          String(req.query['includeOutsideHours']) === 'true',
        intervalMinutes: req.query['intervalMinutes']
          ? Number(req.query['intervalMinutes'])
          : undefined,
        forBookingId:
          (req.query['forBookingId'] as string | undefined) || undefined,
      },
    );
    successResponse(res, slots);
  } catch (err) {
    next(err);
  }
};

export const listBookings = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user!.userId!;
    const shopId = req.params['shopId'] as string;
    const date = req.query['date'] as string | undefined;
    const status = req.query['status'] as BookingStatus | undefined;
    const staffId = req.query['staffId'] as string | undefined;
    const bookings = await bookingService.listBookings(userId, shopId, {
      date,
      status,
      staffId,
    });
    successResponse(res, bookings);
  } catch (err) {
    next(err);
  }
};

export const getBookingStats = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user!.userId!;
    const shopId = req.params['shopId'] as string;
    const stats = await bookingService.getBookingStats(userId, shopId);
    successResponse(res, stats);
  } catch (err) {
    next(err);
  }
};

export const getBooking = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user!.userId!;
    const shopId = req.params['shopId'] as string;
    const bookingId = req.params['bookingId'] as string;
    const booking = await bookingService.getBooking(userId, shopId, bookingId);
    successResponse(res, booking);
  } catch (err) {
    next(err);
  }
};

export const updateBooking = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user!.userId!;
    const shopId = req.params['shopId'] as string;
    const bookingId = req.params['bookingId'] as string;
    const booking = await bookingService.updateBooking(
      userId,
      shopId,
      bookingId,
      req.body,
    );
    successResponse(res, booking);
  } catch (err) {
    next(err);
  }
};

export const updateBookingStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user!.userId!;
    const shopId = req.params['shopId'] as string;
    const bookingId = req.params['bookingId'] as string;
    const { status } = req.body as { status: BookingStatus };
    const booking = await bookingService.updateBookingStatus(
      userId,
      shopId,
      bookingId,
      status,
    );
    successResponse(res, booking);
  } catch (err) {
    next(err);
  }
};
