import { param, body } from 'express-validator';

export const getShopInfoValidation = [
    param('slug').notEmpty().withMessage('Invite ID is required'),
];

export const cancelBookingValidation = [
  body('token').notEmpty().withMessage('token is required'),
];