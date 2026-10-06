import { param, body } from 'express-validator';
import { isInstant } from './common';

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
    .custom(isInstant)
    .withMessage('startTime must be an ISO 8601 timestamp with a UTC offset'),
  body('staffId').optional({ values: 'null' }).isString(),
];
