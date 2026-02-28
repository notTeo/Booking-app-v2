import { body, param } from 'express-validator';

export const memberIdParamValidation = [
  param('memberId').notEmpty().withMessage('memberId is required'),
];

export const updateMemberRoleValidation = [
  param('memberId').notEmpty().withMessage('memberId is required'),
  body('role')
    .notEmpty()
    .withMessage('role is required')
    .isIn(['owner', 'staff'])
    .withMessage('role must be either owner or staff'),
];
