import { body, param } from 'express-validator';
import { NAME_MAX_LENGTH } from './common';

export const memberIdParamValidation = [
  param('memberId').notEmpty().withMessage('memberId is required'),
];

export const shopIdParamValidation = [
  param('shopId').notEmpty().withMessage('shopId is required'),
];

export const updateMemberRoleValidation = [
  param('memberId').notEmpty().withMessage('memberId is required'),
  body('role')
    .notEmpty()
    .withMessage('role is required')
    .isIn(['owner', 'manager', 'staff'])
    .withMessage('role must be owner, manager or staff'),
  body('canViewCustomerDetails').optional().isBoolean({ strict: true }),
  body('canManageManagers').optional().isBoolean({ strict: true }),
  body('canEditShopSettings').optional().isBoolean({ strict: true }),
  body('email')
    .optional({ checkFalsy: true })
    .isEmail()
    .withMessage('Invalid email')
    .normalizeEmail(),
  body('active').optional().isBoolean({ strict: true }),
  body('bookableByCustomers').optional().isBoolean({ strict: true }),
  body('bookableInternally').optional().isBoolean({ strict: true }),
];

export const createTeamMemberValidation = [
  body('name')
    .isString()
    .withMessage('name is required')
    .bail()
    .trim()
    .notEmpty()
    .withMessage('name is required')
    .isLength({ max: NAME_MAX_LENGTH })
    .withMessage(`name must be ${NAME_MAX_LENGTH} characters or fewer`),
  // Email is only required when a login invite will actually be sent —
  // a member with no email can still be created and booked, just can't
  // be sent a login invite until one is added.
  body('email').custom((value, { req }) => {
    if (req.body.sendEmail !== false && !value) {
      throw new Error('An email is required to send a login invite');
    }
    return true;
  }),
  body('email')
    .optional({ checkFalsy: true })
    .isEmail()
    .withMessage('Invalid email')
    .normalizeEmail(),
  body('role')
    .isIn(['manager', 'staff'])
    .withMessage('role must be either manager or staff'),
  body('canViewCustomerDetails').optional().isBoolean({ strict: true }),
  body('sendEmail').optional().isBoolean({ strict: true }),
];
