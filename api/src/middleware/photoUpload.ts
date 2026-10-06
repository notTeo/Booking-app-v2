import { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { AppError } from './errorHandler';
import { MAX_PHOTO_BYTES } from '../services/photo.service';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_PHOTO_BYTES, files: 1, fields: 5 },
}).single('photo');

// Reads the one `photo` file of a multipart request into memory (req.file).
// The file is optional: a request without one re-crops the stored photo.
export const photoUpload = (req: Request, res: Response, next: NextFunction) =>
  upload(req, res, (err: unknown) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      return next(
        err.code === 'LIMIT_FILE_SIZE'
          ? new AppError(413, 'The photo is too large', 'PHOTO_TOO_LARGE')
          : new AppError(
              400,
              'The upload is not valid',
              'PHOTO_INVALID_UPLOAD',
            ),
      );
    }
    next(err);
  });
