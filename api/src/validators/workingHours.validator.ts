import { body, param, query } from 'express-validator';

const DAYS_OF_WEEK = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

// A day's ranges must each run forwards and must not overlap one another.
// Malformed entries are left to the per-field rules.
const validRanges = (hours: unknown): boolean => {
  if (!Array.isArray(hours)) return true;
  const ranges = hours.filter(
    (h): h is { startTime: string; endTime: string } =>
      typeof h?.startTime === 'string' && typeof h?.endTime === 'string',
  );
  const sorted = [...ranges].sort((a, b) =>
    a.startTime.localeCompare(b.startTime),
  );
  return sorted.every(
    (h, i) =>
      h.startTime < h.endTime &&
      (i === 0 || sorted[i - 1].endTime <= h.startTime),
  );
};
const RANGES_MESSAGE =
  'Each range must end after it starts and must not overlap another';

const uniqueDays = (days: unknown): boolean =>
  !Array.isArray(days) || new Set(days.map((d) => d?.day)).size === days.length;
const UNIQUE_DAYS_MESSAGE = 'Each day may appear only once';

// This router is mounted both directly under /api/shops/:shopId/schedules
// and nested under /api/shops/:shopId/team/:memberId/schedules — shopId is
// present (mergeParams) either way.
export const shopIdParamValidation = [
  param('shopId').notEmpty().withMessage('shopId is required'),
];

const hourRangeValidation = (prefix: string) => [
  body(`${prefix}.startTime`)
    .notEmpty()
    .withMessage('startTime is required')
    .matches(TIME_REGEX)
    .withMessage('startTime must be in HH:MM format'),
  body(`${prefix}.endTime`)
    .notEmpty()
    .withMessage('endTime is required')
    .matches(TIME_REGEX)
    .withMessage('endTime must be in HH:MM format'),
];

const dayEntryValidation = (prefix: string) => [
  body(`${prefix}.day`)
    .notEmpty()
    .withMessage('day is required')
    .isIn(DAYS_OF_WEEK)
    .withMessage(`day must be one of ${DAYS_OF_WEEK.join(', ')}`),
  body(`${prefix}.isOpen`)
    .notEmpty()
    .withMessage('isOpen is required')
    .isBoolean()
    .withMessage('isOpen must be a boolean'),
  body(`${prefix}.hours`)
    .optional()
    .isArray()
    .withMessage('hours must be an array')
    .custom(validRanges)
    .withMessage(RANGES_MESSAGE),
  ...hourRangeValidation(`${prefix}.hours.*`),
];

export const createScheduleValidation = [
  body('startDate')
    .notEmpty()
    .withMessage('startDate is required')
    .isISO8601()
    .withMessage('startDate must be a valid date'),
  body('endDate')
    .optional()
    .isISO8601()
    .withMessage('endDate must be a valid date'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
  body('days')
    .optional()
    .isArray()
    .withMessage('days must be an array')
    .custom(uniqueDays)
    .withMessage(UNIQUE_DAYS_MESSAGE),
  ...dayEntryValidation('days.*'),
];

export const updateScheduleValidation = [
  param('scheduleId').notEmpty().withMessage('scheduleId is required'),
  body('startDate')
    .optional()
    .isISO8601()
    .withMessage('startDate must be a valid date'),
  // null clears the end date (schedule becomes open-ended)
  body('endDate')
    .optional({ values: 'null' })
    .isISO8601()
    .withMessage('endDate must be a valid date'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
];

export const upsertDaysValidation = [
  param('scheduleId').notEmpty().withMessage('scheduleId is required'),
  body('days')
    .notEmpty()
    .withMessage('days is required')
    .isArray({ min: 1 })
    .withMessage('days must be a non-empty array')
    .custom(uniqueDays)
    .withMessage(UNIQUE_DAYS_MESSAGE),
  ...dayEntryValidation('days.*'),
];

export const updateDayValidation = [
  param('scheduleId').notEmpty().withMessage('scheduleId is required'),
  param('day')
    .notEmpty()
    .withMessage('day is required')
    .isIn(DAYS_OF_WEEK)
    .withMessage(`day must be one of ${DAYS_OF_WEEK.join(', ')}`),
  body('isOpen').optional().isBoolean().withMessage('isOpen must be a boolean'),
  body('hours')
    .optional()
    .isArray()
    .withMessage('hours must be an array')
    .custom(validRanges)
    .withMessage(RANGES_MESSAGE),
  ...hourRangeValidation('hours.*'),
];

export const scheduleIdParamValidation = [
  param('scheduleId').notEmpty().withMessage('scheduleId is required'),
];

export const dayScheduleValidation = [
  param('shopId').notEmpty().withMessage('shopId is required'),
  query('date')
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('date must be YYYY-MM-DD')
    .isISO8601({ strict: true })
    .withMessage('date must be a valid calendar date'),
];
