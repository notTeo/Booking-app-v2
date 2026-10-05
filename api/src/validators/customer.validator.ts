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
