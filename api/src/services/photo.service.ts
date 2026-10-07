import { randomBytes } from 'crypto';
import sharp from 'sharp';
import { AppError } from '../middleware/errorHandler';
import { mediaKey, mediaUrl, storage } from './storage.service';

// One photo pipeline for the shop, team members, products and accounts. The upload is
// validated and resized here; callers store the three returned values and
// then delete the files in `stale`.

export const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
// Decoded size limit, so a tiny file cannot expand into a huge bitmap.
const MAX_INPUT_PIXELS = 50_000_000;
const ORIGINAL_MAX_SIDE = 2048;
const ALLOWED_FORMATS = ['jpeg', 'png', 'webp'];

// 'cover' is the wide shop photo; 'square' is a person or a product.
const OUTPUT_SIZE = {
  cover: { width: 1600, height: 900 },
  square: { width: 640, height: 640 },
} as const;
export type PhotoShape = keyof typeof OUTPUT_SIZE;

// The part of the original that is shown, as fractions (0–1) of its size.
export interface PhotoCrop {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface StoredPhoto {
  photoUrl: string | null;
  photoOriginalUrl: string | null;
  photoCrop: unknown;
}

export const PHOTO_SELECT = {
  photoUrl: true,
  photoOriginalUrl: true,
  photoCrop: true,
} as const;

const invalidCrop = () =>
  new AppError(400, 'The crop area is not valid', 'PHOTO_INVALID_CROP');

// The crop arrives as a JSON string in a multipart field (or as an object in
// a JSON body, when an existing photo is only re-cropped).
export const parseCrop = (raw: unknown): PhotoCrop => {
  let value = raw;
  if (typeof raw === 'string') {
    try {
      value = JSON.parse(raw);
    } catch {
      throw invalidCrop();
    }
  }
  if (!value || typeof value !== 'object') throw invalidCrop();
  const { x, y, width, height } = value as Record<string, unknown>;
  const nums = [x, y, width, height];
  if (!nums.every((n) => typeof n === 'number' && Number.isFinite(n)))
    throw invalidCrop();
  const crop = { x, y, width, height } as PhotoCrop;
  // A little slack for rounding in the editor; clamped when applied.
  const slack = 0.001;
  if (
    crop.x < -slack ||
    crop.y < -slack ||
    crop.width <= 0 ||
    crop.height <= 0 ||
    crop.x + crop.width > 1 + slack ||
    crop.y + crop.height > 1 + slack
  )
    throw invalidCrop();
  return crop;
};

const invalidType = () =>
  new AppError(
    400,
    'The photo must be a JPEG, PNG or WebP image',
    'PHOTO_INVALID_TYPE',
  );

// What the file really is, whatever its name or declared type says.
const normaliseOriginal = async (file: Buffer): Promise<Buffer> => {
  if (file.length > MAX_PHOTO_BYTES)
    throw new AppError(413, 'The photo is too large', 'PHOTO_TOO_LARGE');
  try {
    const image = sharp(file, { limitInputPixels: MAX_INPUT_PIXELS });
    const meta = await image.metadata();
    if (!meta.format || !ALLOWED_FORMATS.includes(meta.format))
      throw invalidType();
    return await image
      .rotate() // apply the camera's orientation, then drop the metadata
      .resize({
        width: ORIGINAL_MAX_SIDE,
        height: ORIGINAL_MAX_SIDE,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 90 })
      .toBuffer();
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw invalidType();
  }
};

const cropOriginal = async (
  original: Buffer,
  crop: PhotoCrop,
  shape: PhotoShape,
): Promise<Buffer> => {
  const meta = await sharp(original).metadata();
  const fullW = meta.width ?? 0;
  const fullH = meta.height ?? 0;
  if (!fullW || !fullH) throw invalidType();
  const left = Math.min(Math.max(Math.round(crop.x * fullW), 0), fullW - 1);
  const top = Math.min(Math.max(Math.round(crop.y * fullH), 0), fullH - 1);
  const width = Math.max(
    1,
    Math.min(Math.round(crop.width * fullW), fullW - left),
  );
  const height = Math.max(
    1,
    Math.min(Math.round(crop.height * fullH), fullH - top),
  );
  return sharp(original)
    .extract({ left, top, width, height })
    .resize({ ...OUTPUT_SIZE[shape], fit: 'cover' })
    .webp({ quality: 82 })
    .toBuffer();
};

const newKey = (prefix: string, label: string) =>
  `${prefix}${label}-${randomBytes(12).toString('hex')}.webp`;

/**
 * Stores a new photo, or re-crops the current one when no file is sent.
 * Returns the columns to save and the files that saving them makes stale.
 */
export const storePhoto = async (input: {
  // The owner's folder: shopPrefix(shopId) or userPrefix(userId).
  prefix: string;
  shape: PhotoShape;
  // 'shop', 'member', 'product' or 'user': only makes the file names readable.
  label: string;
  file?: Buffer;
  crop: PhotoCrop;
  current: StoredPhoto;
}) => {
  const { prefix, shape, label, file, crop, current } = input;

  let original: Buffer;
  let photoOriginalUrl: string;
  const stale = [current.photoUrl];
  const written: string[] = [];

  if (file) {
    original = await normaliseOriginal(file);
    const key = newKey(prefix, `${label}-original`);
    await storage.put(key, original, 'image/webp');
    written.push(key);
    photoOriginalUrl = mediaUrl(key);
    stale.push(current.photoOriginalUrl);
  } else {
    const key = mediaKey(current.photoOriginalUrl);
    const stored = key ? await storage.get(key) : null;
    if (!stored || !current.photoOriginalUrl)
      throw new AppError(400, 'Choose a photo to upload', 'PHOTO_REQUIRED');
    original = stored;
    photoOriginalUrl = current.photoOriginalUrl;
  }

  try {
    const cropped = await cropOriginal(original, crop, shape);
    const key = newKey(prefix, label);
    await storage.put(key, cropped, 'image/webp');
    return {
      data: { photoUrl: mediaUrl(key), photoOriginalUrl, photoCrop: crop },
      stale,
    };
  } catch (err) {
    await storage.remove(written).catch(() => undefined);
    throw err;
  }
};

/**
 * A photo's files copied into another folder, as the columns to save there.
 * The copy is independent: replacing or removing either one leaves the other.
 * null when the source's shown file is missing.
 */
export const copyPhoto = async (
  source: StoredPhoto,
  prefix: string,
  label: string,
): Promise<StoredPhoto | null> => {
  const shownKey = mediaKey(source.photoUrl);
  const shown = shownKey ? await storage.get(shownKey) : null;
  if (!shown) return null;
  const originalKey = mediaKey(source.photoOriginalUrl);
  const original = originalKey ? await storage.get(originalKey) : null;

  const key = newKey(prefix, label);
  await storage.put(key, shown, 'image/webp');
  // Without the original the copy cannot be re-cropped, only replaced.
  if (!original)
    return { photoUrl: mediaUrl(key), photoOriginalUrl: null, photoCrop: null };
  const copyOfOriginal = newKey(prefix, `${label}-original`);
  try {
    await storage.put(copyOfOriginal, original, 'image/webp');
  } catch (err) {
    await storage.remove([key]).catch(() => undefined);
    throw err;
  }
  return {
    photoUrl: mediaUrl(key),
    photoOriginalUrl: mediaUrl(copyOfOriginal),
    photoCrop: source.photoCrop,
  };
};
