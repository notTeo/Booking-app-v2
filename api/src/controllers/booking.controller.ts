import { parseServiceIds } from '../utils/bookingServices';
import { Request, Response, NextFunction } from 'express';
import { BookingStatus } from '../../dist/generated/prisma';
import { successResponse } from '../utils/response';
import { logger } from '../utils/logger';
import {
  sendBookingConfirmationEmail,
  sendBookingRescheduledEmail,
} from '../services/email.service';
import { bookingEmailParams } from '../utils/bookingEmail';
import * as bookingService from '../services/booking.service';
import { requireShopAccess } from '../utils/shopAccess';
import { redactCustomer } from '../utils/customerVisibility';
import { getShopInfoService } from '../services/public.service';

export const createBooking = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user!.userId!;
    const shopId = req.params['shopId'] as string;
    const { callerCanViewCustomer, ...booking } =
      await bookingService.createBookingForShop(userId, shopId, req.body);
    // Redact here, not in the service: the confirmation email below needs the
    // customer's real name and email.
    successResponse(
      res,
      {
        ...booking,
        customer: redactCustomer(booking.customer, callerCanViewCustomer),
      },
      201,
    );

    // Owner/staff created this booking themselves, so only the customer needs
    // a confirmation email — no "new booking" notification back to the owner.
    const emailParams = bookingEmailParams(booking);
    if (emailParams) {
      sendBookingConfirmationEmail(emailParams).catch((err) =>
        logger.error(err, 'Failed to send booking confirmation email'),
      );
    }
  } catch (err) {
    next(err);
  }
};

// The owner/staff booking wizard's starting data: the public shop info plus
// internal-only services.
export const getWizardInfo = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user!.userId!;
    const shopId = req.params['shopId'] as string;
    await requireShopAccess(userId, shopId);
    successResponse(res, await getShopInfoService({ id: shopId }, 'internal'));
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
    const serviceIds = parseServiceIds(req.query['serviceIds']);
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
        customer: req.query['customerId']
          ? { customerId: req.query['customerId'] as string }
          : undefined,
        ...(serviceIds && { serviceIds }),
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
    const { booking, callerCanViewCustomer, previous } =
      await bookingService.updateBooking(userId, shopId, bookingId, req.body);
    // The shop and staff rows are only loaded for the email below.
    const { shop: _shop, staff: _staff, ...row } = booking;
    successResponse(res, {
      ...row,
      customer: redactCustomer(booking.customer, callerCanViewCustomer),
    });

    // A reschedule replaced the booking (and its links), so the customer is
    // told the new time. Notes-only edits send nothing.
    const emailParams = previous && bookingEmailParams(booking);
    if (emailParams) {
      sendBookingRescheduledEmail({
        ...emailParams,
        previousStartTime: previous.startTime,
      }).catch((err) =>
        logger.error(err, 'Failed to send booking rescheduled email'),
      );
    }
  } catch (err) {
    next(err);
  }
};

export const removeBookingProductLine = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await bookingService.removeBookingProductLine(
      req.user!.userId!,
      req.params['shopId'] as string,
      req.params['bookingId'] as string,
      req.params['lineId'] as string,
    );
    successResponse(res, result);
  } catch (err) {
    next(err);
  }
};

export const updateBookingProductLine = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { saleStatus, quantity } = req.body;
    const line = await bookingService.updateBookingProductLine(
      req.user!.userId!,
      req.params['shopId'] as string,
      req.params['bookingId'] as string,
      req.params['lineId'] as string,
      { saleStatus, quantity },
    );
    successResponse(res, line);
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
