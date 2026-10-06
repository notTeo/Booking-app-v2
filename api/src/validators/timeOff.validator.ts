import { body, param, query } from 'express-validator';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

const date = (field: string) =>
  body(field)
    .matches(DATE_REGEX)
    .withMessage(`${field} must be YYYY-MM-DD`)
    .isISO8601({ strict: true })
    .withMessage(`${field} must be a valid calendar date`);

// null clears the time (the entry becomes a whole day)
const time = (field: string) =>
  body(field)
    .optional({ values: 'null' })
    .matches(TIME_REGEX)
    .withMessage(`${field} must be in HH:MM format`);

const note = body('note')
  .optional({ values: 'null' })
  .isString()
  .withMessage('note must be text')
  .isLength({ max: 200 })
  .withMessage('note must be at most 200 characters');

const shopId = param('shopId').notEmpty().withMessage('shopId is required');
const timeOffId = param('timeOffId')
  .notEmpty()
  .withMessage('timeOffId is required');

export const listTimeOffValidation = [
  shopId,
  query('memberId')
    .optional()
    .isString()
    .notEmpty()
    .withMessage('memberId must not be empty'),
];

export const createTimeOffValidation = [
  shopId,
  body('staffId')
    .optional({ values: 'null' })
    .isString()
    .notEmpty()
    .withMessage('staffId must be a team member id'),
  date('startDate'),
  date('endDate'),
  time('startTime'),
  time('endTime'),
  note,
];

export const updateTimeOffValidation = [
  shopId,
  timeOffId,
  date('startDate').optional(),
  date('endDate').optional(),
  time('startTime'),
  time('endTime'),
  note,
];

export const timeOffIdParamValidation = [shopId, timeOffId];
