import { body, param, query } from 'express-validator';

export const customerParamsValidation = [
  param('shopId').notEmpty().withMessage('shopId is required'),
  param('customerId').notEmpty().withMessage('customerId is required'),
];

export const listCustomersValidation = [
  param('shopId').notEmpty().withMessage('shopId is required'),
  query('search').optional().trim(),
];

export const updateCustomerValidation = [
  param('shopId').notEmpty().withMessage('shopId is required'),
  param('customerId').notEmpty().withMessage('customerId is required'),
  body('name').optional().notEmpty().trim().withMessage('Name cannot be empty'),
  body('phone').optional().notEmpty().trim().withMessage('Phone cannot be empty'),
  body('email').optional({ nullable: true }).isEmail().withMessage('Invalid email'),
];
