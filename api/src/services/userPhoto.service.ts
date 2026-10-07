import { Prisma } from '../../dist/generated/prisma';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { prisma } from '../utils/prisma';
import { USER_SELECT, toUserDto } from '../utils/userDto';
import {
  PHOTO_SELECT,
  PhotoCrop,
  copyPhoto,
  storePhoto,
} from './photo.service';
import { removeStoredFiles, shopPrefix, userPrefix } from './storage.service';

// The account's own photo. A team member starts with a copy of it (see
// inheritUserPhoto); after that the two are separate files, so changing one
// never touches the other.

export const setUserPhoto = async (
  userId: string,
  file: Buffer | undefined,
  crop: PhotoCrop,
) => {
  const current = await prisma.user.findUnique({
    where: { id: userId },
    select: PHOTO_SELECT,
  });
  if (!current) throw new AppError(404, 'User not found');
  const { data, stale } = await storePhoto({
    prefix: userPrefix(userId),
    shape: 'square',
    label: 'user',
    file,
    crop,
    current,
  });
  const user = await prisma.user.update({
    where: { id: userId },
    data: { ...data, photoCrop: { ...data.photoCrop } },
    select: USER_SELECT,
  });
  await removeStoredFiles(stale);

  logger.info(`Photo set for user ${userId}`);
  return toUserDto(user);
};

export const removeUserPhoto = async (userId: string) => {
  const current = await prisma.user.findUnique({
    where: { id: userId },
    select: PHOTO_SELECT,
  });
  if (!current) throw new AppError(404, 'User not found');
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      photoUrl: null,
      photoOriginalUrl: null,
      photoCrop: Prisma.DbNull,
    },
    select: USER_SELECT,
  });
  await removeStoredFiles([current.photoUrl, current.photoOriginalUrl]);

  logger.info(`Photo removed for user ${userId}`);
  return toUserDto(user);
};

/**
 * When a user joins a shop (creates it, or accepts an invite), their team
 * member starts with the account's photo, unless the shop already gave the
 * member one. It is copied into the shop's own files. Never fails the join:
 * the worst case is a member without a photo.
 */
export const inheritUserPhoto = async (userId: string, memberId: string) => {
  try {
    const [user, member] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: PHOTO_SELECT }),
      prisma.userShop.findUnique({
        where: { id: memberId },
        select: { shopId: true, photoUrl: true },
      }),
    ]);
    if (!user?.photoUrl || !member || member.photoUrl) return;

    const copy = await copyPhoto(user, shopPrefix(member.shopId), 'member');
    if (!copy) return;
    const { count } = await prisma.userShop.updateMany({
      where: { id: memberId, photoUrl: null },
      data: {
        photoUrl: copy.photoUrl,
        photoOriginalUrl: copy.photoOriginalUrl,
        photoCrop: copy.photoCrop
          ? { ...(copy.photoCrop as object) }
          : Prisma.DbNull,
      },
    });
    // The shop set a photo in the meantime: theirs stays.
    if (count === 0)
      await removeStoredFiles([copy.photoUrl, copy.photoOriginalUrl]);
  } catch (err) {
    logger.error(
      { err, userId, memberId },
      'Could not copy the account photo to the team member',
    );
  }
};
