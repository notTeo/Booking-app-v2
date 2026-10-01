import { body, param, query } from 'express-validator';
import { BookingStatus } from '../../dist/generated/prisma';
import { OVERRIDABLE_RULE_CODES } from '../services/bookingRules.service';
import { SLOT_INTERVAL_OPTIONS } from '../utils/slots';
import { NAME_MAX_LENGTH, NOTES_MAX_LENGTH, isPlausiblePhone } from './common';

const validStatuses = Object.values(BookingStatus);

// Owner/staff bookings may accept specific rule violations by code. The old
// blanket `override` flag is rejected outright so no client can silently keep
// bypassing everything.
const overrideRulesValidation = [
  body('override')
    .not()
    .exists()
    .withMessage(
      'override is no longer supported; send overrideRules: ["<RULE_CODE>", ...]',
    ),
  body('overrideRules')
    .optional()
    .isArray()
    .withMessage('overrideRules must be an array of rule codes'),
  body('overrideRules.*')
    .isString()
    .isIn([...OVERRIDABLE_RULE_CODES])
    .withMessage(
      `overrideRules may only contain: ${OVERRIDABLE_RULE_CODES.join(', ')}`,
    ),
];

// Shared by the public and owner/staff booking-creation bodies, which accept
// identical customer fields.
const customerFieldsValidation = [
  body('name')
    .notEmpty()
    .withMessage('Name is required')
    .trim()
    .isLength({ max: NAME_MAX_LENGTH })
    .withMessage(`Name must be ${NAME_MAX_LENGTH} characters or fewer`),
  body('phone')
    .notEmpty()
    .withMessage('Phone is required')
    .trim()
    .custom(isPlausiblePhone)
    .withMessage('Phone must be a valid phone number'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Invalid email')
    .isLength({ max: 254 })
    .withMessage('Email must be 254 characters or fewer'),
];

const notesValidation = body('notes')
  .optional()
  .isString()
  .withMessage('notes must be a string')
  .trim()
  .isLength({ max: NOTES_MAX_LENGTH })
  .withMessage(`notes must be ${NOTES_MAX_LENGTH} characters or fewer`);

export const createBookingValidation = [
  param('slug').notEmpty().withMessage('slug is required'),
  ...customerFieldsValidation,
  body('serviceId').notEmpty().withMessage('serviceId is required'),
  body('staffId').optional().isString().withMessage('staffId must be a string'),
  body('startTime')
    .notEmpty()
    .isISO8601()
    .withMessage('startTime must be a valid ISO 8601 timestamp'),
  notesValidation,
];

export const getPublicSlotsValidation = [
  param('slug').notEmpty().withMessage('slug is required'),
  query('date')
    .notEmpty()
    .isISO8601()
    .withMessage('date must be a valid ISO 8601 date'),
  query('staffId').optional({ nullable: true }),
  query('serviceId').notEmpty().withMessage('serviceId is required'),
];

export const ownerSlotsValidation = [
  param('shopId').notEmpty().withMessage('shopId is required'),
  query('date')
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('date must be YYYY-MM-DD')
    .isISO8601({ strict: true })
    .withMessage('date must be a valid calendar date'),
  query('serviceId').notEmpty().withMessage('serviceId is required'),
  query('staffId').optional({ values: 'falsy' }).isString(),
  query('includeOutsideHours')
    .optional()
    .isBoolean()
    .withMessage('includeOutsideHours must be true or false')
    .toBoolean(),
  // Owner/staff only: look at a finer or coarser grid for this one booking.
  query('intervalMinutes')
    .optional()
    .isInt()
    .toInt()
    .isIn(SLOT_INTERVAL_OPTIONS)
    .withMessage(
      `intervalMinutes must be one of ${SLOT_INTERVAL_OPTIONS.join(', ')}`,
    ),
];

export const ownerCreateBookingValidation = [
  param('shopId').notEmpty().withMessage('shopId is required'),
  ...customerFieldsValidation,
  body('serviceId').notEmpty().withMessage('serviceId is required'),
  body('staffId').optional().isString().withMessage('staffId must be a string'),
  body('startTime')
    .notEmpty()
    .isISO8601()
    .withMessage('startTime must be a valid ISO 8601 timestamp'),
  notesValidation,
  ...overrideRulesValidation,
];

export const shopIdParamValidation = [
  param('shopId').notEmpty().withMessage('shopId is required'),
];

export const listBookingsValidation = [
  param('shopId').notEmpty().withMessage('shopId is required'),
  query('date')
    .optional()
    .isISO8601()
    .withMessage('date must be a valid ISO 8601 date'),
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
  body('startTime')
    .optional()
    .isISO8601()
    .withMessage('startTime must be a valid ISO 8601 timestamp'),
  body('serviceId')
    .optional()
    .notEmpty()
    .withMessage('serviceId cannot be empty'),
  body('staffId')
    .optional()
    .notEmpty()
    .withMessage('staffId cannot be empty')
    .isString()
    .withMessage('staffId must be a string'),
  notesValidation,
  ...overrideRulesValidation,
];

export const updateStatusValidation = [
  param('shopId').notEmpty().withMessage('shopId is required'),
  param('bookingId').notEmpty().withMessage('bookingId is required'),
  body('status')
    .notEmpty()
    .isIn(validStatuses)
    .withMessage(`status must be one of: ${validStatuses.join(', ')}`),
];
