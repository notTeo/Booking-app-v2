import { body, param, query } from 'express-validator';

export const createInviteValidation = [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('role').isIn(['owner', 'staff']).withMessage('Role must be owner or staff'),
];

export const inviteIdParamValidation = [
  param('inviteId').notEmpty().withMessage('Invite ID is required'),
];

export const lookupTokenQueryValidation = [
  query('token').notEmpty().withMessage('Token is required').isString(),
];
