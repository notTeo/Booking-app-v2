import { body, param } from 'express-validator';
import { checkSlug, SLUG_MESSAGES } from './slug';
import { SLOT_INTERVAL_OPTIONS } from '../utils/slots';
import { PUBLIC_FONTS, PUBLIC_PALETTES } from '../utils/branding';
import {
  ADDRESS_MAX_LENGTH,
  DESCRIPTION_MAX_LENGTH,
  NAME_MAX_LENGTH,
} from './common';

// A shop's contact phone is free text ("210 1234567, ext. 4"), only bounded.
const PHONE_MAX_LENGTH = 40;

// One week: the longest notice a shop may demand for a customer change.
export const MAX_CUTOFF_HOURS = 168;
// The longest lead time a shop may set for reminder emails (3 days).
export const MAX_REMINDER_HOURS = 72;

export const createShopValidation = [
  body('name')
    .isString()
    .withMessage('Name is required')
    .bail()
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ max: NAME_MAX_LENGTH })
    .withMessage(`Name must be ${NAME_MAX_LENGTH} characters or fewer`),
  body('slug')
    .trim()
    .notEmpty()
    .withMessage('Slug is required')
    .bail()
    .custom((value) => {
      const problem = checkSlug(value);
      if (problem) throw new Error(SLUG_MESSAGES[problem]);
      return true;
    }),
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
  body('phone')
    .optional()
    .isString()
    .withMessage('Phone must be text')
    .bail()
    .trim()
    .isLength({ max: PHONE_MAX_LENGTH })
    .withMessage(`Phone must be ${PHONE_MAX_LENGTH} characters or fewer`),
  body('lat')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Invalid latitude'),
  body('lng')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Invalid longitude'),
  body('formattedAddress')
    .optional()
    .isString()
    .withMessage('Address must be text')
    .bail()
    .trim()
    .isLength({ max: ADDRESS_MAX_LENGTH })
    .withMessage(`Address must be ${ADDRESS_MAX_LENGTH} characters or fewer`),
  body('placeId').optional().trim(),
  body('timezone')
    .optional()
    .trim()
    .isIn((Intl as any).supportedValuesOf('timeZone'))
    .withMessage('Invalid timezone'),
  body('maxAdvanceDays')
    .optional()
    .isInt({ min: 1, max: 730 })
    .withMessage('maxAdvanceDays must be a whole number between 1 and 730')
    .toInt(),
  body('slotIntervalMinutes')
    .optional()
    .isInt()
    .toInt()
    .isIn(SLOT_INTERVAL_OPTIONS)
    .withMessage(
      `slotIntervalMinutes must be one of ${SLOT_INTERVAL_OPTIONS.join(', ')}`,
    ),
];

export const updateShopValidation = [
  param('id').notEmpty().withMessage('Shop ID is required'),
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
  // Immutable after creation: reject rather than silently ignore, so a stale
  // client can't believe a rename succeeded.
  body('slug')
    .not()
    .exists()
    .withMessage('Slug cannot be changed after creation'),
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
  body('phone')
    .optional()
    .isString()
    .withMessage('Phone must be text')
    .bail()
    .trim()
    .isLength({ max: PHONE_MAX_LENGTH })
    .withMessage(`Phone must be ${PHONE_MAX_LENGTH} characters or fewer`),
  body('lat')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Invalid latitude'),
  body('lng')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Invalid longitude'),
  body('formattedAddress')
    .optional()
    .isString()
    .withMessage('Address must be text')
    .bail()
    .trim()
    .isLength({ max: ADDRESS_MAX_LENGTH })
    .withMessage(`Address must be ${ADDRESS_MAX_LENGTH} characters or fewer`),
  body('placeId').optional().trim(),
  body('timezone')
    .optional()
    .trim()
    .isIn((Intl as any).supportedValuesOf('timeZone'))
    .withMessage('Invalid timezone'),
  body('maxAdvanceDays')
    .optional()
    .isInt({ min: 1, max: 730 })
    .withMessage('maxAdvanceDays must be a whole number between 1 and 730')
    .toInt(),
  body('slotIntervalMinutes')
    .optional()
    .isInt()
    .toInt()
    .isIn(SLOT_INTERVAL_OPTIONS)
    .withMessage(
      `slotIntervalMinutes must be one of ${SLOT_INTERVAL_OPTIONS.join(', ')}`,
    ),
  body('customerRescheduleEnabled')
    .optional()
    .isBoolean()
    .withMessage('customerRescheduleEnabled must be a boolean')
    .toBoolean(),
  ...(['cancelCutoffHours', 'rescheduleCutoffHours'] as const).map((field) =>
    body(field)
      .optional()
      .isInt({ min: 0, max: MAX_CUTOFF_HOURS })
      .withMessage(
        `${field} must be a whole number between 0 and ${MAX_CUTOFF_HOURS}`,
      )
      .toInt(),
  ),
  body('reminderEnabled')
    .optional()
    .isBoolean()
    .withMessage('reminderEnabled must be a boolean')
    .toBoolean(),
  body('reminderHoursBefore')
    .optional()
    .isInt({ min: 1, max: MAX_REMINDER_HOURS })
    .withMessage(
      `reminderHoursBefore must be a whole number between 1 and ${MAX_REMINDER_HOURS}`,
    )
    .toInt(),
  ...(['customerPhotosEnabled', 'customerProfilePageEnabled'] as const).map(
    (field) =>
      body(field)
        .optional()
        .isBoolean()
        .withMessage(`${field} must be a boolean`)
        .toBoolean(),
  ),
  body('publicPalette')
    .optional()
    .isIn(PUBLIC_PALETTES)
    .withMessage(`publicPalette must be one of ${PUBLIC_PALETTES.join(', ')}`),
  body('publicFont')
    .optional()
    .isIn(PUBLIC_FONTS)
    .withMessage(`publicFont must be one of ${PUBLIC_FONTS.join(', ')}`),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
];

export const shopIdParamValidation = [
  param('id').notEmpty().withMessage('Shop ID is required'),
];
