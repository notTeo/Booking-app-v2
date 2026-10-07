import type { PhotoCrop } from '../api/photo.api';

const PREVIEW_SIDE = 256;

/** The pixels of a `width` x `height` image that a crop (fractions of its size) covers. */
export const cropPixels = (crop: PhotoCrop, width: number, height: number) => {
  const clamp = (value: number, max: number) => Math.min(Math.max(value, 0), max);
  const x = clamp(Math.round(crop.x * width), width - 1);
  const y = clamp(Math.round(crop.y * height), height - 1);
  return {
    x,
    y,
    width: clamp(Math.round(crop.width * width), width - x) || 1,
    height: clamp(Math.round(crop.height * height), height - y) || 1,
  };
};

/** A small square picture of the cropped part of an image, as a data URL. */
export const cropPreview = (src: string, crop: PhotoCrop): Promise<string> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = PREVIEW_SIDE;
      canvas.height = PREVIEW_SIDE;
      const context = canvas.getContext('2d');
      if (!context) return reject(new Error('no canvas'));
      const area = cropPixels(crop, image.naturalWidth, image.naturalHeight);
      context.drawImage(image, area.x, area.y, area.width, area.height, 0, 0, PREVIEW_SIDE, PREVIEW_SIDE);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    image.onerror = () => reject(new Error('image failed to load'));
    image.src = src;
  });
