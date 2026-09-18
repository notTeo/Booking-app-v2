import { body, param, query } from 'express-validator';

export const customerParamsValidation = [
  param('shopId').notEmpty().withMessage('shopId is required'),
  param('customerId').notEmpty().withMessage('customerId is required'),
];

export const listCustomersValidation = [
  param('shopId').notEmpty().withMessage('shopId is required'),
  query('search').optional().trim(),
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100'),
];

export const updateCustomerValidation = [
  param('shopId').notEmpty().withMessage('shopId is required'),
  param('customerId').notEmpty().withMessage('customerId is required'),
  body('name').optional().notEmpty().trim().withMessage('Name cannot be empty'),
  body('phone').optional().notEmpty().trim().withMessage('Phone cannot be empty'),
  body('email').optional({ nullable: true }).isEmail().withMessage('Invalid email'),
  body('notes').optional({ nullable: true }).isString().trim(),
];
