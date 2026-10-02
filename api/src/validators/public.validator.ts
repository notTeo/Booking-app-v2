import { param, body } from 'express-validator';

export const getShopInfoValidation = [
  param('slug').notEmpty().withMessage('slug is required'),
];

// cancelToken is always a randomUUID() (see booking.service createBooking*).
export const cancelBookingValidation = [
  body('token')
    .isString()
    .withMessage('token must be a string')
    .bail()
    .trim()
    .notEmpty()
    .withMessage('token is required')
    .bail()
    .isUUID()
    .withMessage('token is invalid'),
];
