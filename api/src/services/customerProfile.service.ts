import { Prisma } from '../../dist/generated/prisma';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { prisma } from '../utils/prisma';
import { bindDevice, customerOfDevice } from './customerDevice.service';
import { PhotoCrop, storePhoto } from './photo.service';
import { isShopLocked } from './plan.service';
import { removeStoredFiles, shopPrefix } from './storage.service';

// What a customer may do to their own profile without logging in: the shop's
// sign-up page (/<slug>/profile, usually opened from a QR code) and the photo
// step of the public booking wizard both end up here.
//
// Who they are is the browser's key (customerDevice.service.ts), never the
// phone they type:
// - a browser the shop knows is that customer, and changes their name, phone,
//   email and photo at once;
// - any other browser becomes a new customer, even with a phone the shop
//   already has. The shop sees the two records and merges them.
// The answer is the same in every case.

const isUniqueViolation = (err: unknown) =>
  err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';

export interface CustomerProfileInput {
  name: string;
  // Already normalised by the validator.
  phone: string;
  email?: string;
  photo?: { file: Buffer; crop: PhotoCrop };
  // Only the photo counts (the booking wizard's photo step).
  photoOnly?: boolean;
}

const activeShop = async (slug: string) => {
  const shop = await prisma.shop.findFirst({ where: { slug, isActive: true } });
  if (!shop) throw new AppError(404, 'Shop not found');
  return shop;
};

/** The customer this browser is at the shop, as the public pages show them: null when it is nobody yet. */
export const getOwnProfile = async (slug: string, deviceKey: string | null) => {
  const shop = await activeShop(slug);
  const customer = await customerOfDevice(prisma, shop.id, deviceKey);
  if (!customer) return { customer: null };
  return {
    customer: {
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      photoUrl: customer.photoUrl,
    },
  };
};

export const saveCustomerProfile = async (
  slug: string,
  input: CustomerProfileInput,
  deviceKey: string,
) => {
  const shop = await activeShop(slug);
  // With both settings off there is nothing here for the public.
  if (!shop.customerProfilePageEnabled && !shop.customerPhotosEnabled)
    throw new AppError(404, 'Shop not found');
  if (isShopLocked(shop))
    throw new AppError(
      403,
      'This shop is not taking sign-ups right now.',
      'SHOP_LOCKED',
    );

  const signUp = shop.customerProfilePageEnabled && !input.photoOnly;
  let customer = await customerOfDevice(prisma, shop.id, deviceKey);

  if (customer && signUp) {
    customer = await prisma.customer.update({
      where: { id: customer.id },
      data: {
        name: input.name,
        phone: input.phone,
        email: input.email || null,
      },
    });
    logger.info(`Customer changed own details: ${customer.id} shop ${shop.id}`);
  }
  // New customers come from the sign-up page only. With just photos enabled
  // (the booking wizard's photo step), an unknown browser changes nothing.
  if (!customer && signUp) {
    try {
      customer = await prisma.$transaction(async (tx) => {
        const created = await tx.customer.create({
          data: {
            shopId: shop.id,
            name: input.name,
            phone: input.phone,
            email: input.email || null,
          },
        });
        await bindDevice(tx, shop.id, created.id, deviceKey);
        return created;
      });
      logger.info(`Customer signed up: ${customer.id} shop ${shop.id}`);
    } catch (err) {
      // The browser became someone in the meantime (a second tap, a booking):
      // that customer it is.
      if (!isUniqueViolation(err)) throw err;
      customer = await customerOfDevice(prisma, shop.id, deviceKey);
    }
  }
  // The wizard's photo is of whoever the booking was for: when that is not
  // the customer this browser is (a booking for a friend), it is not theirs.
  if (!customer || (input.photoOnly && customer.phone !== input.phone))
    return { saved: true };

  if (shop.customerPhotosEnabled && input.photo) {
    const { data, stale } = await storePhoto({
      prefix: shopPrefix(shop.id),
      shape: 'square',
      label: 'customer',
      file: input.photo.file,
      crop: input.photo.crop,
      current: customer,
    });
    await prisma.customer.update({
      where: { id: customer.id },
      data: { ...data, photoCrop: { ...data.photoCrop } },
    });
    await removeStoredFiles(stale);
    logger.info(`Customer set own photo: ${customer.id} shop ${shop.id}`);
  }

  return { saved: true };
};
