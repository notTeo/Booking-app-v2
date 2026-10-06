import client from './client';

/** The part of the original photo that is shown, as fractions (0–1) of its size. */
export interface PhotoCrop {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** What anything with a photo carries: the shown image, and what it was cut from (to re-edit it). */
export interface PhotoFields {
  photoUrl: string | null;
  photoOriginalUrl: string | null;
  photoCrop: PhotoCrop | null;
}

export const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
export const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/** Uploads a new photo, or (without a file) a new crop of the stored one. */
export const putPhoto = <T>(url: string, file: File | null, crop: PhotoCrop) => {
  const form = new FormData();
  form.append('crop', JSON.stringify(crop));
  if (file) form.append('photo', file);
  return client.put(url, form).then((r) => r.data.data as T);
};

export const deletePhoto = <T>(url: string) =>
  client.delete(url).then((r) => r.data.data as T);
