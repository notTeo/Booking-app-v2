import { Prisma } from '../../dist/generated/prisma';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { prisma } from '../utils/prisma';
import { PhotoCrop, storePhoto } from './photo.service';
import { isShopLocked } from './plan.service';
import { removeStoredFiles, shopPrefix } from './storage.service';

// What a customer may do to their own profile without logging in: the shop's
// sign-up page (/<slug>/profile, usually opened from a QR code) and the photo
// step of the public booking wizard both end up here.
//
// A phone number is the only identity there is, and anyone can type one. So
// this only ever adds: a phone the shop does not know becomes a new customer,
// and a customer without a photo can get one. A name, an email or a photo that
// is already there is never changed (an email could otherwise be attached to
// someone else's record to receive their booking emails). The answer is the
// same in every case, so it does not reveal whether a phone is a customer.

export interface CustomerProfileInput {
  name: string;
  phone: string; // already normalised by the validator
  email?: string;
  photo?: { file: Buffer; crop: PhotoCrop };
}

const isUniqueViolation = (err: unknown) =>
  err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';

export const saveCustomerProfile = async (
  slug: string,
  input: CustomerProfileInput,
) => {
  const shop = await prisma.shop.findFirst({ where: { slug, isActive: true } });
  // With both settings off there is nothing here for the public.
  if (
    !shop ||
    (!shop.customerProfilePageEnabled && !shop.customerPhotosEnabled)
  )
    throw new AppError(404, 'Shop not found');
  if (isShopLocked(shop))
    throw new AppError(
      403,
      'This shop is not taking sign-ups right now.',
      'SHOP_LOCKED',
    );

  const where = { shopId_phone: { shopId: shop.id, phone: input.phone } };
  let customer = await prisma.customer.findUnique({ where });

  // New customers come from the sign-up page only. With just photos enabled
  // (the booking wizard's photo step), an unknown phone changes nothing.
  if (!customer && shop.customerProfilePageEnabled) {
    try {
      customer = await prisma.customer.create({
        data: {
          shopId: shop.id,
          name: input.name,
          phone: input.phone,
          email: input.email || null,
        },
      });
      logger.info(`Customer signed up: ${customer.id} shop ${shop.id}`);
    } catch (err) {
      // Created in the meantime (a booking, a second tap): treat as existing.
      if (!isUniqueViolation(err)) throw err;
      customer = await prisma.customer.findUnique({ where });
    }
  }

  if (
    customer &&
    !customer.isSystem &&
    !customer.photoUrl &&
    input.photo &&
    shop.customerPhotosEnabled
  ) {
    const { data } = await storePhoto({
      prefix: shopPrefix(shop.id),
      shape: 'square',
      label: 'customer',
      file: input.photo.file,
      crop: input.photo.crop,
      current: { photoUrl: null, photoOriginalUrl: null, photoCrop: null },
    });
    const { count } = await prisma.customer.updateMany({
      where: { id: customer.id, photoUrl: null },
      data: { ...data, photoCrop: { ...data.photoCrop } },
    });
    // A photo was set in the meantime: that one stays.
    if (count === 0)
      await removeStoredFiles([data.photoUrl, data.photoOriginalUrl]);
    else logger.info(`Customer added a photo: ${customer.id} shop ${shop.id}`);
  }

  return { saved: true };
};
