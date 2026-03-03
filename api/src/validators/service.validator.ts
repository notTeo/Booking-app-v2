import { body, param } from 'express-validator';

export const createServiceValidation = [
  param('shopId').notEmpty().withMessage('shopId is required'),
  body('name').notEmpty().trim().withMessage('Name is required'),
  body('description').optional().trim(),
  body('duration')
    .notEmpty().withMessage('Duration is required')
    .isInt({ min: 1 }).withMessage('Duration must be a positive integer (minutes)'),
  body('price')
    .notEmpty().withMessage('Price is required')
    .isInt({ min: 0 }).withMessage('Price must be a non-negative integer (cents)'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
];

export const updateServiceValidation = [
  param('shopId').notEmpty().withMessage('shopId is required'),
  param('serviceId').notEmpty().withMessage('serviceId is required'),
  body('name').optional().notEmpty().trim().withMessage('Name cannot be empty'),
  body('description').optional().trim(),
  body('duration')
    .optional()
    .isInt({ min: 1 }).withMessage('Duration must be a positive integer (minutes)'),
  body('price')
    .optional()
    .isInt({ min: 0 }).withMessage('Price must be a non-negative integer (cents)'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
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