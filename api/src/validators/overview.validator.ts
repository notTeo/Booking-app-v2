import { param, query } from 'express-validator';
import { OVERVIEW_RANGES } from '../services/overview.service';

export const overviewValidation = [
  param('shopId')
    .matches(/^[A-Za-z0-9_-]{1,64}$/)
    .withMessage('shopId is invalid'),
  query('range')
    .isString()
    .isIn([...OVERVIEW_RANGES])
    .withMessage(`range must be one of: ${OVERVIEW_RANGES.join(', ')}`),
];
