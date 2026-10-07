import { body, param, query } from 'express-validator';
import {
  NAME_MAX_LENGTH,
  NOTES_MAX_LENGTH,
  isPlausiblePhone,
  normalizePhone,
} from './common';

// Far beyond any real customer list; keeps the offset inside a 32-bit int.
const MAX_PAGE = 100_000;

export const customerParamsValidation = [
  param('shopId').notEmpty().withMessage('shopId is required'),
  param('customerId').notEmpty().withMessage('customerId is required'),
];

export const listCustomersValidation = [
  param('shopId').notEmpty().withMessage('shopId is required'),
  query('search')
    .optional()
    .isString()
    .withMessage('search must be text')
    .bail()
    .trim()
    .isLength({ max: NAME_MAX_LENGTH })
    .withMessage(`search must be ${NAME_MAX_LENGTH} characters or fewer`),
  query('page')
    .optional()
    .isInt({ min: 1, max: MAX_PAGE })
    .withMessage(`page must be between 1 and ${MAX_PAGE}`),
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

// The fields a customer is created or edited with. On create, name and phone
// are required; on update every field is optional.
const customerFields = (required: boolean) => {
  const name = body('name');
  const phone = body('phone');
  return [
    (required ? name : name.optional())
      .isString()
      .withMessage('Name must be text')
      .bail()
      .trim()
      .notEmpty()
      .withMessage(required ? 'Name is required' : 'Name cannot be empty')
      .isLength({ max: NAME_MAX_LENGTH })
      .withMessage(`Name must be ${NAME_MAX_LENGTH} characters or fewer`),
    (required ? phone : phone.optional())
      .isString()
      .withMessage('Phone must be text')
      .bail()
      .trim()
      .notEmpty()
      .withMessage(required ? 'Phone is required' : 'Phone cannot be empty')
      .custom(isPlausiblePhone)
      .withMessage('Phone must be a valid phone number')
      .customSanitizer(normalizePhone),
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
};

export const createCustomerValidation = [
  param('shopId').notEmpty().withMessage('shopId is required'),
  ...customerFields(true),
];

export const updateCustomerValidation = [
  param('shopId').notEmpty().withMessage('shopId is required'),
  param('customerId').notEmpty().withMessage('customerId is required'),
  ...customerFields(false),
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
    .isInt({ min: 1, max: MAX_PAGE })
    .withMessage(`page must be between 1 and ${MAX_PAGE}`),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('limit must be between 1 and 50'),
];
