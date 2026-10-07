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
// A phone number is the only identity there is, and anyone can type one. So:
// - a phone the shop does not know becomes a new customer at once;
// - a customer without a photo can get one at once;
// - anything that would CHANGE a customer the shop already has (their name,
//   email, phone number or photo) is kept as a change request, and applied
//   only when the owner or a manager accepts it. An email attached to someone
//   else's record would otherwise receive their booking emails.
// The answer is the same in every case, so it does not reveal whether a phone
// is a customer.

export interface CustomerProfileInput {
  name: string;
  // Already normalised by the validator. `phone` is the number the shop knows
  // them by; `newPhone` the one they want it changed to.
  phone: string;
  newPhone?: string;
  email?: string;
  photo?: { file: Buffer; crop: PhotoCrop };
  // Only the photo counts (the booking wizard's photo step).
  photoOnly?: boolean;
}

const isUniqueViolation = (err: unknown) =>
  err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';

const NO_PHOTO = { photoUrl: null, photoOriginalUrl: null, photoCrop: null };

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

  const signUp = shop.customerProfilePageEnabled && !input.photoOnly;
  const byPhone = (phone: string) =>
    prisma.customer.findUnique({
      where: { shopId_phone: { shopId: shop.id, phone } },
    });

  let customer = await byPhone(input.phone);
  // Someone the shop only knows by the number they say is their new one.
  if (!customer && signUp && input.newPhone)
    customer = await byPhone(input.newPhone);

  // New customers come from the sign-up page only. With just photos enabled
  // (the booking wizard's photo step), an unknown phone changes nothing.
  let created = false;
  if (!customer && signUp) {
    const phone = input.newPhone ?? input.phone;
    try {
      customer = await prisma.customer.create({
        data: {
          shopId: shop.id,
          name: input.name,
          phone,
          email: input.email || null,
        },
      });
      created = true;
      logger.info(`Customer signed up: ${customer.id} shop ${shop.id}`);
    } catch (err) {
      // Created in the meantime (a booking, a second tap): treat as existing.
      if (!isUniqueViolation(err)) throw err;
      customer = await byPhone(phone);
    }
  }
  if (!customer || customer.isSystem) return { saved: true };

  const photo = shop.customerPhotosEnabled ? input.photo : undefined;
  const store = (file: Buffer, crop: PhotoCrop) =>
    storePhoto({
      prefix: shopPrefix(shop.id),
      shape: 'square',
      label: 'customer',
      file,
      crop,
      current: NO_PHOTO,
    });

  // A first photo is added straight away.
  if (photo && !customer.photoUrl) {
    const { data } = await store(photo.file, photo.crop);
    const { count } = await prisma.customer.updateMany({
      where: { id: customer.id, photoUrl: null },
      data: { ...data, photoCrop: { ...data.photoCrop } },
    });
    // A photo was set in the meantime: that one stays.
    if (count === 0)
      await removeStoredFiles([data.photoUrl, data.photoOriginalUrl]);
    else logger.info(`Customer added a photo: ${customer.id} shop ${shop.id}`);
  }

  if (created || !signUp) return { saved: true };

  // Everything else they entered that differs from what the shop has waits
  // for the shop to accept it.
  const changes = {
    name: input.name !== customer.name ? input.name : null,
    phone:
      input.newPhone && input.newPhone !== customer.phone
        ? input.newPhone
        : null,
    email:
      input.email &&
      input.email.toLowerCase() !== (customer.email ?? '').toLowerCase()
        ? input.email
        : null,
  };
  const newPhoto = photo && customer.photoUrl ? photo : undefined;
  if (!changes.name && !changes.phone && !changes.email && !newPhoto)
    return { saved: true };

  const stored = newPhoto
    ? (await store(newPhoto.file, newPhoto.crop)).data
    : null;
  const fields = {
    ...changes,
    photoUrl: stored?.photoUrl ?? null,
    photoOriginalUrl: stored?.photoOriginalUrl ?? null,
    photoCrop: stored ? { ...stored.photoCrop } : Prisma.DbNull,
    createdAt: new Date(),
  };
  // One request per customer: the newest replaces what was waiting.
  const previous = await prisma.customerChangeRequest.findUnique({
    where: { customerId: customer.id },
  });
  await prisma.customerChangeRequest.upsert({
    where: { customerId: customer.id },
    update: fields,
    create: { shopId: shop.id, customerId: customer.id, ...fields },
  });
  await removeStoredFiles([previous?.photoUrl, previous?.photoOriginalUrl]);
  logger.info(`Customer asked for changes: ${customer.id} shop ${shop.id}`);

  return { saved: true };
};
