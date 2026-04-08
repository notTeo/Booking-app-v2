import { body, param, query } from 'express-validator';
import { BookingStatus } from '../../dist/generated/prisma';

const validStatuses = Object.values(BookingStatus);

export const createBookingValidation = [
  param('slug').notEmpty().withMessage('slug is required'),
  body('name').notEmpty().trim().withMessage('Name is required'),
  body('phone').notEmpty().trim().withMessage('Phone is required'),
  body('email').optional().isEmail().withMessage('Invalid email'),
  body('serviceId').notEmpty().withMessage('serviceId is required'),
  body('staffId').optional(),
  body('startTime').notEmpty().isISO8601().withMessage('startTime must be a valid ISO 8601 timestamp'),
  body('notes').optional().trim(),
];

export const getPublicSlotsValidation = [
  param('slug').notEmpty().withMessage('slug is required'),
  query('date').notEmpty().isISO8601().withMessage('date must be a valid ISO 8601 date'),
  query('staffId').optional({ nullable: true }),
  query('serviceId').notEmpty().withMessage('serviceId is required'),
];

export const listBookingsValidation = [
  param('shopId').notEmpty().withMessage('shopId is required'),
  query('date').optional().isISO8601().withMessage('date must be a valid ISO 8601 date'),
  query('status')
    .optional()
    .isIn(validStatuses)
    .withMessage(`status must be one of: ${validStatuses.join(', ')}`),
  query('staffId').optional().notEmpty().withMessage('staffId cannot be empty'),
];

export const bookingParamsValidation = [
  param('shopId').notEmpty().withMessage('shopId is required'),
  param('bookingId').notEmpty().withMessage('bookingId is required'),
];

export const updateBookingValidation = [
  param('shopId').notEmpty().withMessage('shopId is required'),
  param('bookingId').notEmpty().withMessage('bookingId is required'),
  body('startTime').optional().isISO8601().withMessage('startTime must be a valid ISO 8601 timestamp'),
  body('serviceId').optional().notEmpty().withMessage('serviceId cannot be empty'),
  body('staffId').optional().notEmpty().withMessage('staffId cannot be empty'),
  body('notes').optional().trim(),
];

export const updateStatusValidation = [
  param('shopId').notEmpty().withMessage('shopId is required'),
  param('bookingId').notEmpty().withMessage('bookingId is required'),
  body('status')
    .notEmpty()
    .isIn(validStatuses)
    .withMessage(`status must be one of: ${validStatuses.join(', ')}`),
];
