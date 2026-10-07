import { body, cookie, query } from 'express-validator';
import { PASSWORD_MAX_LENGTH } from './common';

export const registerValidation = [
  body('email')
    .isString()
    .withMessage('Valid email is required')
    .bail()
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
  body('name')
    .optional()
    .isString()
    .withMessage('Valid name is required max 50 char')
    .bail()
    .isLength({ max: 50 })
    .withMessage('Valid name is required max 50 char'),
  body('password')
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
  body('inviteToken')
    .optional()
    .isString()
    .withMessage('Invite token must be a string'),
  body('acceptTerms')
    .custom((value) => value === true)
    .withMessage('You must accept the Terms of Service and Privacy Policy'),
];

export const loginValidation = [
  body('email')
    .isString()
    .withMessage('Valid email is required')
    .bail()
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
  body('password')
    .isString()
    .withMessage('Password is required')
    .bail()
    .notEmpty()
    .withMessage('Password is required'),
  body('rememberMe')
    .optional()
    .isBoolean({ strict: true })
    .withMessage('rememberMe must be a boolean'),
];

export const forgotPasswordValidation = [
  body('email')
    .isString()
    .withMessage('Valid email is required')
    .bail()
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
];

export const resendVerificationValidation = [
  body('email')
    .isString()
    .withMessage('Valid email is required')
    .bail()
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
];

// GET /auth/verify-email-change takes the token as a query-string param,
// otherwise unvalidated before hitting the service.
export const verifyEmailTokenValidation = [
  query('token')
    .notEmpty()
    .withMessage('Token is required')
    .isString()
    .withMessage('Token must be a string'),
];

// POST /auth/verify-email: the token from the link plus the password chosen
// at sign-up (in the body, never the URL).
export const verifyEmailValidation = [
  body('token')
    .isString()
    .withMessage('Token must be a string')
    .bail()
    .notEmpty()
    .withMessage('Token is required'),
  body('password')
    .isString()
    .withMessage('Password is required')
    .bail()
    .notEmpty()
    .withMessage('Password is required'),
];

export const resetPasswordValidation = [
  body('token')
    .notEmpty()
    .withMessage('Token is required')
    .isString()
    .withMessage('Token must be a string'),
  body('password')
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
];

// A missing or empty cookie is left to the controller (401 on refresh, a no-op
// on logout); a cookie that is present but is not even shaped like a JWT is a
// malformed request.
export const refreshCookieValidation = [
  cookie('refreshToken')
    .optional({ values: 'falsy' })
    .isJWT()
    .withMessage('Malformed refresh token'),
];
