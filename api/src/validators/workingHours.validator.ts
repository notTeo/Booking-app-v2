import { body, param } from 'express-validator';

const DAYS_OF_WEEK = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const TIME_REGEX = /^\d{2}:\d{2}$/;

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
  body(`${prefix}.hours`).optional().isArray().withMessage('hours must be an array'),
  ...hourRangeValidation(`${prefix}.hours.*`),
];

export const createScheduleValidation = [
  body('startDate').notEmpty().withMessage('startDate is required').isISO8601().withMessage('startDate must be a valid date'),
  body('endDate').optional().isISO8601().withMessage('endDate must be a valid date'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
  body('days').optional().isArray().withMessage('days must be an array'),
  ...dayEntryValidation('days.*'),
];

export const updateScheduleValidation = [
  param('scheduleId').notEmpty().withMessage('scheduleId is required'),
  body('startDate').optional().isISO8601().withMessage('startDate must be a valid date'),
  body('endDate').optional().isISO8601().withMessage('endDate must be a valid date'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
];

export const upsertDaysValidation = [
  param('scheduleId').notEmpty().withMessage('scheduleId is required'),
  body('days').notEmpty().withMessage('days is required').isArray({ min: 1 }).withMessage('days must be a non-empty array'),
  ...dayEntryValidation('days.*'),
];

export const updateDayValidation = [
  param('scheduleId').notEmpty().withMessage('scheduleId is required'),
  param('day').notEmpty().withMessage('day is required').isIn(DAYS_OF_WEEK).withMessage(`day must be one of ${DAYS_OF_WEEK.join(', ')}`),
  body('isOpen').optional().isBoolean().withMessage('isOpen must be a boolean'),
  body('hours').optional().isArray().withMessage('hours must be an array'),
  ...hourRangeValidation('hours.*'),
];

export const scheduleIdParamValidation = [
  param('scheduleId').notEmpty().withMessage('scheduleId is required'),
];
