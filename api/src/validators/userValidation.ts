import { body } from 'express-validator';
import { PASSWORD_MAX_LENGTH } from './common';

export const updateMeValidation = [
  body('name')
    .optional()
    .isString()
    .withMessage('Name must be a string')
    .bail()
    .notEmpty()
    .withMessage('Name cannot be empty')
    .isLength({ max: 50 })
    .withMessage('Name must be 50 characters or fewer'),
  body('email')
    .optional()
    .isString()
    .withMessage('Valid email is required')
    .bail()
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
  body('password')
    .optional()
    .isString()
    .withMessage('Password must be a string')
    .bail()
    .isLength({ min: 8, max: PASSWORD_MAX_LENGTH })
    .withMessage(`Password must be 8 to ${PASSWORD_MAX_LENGTH} characters long`)
    .matches(/[A-Z]/)
    .withMessage('Password must contain at least one uppercase letter')
    .matches(/[0-9]/)
    .withMessage('Password must contain at least one number')
    .matches(/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/)
    .withMessage('Password must contain at least one special character'),
  body('currentPassword')
    .optional()
    .isString()
    .withMessage('currentPassword must be a string'),
];

export const deleteAccountValidation = [body('password').optional().isString()];
