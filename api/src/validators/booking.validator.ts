import { body, param, query } from 'express-validator';
import { BookingStatus } from '../../dist/generated/prisma';
import { OVERRIDABLE_RULE_CODES } from '../services/bookingRules.service';
import { SLOT_INTERVAL_OPTIONS } from '../utils/slots';
import {
  NAME_MAX_LENGTH,
  NOTES_MAX_LENGTH,
  isInstant,
  isPlausiblePhone,
  normalizePhone,
} from './common';

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
    // PRODUCT_OUT_OF_STOCK is accepted here but only honoured for the owner
    // and managers (booking.service.ts), and is not a time rule.
    .isIn([...OVERRIDABLE_RULE_CODES, 'PRODUCT_OUT_OF_STOCK'])
    .withMessage(
      `overrideRules may only contain: ${OVERRIDABLE_RULE_CODES.join(', ')}, PRODUCT_OUT_OF_STOCK`,
    ),
];

// Owner/staff only: `block: true` holds the time as a blocked slot instead of
// booking a customer, so no customer fields are needed.
const isBlock = (req: { body?: { block?: unknown } }) =>
  req.body?.block === true;

// Shared by the public and owner/staff booking-creation bodies, which accept
// identical customer fields. `exceptForBlock` (owner/staff) skips name and
// phone for a blocked slot.
const customerFieldsValidation = (exceptForBlock = false) => [
  body('name')
    .if((_: unknown, { req }) => !(exceptForBlock && isBlock(req)))
    .notEmpty()
    .withMessage('Name is required')
    .trim()
    .isLength({ max: NAME_MAX_LENGTH })
    .withMessage(`Name must be ${NAME_MAX_LENGTH} characters or fewer`),
  body('phone')
    .if((_: unknown, { req }) => !(exceptForBlock && isBlock(req)))
    .notEmpty()
    .withMessage('Phone is required')
    .trim()
    .custom(isPlausiblePhone)
    .withMessage('Phone must be a valid phone number')
    .customSanitizer(normalizePhone),
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

// Products reserved with the booking: [{ productId, quantity }].
const productsValidation = [
  body('products')
    .optional()
    .isArray({ max: 20 })
    .withMessage('products must be a list of at most 20 items'),
  body('products.*.productId')
    .isString()
    .notEmpty()
    .withMessage('productId is required'),
  body('products.*.quantity')
    .isInt({ min: 1, max: 99 })
    .withMessage('quantity must be a whole number from 1 to 99'),
];

// One service (serviceId) or several, done one after another (serviceIds, at
// most five; the first is the booking's primary).
const servicesValidation = [
  body('serviceId')
    .optional()
    .isString()
    .withMessage('serviceId must be a string'),
  body('serviceIds')
    .optional()
    .isArray({ min: 1, max: 5 })
    .withMessage('serviceIds must be a list of 1 to 5 services'),
  body('serviceIds.*')
    .isString()
    .notEmpty()
    .withMessage('serviceIds must be ids'),
  body()
    .custom((value) => !!value?.serviceId || value?.serviceIds?.length > 0)
    .withMessage('serviceId is required'),
];

export const createBookingValidation = [
  param('slug').notEmpty().withMessage('slug is required'),
  ...customerFieldsValidation(),
  ...servicesValidation,
  body('staffId').optional().isString().withMessage('staffId must be a string'),
  body('startTime')
    .custom(isInstant)
    .withMessage('startTime must be an ISO 8601 timestamp with a UTC offset'),
  notesValidation,
  ...productsValidation,
];

export const getPublicSlotsValidation = [
  param('slug').notEmpty().withMessage('slug is required'),
  query('date')
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('date must be YYYY-MM-DD')
    .isISO8601({ strict: true })
    .withMessage('date must be a valid calendar date'),
  query('staffId').optional({ nullable: true }),
  query('serviceId').notEmpty().withMessage('serviceId is required'),
  // All the services when there are several ("a,b,c"); serviceId is the first.
  query('serviceIds').optional({ values: 'falsy' }).isString(),
  // A customer rescheduling from their email link: frees their own slot.
  query('rescheduleToken').optional({ values: 'falsy' }).isUUID(),
];

export const ownerSlotsValidation = [
  param('shopId').notEmpty().withMessage('shopId is required'),
  query('date')
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('date must be YYYY-MM-DD')
    .isISO8601({ strict: true })
    .withMessage('date must be a valid calendar date'),
  query('serviceId').notEmpty().withMessage('serviceId is required'),
  query('serviceIds').optional({ values: 'falsy' }).isString(),
  query('staffId').optional({ values: 'falsy' }).isString(),
  // Rescheduling: lets this booking's own (possibly deactivated) service be
  // looked up. Has no effect for any other service.
  query('forBookingId').optional({ values: 'falsy' }).isString(),
  // Who the booking is for: their own duration for the service, if any,
  // decides which times fit. An id from another shop has no effect.
  query('customerId').optional({ values: 'falsy' }).isString(),
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
  body('block')
    .optional()
    .isBoolean({ strict: true })
    .withMessage('block must be true or false'),
  ...customerFieldsValidation(true),
  ...servicesValidation,
  body('staffId').optional().isString().withMessage('staffId must be a string'),
  body('startTime')
    .custom(isInstant)
    .withMessage('startTime must be an ISO 8601 timestamp with a UTC offset'),
  notesValidation,
  ...productsValidation,
  body('products')
    .custom((products, { req }) => !(isBlock(req) && products?.length > 0))
    .withMessage('A blocked slot cannot have products'),
  ...overrideRulesValidation,
];

export const productLineParamsValidation = [
  param('shopId').notEmpty().withMessage('shopId is required'),
  param('bookingId').notEmpty().withMessage('bookingId is required'),
  param('lineId').notEmpty().withMessage('lineId is required'),
];

export const productLineValidation = [
  param('shopId').notEmpty().withMessage('shopId is required'),
  param('bookingId').notEmpty().withMessage('bookingId is required'),
  param('lineId').notEmpty().withMessage('lineId is required'),
  body('saleStatus')
    .optional()
    .isIn(['RESERVED', 'SOLD', 'NOT_SOLD'])
    .withMessage('saleStatus must be RESERVED, SOLD or NOT_SOLD'),
  // 0 keeps the line but it no longer counts; DELETE removes it.
  body('quantity')
    .optional()
    .isInt({ min: 0, max: 99 })
    .withMessage('quantity must be a whole number from 0 to 99'),
  body()
    .custom(
      (value) =>
        value?.saleStatus !== undefined || value?.quantity !== undefined,
    )
    .withMessage('Send saleStatus, quantity or both'),
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
    .custom(isInstant)
    .withMessage('startTime must be an ISO 8601 timestamp with a UTC offset'),
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
