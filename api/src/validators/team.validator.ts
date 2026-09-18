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
  body('canViewCustomerDetails').optional().isBoolean(),
  body('email').optional({ checkFalsy: true }).isEmail().withMessage('Invalid email').normalizeEmail(),
];

export const createTeamMemberValidation = [
  body('name').notEmpty().withMessage('name is required').trim(),
  // Email is only required when a login invite will actually be sent —
  // a member with no email can still be created and booked, just can't
  // be sent a login invite until one is added.
  body('email').custom((value, { req }) => {
    if (req.body.sendEmail !== false && !value) {
      throw new Error('An email is required to send a login invite');
    }
    return true;
  }),
  body('email').optional({ checkFalsy: true }).isEmail().withMessage('Invalid email').normalizeEmail(),
  body('role').isIn(['owner', 'staff']).withMessage('role must be either owner or staff'),
  body('canViewCustomerDetails').optional().isBoolean(),
  body('sendEmail').optional().isBoolean(),
];
