import { parseServiceIds } from '../utils/bookingServices';
import { parseLocale } from '../utils/locale';
import { Request, Response, NextFunction } from 'express';
import { successResponse } from '../utils/response';
import { logger } from '../utils/logger';
import { getShopInfoService } from '../services/public.service';
import { saveCustomerProfile as saveCustomerProfileService } from '../services/customerProfile.service';
import { parseCrop } from '../services/photo.service';
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
import {
  bookingServiceNames,
  bookingServicesPrice,
} from '../utils/bookingServices';
import { AppError } from '../middleware/errorHandler';
import { isPlausiblePhone, normalizePhone } from '../validators/common';

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
        servicePrice: bookingServicesPrice(booking),
        services: booking.services.map(({ name, duration, price }) => ({
          name,
          duration,
          price,
        })),
        products: booking.products
          .filter((p) => p.quantity > 0)
          .map(({ name, quantity, unitPrice }) => ({
            name,
            quantity,
            unitPrice,
          })),
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
          serviceName: bookingServiceNames(booking),
          staffName: booking.staff.name ?? 'Staff',
          startTime: booking.startTime,
          timezone: booking.shop.timezone,
          products: booking.products.filter((p) => p.quantity > 0),
          servicePrice: bookingServicesPrice(booking),
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
      serviceName: bookingServiceNames(booking),
      startTime: booking.startTime,
      customerName: booking.customer.name,
    });

    if (booking.customer.email) {
      sendCancellationConfirmationEmail({
        email: booking.customer.email,
        customerName: booking.customer.name,
        shopName: booking.shop.name,
        serviceName: bookingServiceNames(booking),
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
        publicPalette: booking.shop.publicPalette,
        publicFont: booking.shop.publicFont,
      },
      service: {
        id: booking.service.id,
        name: booking.service.name,
        duration: booking.service.duration,
        price: booking.service.price,
      },
      staff: { id: booking.staff.id, name: booking.staff.name },
      services: booking.services.map(
        ({ serviceId, name, duration, price }) => ({
          id: serviceId,
          name,
          duration,
          price,
        }),
      ),
      products: booking.products
        .filter((p) => p.quantity > 0)
        .map(({ name, quantity, unitPrice }) => ({
          name,
          quantity,
          unitPrice,
        })),
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
    const serviceIds = parseServiceIds(req.query['serviceIds']);
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
      // offered fit their own duration for the service ("continue as" in the
      // first step of the wizard; skipping it sends no phone and gets the
      // default durations). Sent as a header to keep the phone out of URLs and
      // access logs; a malformed one is ignored. A known phone with a personal
      // duration does get a different grid from an unknown one, which tells
      // the two apart: accepted by design (audit TI-05).
      {
        ...(serviceIds && { serviceIds }),
        ...(rescheduleToken
          ? {
              forBookingId: await findBookingIdByToken(
                shop.id,
                rescheduleToken,
              ),
            }
          : isPlausiblePhone(phone)
            ? { customer: { phone: normalizePhone(phone as string) } }
            : {}),
      },
    );
    successResponse(res, slots);
  } catch (err) {
    next(err);
  }
};

export const saveCustomerProfile = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { name, phone, email } = req.body;
    const data = await saveCustomerProfileService(req.params.slug as string, {
      name,
      phone,
      email: email || undefined,
      ...(req.file && {
        photo: { file: req.file.buffer, crop: parseCrop(req.body.crop) },
      }),
    });
    successResponse(res, data);
  } catch (err) {
    next(err);
  }
};
