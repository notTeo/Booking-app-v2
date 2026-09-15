import { Request, Response, NextFunction } from 'express';
import { BookingStatus } from '../../dist/generated/prisma';
import { successResponse } from '../utils/response';
import { logger } from '../utils/logger';
import { sendBookingConfirmationEmail } from '../services/email.service';
import * as bookingService from '../services/booking.service';

export const createBooking = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId!;
    const shopId = req.params['shopId'] as string;
    const booking = await bookingService.createBookingForShop(userId, shopId, req.body);
    successResponse(res, booking, 201);

    // Owner/staff created this booking themselves, so only the customer needs
    // a confirmation email — no "new booking" notification back to the owner.
    if (booking.customer.email && booking.cancelToken) {
      sendBookingConfirmationEmail({
        email: booking.customer.email,
        customerName: booking.customer.name,
        shopName: booking.shop.name,
        serviceName: booking.service.name,
        staffName: booking.staff.user.name ?? 'Your staff member',
        startTime: booking.startTime,
        timezone: booking.shop.timezone,
        formattedAddress: booking.shop.formattedAddress,
        cancelToken: booking.cancelToken,
      }).catch((err) => logger.error(err, 'Failed to send booking confirmation email'));
    }
  } catch (err) {
    next(err);
  }
};

export const getAvailableSlots = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const shopId = req.params['shopId'] as string;
    const date = req.query['date'] as string;
    const staffId = req.query['staffId'] as string;
    const serviceId = req.query['serviceId'] as string;
    const slots = await bookingService.getAvailableSlots(shopId, date, staffId, serviceId);
    successResponse(res, slots);
  } catch (err) {
    next(err);
  }
};

export const listBookings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const shopId = req.params['shopId'] as string;
    const date = req.query['date'] as string | undefined;
    const status = req.query['status'] as BookingStatus | undefined;
    const staffId = req.query['staffId'] as string | undefined;
    const bookings = await bookingService.listBookings(shopId, { date, status, staffId });
    successResponse(res, bookings);
  } catch (err) {
    next(err);
  }
};

export const getBooking = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const shopId = req.params['shopId'] as string;
    const bookingId = req.params['bookingId'] as string;
    const booking = await bookingService.getBooking(shopId, bookingId);
    successResponse(res, booking);
  } catch (err) {
    next(err);
  }
};

export const updateBooking = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const shopId = req.params['shopId'] as string;
    const bookingId = req.params['bookingId'] as string;
    const booking = await bookingService.updateBooking(shopId, bookingId, req.body);
    successResponse(res, booking);
  } catch (err) {
    next(err);
  }
};

export const deleteBooking = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const shopId = req.params['shopId'] as string;
    const bookingId = req.params['bookingId'] as string;
    await bookingService.deleteBooking(shopId, bookingId);
    successResponse(res, { deleted: true });
  } catch (err) {
    next(err);
  }
};

export const updateBookingStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const shopId = req.params['shopId'] as string;
    const bookingId = req.params['bookingId'] as string;
    const { status } = req.body as { status: BookingStatus };
    const booking = await bookingService.updateBookingStatus(shopId, bookingId, status);
    successResponse(res, booking);
  } catch (err) {
    next(err);
  }
};
