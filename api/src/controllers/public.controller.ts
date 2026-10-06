import { parseLocale } from '../utils/locale';
import { Request, Response, NextFunction } from 'express';
import { successResponse } from '../utils/response';
import { logger } from '../utils/logger';
import { getShopInfoService } from '../services/public.service';
import {
  createBooking as createBookingService,
  cancelBookingByToken,
  findBookingIdByToken,
  getAvailableSlots,
  getBookingByToken,
  rescheduleBookingByToken,
} from '../services/booking.service';
import {
  sendBookingConfirmationEmail,
  sendBookingRescheduledEmail,
  sendBookingRescheduledNotificationEmail,
  sendCancellationConfirmationEmail,
  sendNewBookingNotificationEmail,
} from '../services/email.service';
import { bookingEmailParams } from '../utils/bookingEmail';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { isPlausiblePhone } from '../validators/common';

export const getShopInfo = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const slug = req.params.slug as string;
    const data = await getShopInfoService({ slug });
    successResponse(res, data, 200);
  } catch (err) {
    next(err);
  }
};

export const createBooking = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const slug = req.params.slug as string;
    const booking = await createBookingService(slug, req.body);
    // Anonymous caller: never echo the booking row (cancelToken, staff email,
    // customer and shop data). The emails below use the full row server-side.
    successResponse(
      res,
      {
        id: booking.id,
        status: booking.status,
        startTime: booking.startTime,
        endTime: booking.endTime,
      },
      201,
    );

    const emailParams = bookingEmailParams(booking);
    if (emailParams) {
      sendBookingConfirmationEmail(emailParams).catch((err) =>
        logger.error(err, 'Failed to send booking confirmation email'),
      );
    }

    prisma.userShop
      .findFirst({
        where: { shopId: booking.shopId, role: 'owner' },
        include: { user: { select: { locale: true } } },
      })
      .then((owner) => {
        if (!owner?.email) return;
        return sendNewBookingNotificationEmail({
          email: owner.email,
          customerName: booking.customer.name,
          customerPhone: booking.customer.phone,
          shopName: booking.shop.name,
          serviceName: booking.service.name,
          staffName: booking.staff.name ?? 'Staff',
          startTime: booking.startTime,
          timezone: booking.shop.timezone,
          // The owner's own language, not the customer's.
          locale: parseLocale(owner.user?.locale),
        });
      })
      .catch((err) =>
        logger.error(err, 'Failed to send new booking notification email'),
      );
  } catch (err) {
    next(err);
  }
};

export const cancelBooking = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
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
        locale: parseLocale(booking.locale),
      }).catch((err) =>
        logger.error(err, 'Failed to send cancellation confirmation email'),
      );
    }
  } catch (err) {
    next(err);
  }
};

// What a customer holding the email link may see and do. The token is the
// only credential, so this stays to what the cancel/reschedule pages show.
export const getBookingForCustomer = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { booking, cancelBlock, rescheduleBlock } = await getBookingByToken(
      req.body.token as string,
    );
    successResponse(res, {
      id: booking.id,
      status: booking.status,
      startTime: booking.startTime,
      endTime: booking.endTime,
      customerName: booking.customer.name,
      shop: {
        slug: booking.shop.slug,
        name: booking.shop.name,
        timezone: booking.shop.timezone,
      },
      service: {
        id: booking.service.id,
        name: booking.service.name,
        duration: booking.service.duration,
        price: booking.service.price,
      },
      staff: { id: booking.staff.id, name: booking.staff.name },
      rescheduledTo: booking.rescheduledTo
        ? { startTime: booking.rescheduledTo.startTime }
        : null,
      cancel: {
        allowed: !cancelBlock,
        reason: cancelBlock,
        cutoffHours: booking.shop.cancelCutoffHours,
      },
      reschedule: {
        allowed: !rescheduleBlock,
        reason: rescheduleBlock,
        cutoffHours: booking.shop.rescheduleCutoffHours,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const rescheduleBooking = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { booking, previous } = await rescheduleBookingByToken(
      req.body.token as string,
      req.body,
    );
    // Anonymous caller: never echo the row (it carries the new cancelToken).
    successResponse(res, {
      id: booking.id,
      status: booking.status,
      startTime: booking.startTime,
      endTime: booking.endTime,
      shopName: booking.shop.name,
      serviceName: booking.service.name,
      staffName: booking.staff.name,
    });

    const emailParams = bookingEmailParams(booking);
    if (emailParams) {
      sendBookingRescheduledEmail({
        ...emailParams,
        previousStartTime: previous.startTime,
      }).catch((err) =>
        logger.error(err, 'Failed to send booking rescheduled email'),
      );
    }

    prisma.userShop
      .findFirst({
        where: { shopId: booking.shopId, role: 'owner' },
        include: { user: { select: { locale: true } } },
      })
      .then((owner) => {
        if (!owner?.email) return;
        return sendBookingRescheduledNotificationEmail({
          email: owner.email,
          customerName: booking.customer.name,
          customerPhone: booking.customer.phone,
          shopName: booking.shop.name,
          serviceName: booking.service.name,
          staffName: booking.staff.name ?? 'Staff',
          startTime: booking.startTime,
          previousStartTime: previous.startTime,
          timezone: booking.shop.timezone,
          // The owner's own language, not the customer's.
          locale: parseLocale(owner.user?.locale),
        });
      })
      .catch((err) =>
        logger.error(err, 'Failed to send booking rescheduled notification'),
      );
  } catch (err) {
    next(err);
  }
};

export const getPublicSlots = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const slug = req.params.slug as string;
    const date = req.query['date'] as string;
    const staffId = (req.query['staffId'] as string) ?? null;
    const serviceId = req.query['serviceId'] as string;
    const rescheduleToken = req.query['rescheduleToken'] as string | undefined;
    const phone = req.get('x-customer-phone')?.trim();
    const shop = await prisma.shop.findUnique({
      where: { slug, isActive: true },
      select: { id: true },
    });
    if (!shop) throw new AppError(404, 'Shop not found');

    const slots = await getAvailableSlots(
      shop.id,
      date,
      staffId,
      serviceId,
      // Always the customer-facing view. Owner/staff availability lives on the
      // authenticated GET /api/shops/:shopId/bookings/slots.
      'public',
      // A customer rescheduling: their own booking must not block its slot.
      // Otherwise a returning customer may say who they are, so the times
      // offered fit their own duration for the service. Sent as a header to
      // keep the phone out of URLs and access logs; whether it is known is
      // never revealed, and a malformed one is ignored.
      rescheduleToken
        ? { forBookingId: await findBookingIdByToken(shop.id, rescheduleToken) }
        : isPlausiblePhone(phone)
          ? { customer: { phone: phone as string } }
          : {},
    );
    successResponse(res, slots);
  } catch (err) {
    next(err);
  }
};
