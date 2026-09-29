import { param, body } from 'express-validator';

export const getShopInfoValidation = [
  param('slug').notEmpty().withMessage('slug is required'),
];

export const cancelBookingValidation = [
  body('token')
    .notEmpty()
    .withMessage('token is required')
    .isString()
    .withMessage('token must be a string'),
];
