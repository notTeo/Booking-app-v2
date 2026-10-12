import { parseServiceIds } from '../utils/bookingServices';
import { parseLocale } from '../utils/locale';
import { Request, Response, NextFunction } from 'express';
import { successResponse } from '../utils/response';
import { logger } from '../utils/logger';
import { getShopInfoService } from '../services/public.service';
import {
  getOwnProfile as getOwnProfileService,
  saveCustomerProfile as saveCustomerProfileService,
} from '../services/customerProfile.service';
import {
  customerOfDevice,
  newDeviceKey,
  readDeviceKey,
  setDeviceCookie,
} from '../services/customerDevice.service';
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
    const { guest, ...body } = req.body;
    // The browser's key: the one it has, or a new one it becomes known by.
    const deviceKey = readDeviceKey(req) ?? (guest ? null : newDeviceKey());
    const booking = await createBookingService(slug, body, {
      key: deviceKey,
      guest: guest === true,
    });
    if (deviceKey) setDeviceCookie(res, deviceKey);
    // Anonymous caller: never echo the booking row (staff email, customer and
    // shop data). The emails below use the full row server-side. The cancel
    // token does go back: it is this booking's key, and whoever made the
    // booking may cancel it, with or without an email to get the link in.
    successResponse(
      res,
      {
        id: booking.id,
        cancelToken: booking.cancelToken,
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
    const guest = String(req.query['guest']) === 'true';
    const shop = await prisma.shop.findUnique({
      where: { slug, isActive: true },
      select: { id: true },
    });
    if (!shop) throw new AppError(404, 'Shop not found');
    const known =
      guest || rescheduleToken
        ? null
        : await customerOfDevice(prisma, shop.id, readDeviceKey(req));

    const slots = await getAvailableSlots(
      shop.id,
      date,
      staffId,
      serviceId,
      // Always the customer-facing view. Owner/staff availability lives on the
      // authenticated GET /api/shops/:shopId/bookings/slots.
      'public',
      // A customer rescheduling: their own booking must not block its slot.
      // Otherwise a returning customer (the one this browser is) gets the
      // times that fit their own duration for the service, unless they said
      // they are someone else ("Not you?").
      {
        ...(serviceIds && { serviceIds }),
        ...(rescheduleToken
          ? {
              forBookingId: await findBookingIdByToken(
                shop.id,
                rescheduleToken,
              ),
            }
          : known
            ? { customer: { customerId: known.id } }
            : {}),
      },
    );
    successResponse(res, slots);
  } catch (err) {
    next(err);
  }
};

// The customer this browser is at the shop (null for one it has not seen),
// for the public pages to greet them and fill in their details.
export const getOwnProfile = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const deviceKey = readDeviceKey(req);
    const data = await getOwnProfileService(
      req.params.slug as string,
      deviceKey,
    );
    if (deviceKey && data.customer) setDeviceCookie(res, deviceKey);
    // Someone's own details: not for any cache to keep.
    res.set('Cache-Control', 'no-store');
    successResponse(res, data);
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
    const { name, phone, email, photoOnly } = req.body;
    const deviceKey = readDeviceKey(req) ?? newDeviceKey();
    const data = await saveCustomerProfileService(
      req.params.slug as string,
      {
        name,
        phone,
        email: email || undefined,
        photoOnly: photoOnly === true,
        ...(req.file && {
          photo: { file: req.file.buffer, crop: parseCrop(req.body.crop) },
        }),
      },
      deviceKey,
    );
    setDeviceCookie(res, deviceKey);
    successResponse(res, data);
  } catch (err) {
    next(err);
  }
};
