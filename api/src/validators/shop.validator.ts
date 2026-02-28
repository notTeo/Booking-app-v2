import { body, param } from 'express-validator';

export const createShopValidation = [
  body('name').notEmpty().withMessage('Name is required').trim(),
  body('slug')
    .notEmpty()
    .withMessage('Slug is required')
    .matches(/^[a-z0-9-]+$/)
    .withMessage('Slug may only contain lowercase letters, numbers, and hyphens')
    .trim(),
  body('description').optional().trim(),
  body('phone').optional().trim(),
  body('address').optional().trim(),
  body('city').optional().trim(),
  body('country').optional().trim(),
  body('timezone')
    .optional()
    .trim()
    .isIn(Intl.supportedValuesOf('timeZone'))
    .withMessage('Invalid timezone'),
];

export const updateShopValidation = [
  param('id').notEmpty().withMessage('Shop ID is required'),
  body('name').optional().notEmpty().withMessage('Name cannot be empty').trim(),
  body('slug')
    .optional()
    .matches(/^[a-z0-9-]+$/)
    .withMessage('Slug may only contain lowercase letters, numbers, and hyphens')
    .trim(),
  body('description').optional().trim(),
  body('phone').optional().trim(),
  body('address').optional().trim(),
  body('city').optional().trim(),
  body('country').optional().trim(),
  body('timezone')
    .optional()
    .trim()
    .isIn(Intl.supportedValuesOf('timeZone'))
    .withMessage('Invalid timezone'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
];

export const shopIdParamValidation = [
  param('id').notEmpty().withMessage('Shop ID is required'),
];
