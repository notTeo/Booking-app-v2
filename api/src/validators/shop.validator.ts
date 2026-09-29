import { body, param } from 'express-validator';
import { checkSlug, SLUG_MESSAGES } from './slug';

export const createShopValidation = [
  body('name').notEmpty().withMessage('Name is required').trim(),
  body('slug')
    .trim()
    .notEmpty()
    .withMessage('Slug is required')
    .bail()
    .custom((value) => {
      const problem = checkSlug(value);
      if (problem) throw new Error(SLUG_MESSAGES[problem]);
      return true;
    }),
  body('description').optional().trim(),
  body('phone').optional().trim(),
  body('lat')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Invalid latitude'),
  body('lng')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Invalid longitude'),
  body('formattedAddress').optional().trim(),
  body('placeId').optional().trim(),
  body('timezone')
    .optional()
    .trim()
    .isIn((Intl as any).supportedValuesOf('timeZone'))
    .withMessage('Invalid timezone'),
  body('maxAdvanceDays')
    .optional()
    .isInt({ min: 1, max: 730 })
    .withMessage('maxAdvanceDays must be a whole number between 1 and 730')
    .toInt(),
];

export const updateShopValidation = [
  param('id').notEmpty().withMessage('Shop ID is required'),
  body('name').optional().notEmpty().withMessage('Name cannot be empty').trim(),
  // Immutable after creation: reject rather than silently ignore, so a stale
  // client can't believe a rename succeeded.
  body('slug')
    .not()
    .exists()
    .withMessage('Slug cannot be changed after creation'),
  body('description').optional().trim(),
  body('phone').optional().trim(),
  body('lat')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Invalid latitude'),
  body('lng')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Invalid longitude'),
  body('formattedAddress').optional().trim(),
  body('placeId').optional().trim(),
  body('timezone')
    .optional()
    .trim()
    .isIn((Intl as any).supportedValuesOf('timeZone'))
    .withMessage('Invalid timezone'),
  body('maxAdvanceDays')
    .optional()
    .isInt({ min: 1, max: 730 })
    .withMessage('maxAdvanceDays must be a whole number between 1 and 730')
    .toInt(),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
];

export const shopIdParamValidation = [
  param('id').notEmpty().withMessage('Shop ID is required'),
];
