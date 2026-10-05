import { param, body } from 'express-validator';

export const getShopInfoValidation = [
  param('slug').notEmpty().withMessage('slug is required'),
];

// cancelToken is always a randomUUID() (see booking.service createBooking*).
const tokenField = () =>
  body('token')
    .isString()
    .withMessage('token must be a string')
    .bail()
    .trim()
    .notEmpty()
    .withMessage('token is required')
    .bail()
    .isUUID()
    .withMessage('token is invalid');

export const cancelBookingValidation = [tokenField()];

export const rescheduleBookingValidation = [
  tokenField(),
  body('startTime')
    .isISO8601()
    .withMessage('startTime must be a valid ISO 8601 date'),
  body('staffId').optional({ values: 'null' }).isString(),
];
