import { param, query } from 'express-validator';

export const inviteIdParamValidation = [
  param('inviteId').notEmpty().withMessage('Invite ID is required'),
];

export const lookupTokenQueryValidation = [
  query('token').notEmpty().withMessage('Token is required').isString(),
];
