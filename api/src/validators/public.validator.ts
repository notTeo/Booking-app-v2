import { param, body } from 'express-validator';
import {
  NAME_MAX_LENGTH,
  isInstant,
  isPlausiblePhone,
  normalizePhone,
} from './common';

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

// The public sign-up page's form. It arrives as multipart (the optional photo
// and its crop are read by photoUpload and the controller).
export const customerProfileValidation = [
  param('slug').notEmpty().withMessage('slug is required'),
  body('name')
    .isString()
    .withMessage('Name is required')
    .bail()
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ max: NAME_MAX_LENGTH })
    .withMessage(`Name must be ${NAME_MAX_LENGTH} characters or fewer`),
  body('phone')
    .isString()
    .withMessage('Phone is required')
    .bail()
    .trim()
    .custom(isPlausiblePhone)
    .withMessage('Phone must be a valid phone number')
    .customSanitizer(normalizePhone),
  body('email')
    .optional({ values: 'falsy' })
    .isEmail()
    .withMessage('Invalid email')
    .isLength({ max: 254 })
    .withMessage('Email must be 254 characters or fewer'),
];
