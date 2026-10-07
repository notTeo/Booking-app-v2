import { body, param } from 'express-validator';
import {
  DESCRIPTION_MAX_LENGTH,
  NAME_MAX_LENGTH,
  PRICE_MAX_CENTS,
} from './common';

export const shopIdParamValidation = [
  param('shopId').notEmpty().withMessage('shopId is required'),
];

export const createServiceValidation = [
  param('shopId').notEmpty().withMessage('shopId is required'),
  body('name')
    .isString()
    .withMessage('Name is required')
    .bail()
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ max: NAME_MAX_LENGTH })
    .withMessage(`Name must be ${NAME_MAX_LENGTH} characters or fewer`),
  body('description')
    .optional()
    .isString()
    .withMessage('Description must be text')
    .bail()
    .trim()
    .isLength({ max: DESCRIPTION_MAX_LENGTH })
    .withMessage(
      `Description must be ${DESCRIPTION_MAX_LENGTH} characters or fewer`,
    ),
  body('duration')
    .notEmpty()
    .withMessage('Duration is required')
    .isInt({ min: 1, max: 1440 })
    .withMessage('Duration must be a whole number of minutes, 1 to 1440'),
  body('price')
    .notEmpty()
    .withMessage('Price is required')
    .isInt({ min: 0, max: PRICE_MAX_CENTS })
    .withMessage('Price must be a non-negative integer (cents)'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
  body('showOnPublicPage')
    .optional()
    .isBoolean()
    .withMessage('showOnPublicPage must be a boolean'),
];

export const updateServiceValidation = [
  param('shopId').notEmpty().withMessage('shopId is required'),
  param('serviceId').notEmpty().withMessage('serviceId is required'),
  body('name')
    .optional()
    .isString()
    .withMessage('Name cannot be empty')
    .bail()
    .trim()
    .notEmpty()
    .withMessage('Name cannot be empty')
    .isLength({ max: NAME_MAX_LENGTH })
    .withMessage(`Name must be ${NAME_MAX_LENGTH} characters or fewer`),
  body('description')
    .optional()
    .isString()
    .withMessage('Description must be text')
    .bail()
    .trim()
    .isLength({ max: DESCRIPTION_MAX_LENGTH })
    .withMessage(
      `Description must be ${DESCRIPTION_MAX_LENGTH} characters or fewer`,
    ),
  body('duration')
    .optional()
    .isInt({ min: 1, max: 1440 })
    .withMessage('Duration must be a whole number of minutes, 1 to 1440'),
  body('price')
    .optional()
    .isInt({ min: 0, max: PRICE_MAX_CENTS })
    .withMessage('Price must be a non-negative integer (cents)'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
  body('showOnPublicPage')
    .optional()
    .isBoolean()
    .withMessage('showOnPublicPage must be a boolean'),
];

export const serviceParamsValidation = [
  param('shopId').notEmpty().withMessage('shopId is required'),
  param('serviceId').notEmpty().withMessage('serviceId is required'),
];

export const assignStaffValidation = [
  param('shopId').notEmpty().withMessage('shopId is required'),
  param('serviceId').notEmpty().withMessage('serviceId is required'),
  body('userShopId').notEmpty().withMessage('userShopId is required'),
];

export const unassignStaffValidation = [
  param('shopId').notEmpty().withMessage('shopId is required'),
  param('serviceId').notEmpty().withMessage('serviceId is required'),
  param('userShopId').notEmpty().withMessage('userShopId is required'),
];
