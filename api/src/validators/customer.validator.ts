import { body, param, query } from 'express-validator';
import { NAME_MAX_LENGTH, NOTES_MAX_LENGTH, isPlausiblePhone } from './common';

export const customerParamsValidation = [
  param('shopId').notEmpty().withMessage('shopId is required'),
  param('customerId').notEmpty().withMessage('customerId is required'),
];

export const listCustomersValidation = [
  param('shopId').notEmpty().withMessage('shopId is required'),
  query('search').optional().trim(),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit must be between 1 and 100'),
  query('hasCustomDurations')
    .optional()
    .isBoolean()
    .withMessage('hasCustomDurations must be true or false'),
];

// The whole list is replaced; an empty list clears every custom duration.
export const setServiceDurationsValidation = [
  param('shopId').notEmpty().withMessage('shopId is required'),
  param('customerId').notEmpty().withMessage('customerId is required'),
  body('items').isArray({ max: 200 }).withMessage('items must be a list'),
  body('items.*.serviceId')
    .isString()
    .notEmpty()
    .withMessage('serviceId is required'),
  body('items.*.duration')
    .isInt({ min: 1, max: 1440 })
    .withMessage('Duration must be a whole number of minutes, 1 to 1440')
    .toInt(),
];

export const updateCustomerValidation = [
  param('shopId').notEmpty().withMessage('shopId is required'),
  param('customerId').notEmpty().withMessage('customerId is required'),
  body('name')
    .optional()
    .notEmpty()
    .withMessage('Name cannot be empty')
    .trim()
    .isLength({ max: NAME_MAX_LENGTH })
    .withMessage(`Name must be ${NAME_MAX_LENGTH} characters or fewer`),
  body('phone')
    .optional()
    .notEmpty()
    .withMessage('Phone cannot be empty')
    .trim()
    .custom(isPlausiblePhone)
    .withMessage('Phone must be a valid phone number'),
  body('email')
    .optional({ nullable: true })
    .isEmail()
    .withMessage('Invalid email')
    .isLength({ max: 254 })
    .withMessage('Email must be 254 characters or fewer'),
  body('notes')
    .optional({ nullable: true })
    .isString()
    .withMessage('notes must be a string')
    .trim()
    .isLength({ max: NOTES_MAX_LENGTH })
    .withMessage(`notes must be ${NOTES_MAX_LENGTH} characters or fewer`),
];

export const mergeCustomersValidation = [
  ...customerParamsValidation,
  body('sourceCustomerId')
    .isString()
    .notEmpty()
    .withMessage('sourceCustomerId is required'),
];

export const shopParamValidation = [
  param('shopId').notEmpty().withMessage('shopId is required'),
];

// Mirrors IMPORT_MAX_ROWS in customer.service.ts; each row is checked there,
// so one bad row is reported instead of failing the whole batch.
export const importCustomersValidation = [
  ...shopParamValidation,
  body('rows')
    .isArray({ min: 1, max: 500 })
    .withMessage('rows must be a list of 1 to 500 customers'),
];

export const listCustomerBookingsValidation = [
  ...customerParamsValidation,
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('limit must be between 1 and 50'),
];
