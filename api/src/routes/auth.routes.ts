import { Router } from 'express';
import {
  login,
  register,
  refresh,
  logout,
  verifyEmailController,
  verifyEmailChangeController,
  forgotPasswordController,
  resendVerificationController,
  resetPasswordController,
  getSessionsController,
  revokeAllSessionsController,
} from '../controllers/auth.controller';
import {
  forgotPasswordValidation,
  loginValidation,
  refreshCookieValidation,
  registerValidation,
  resendVerificationValidation,
  resetPasswordValidation,
  verifyEmailTokenValidation,
  verifyEmailValidation,
} from '../validators/authValidation';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import {
  authLimiter,
  forgotPasswordLimiter,
  loginAccountLimiter,
  refreshLimiter,
} from '../middleware/rateLimiter';

const router = Router();

router.post('/register', authLimiter, registerValidation, validate, register);
router.post(
  '/login',
  authLimiter,
  loginAccountLimiter,
  loginValidation,
  validate,
  login,
);
router.post(
  '/refresh',
  refreshLimiter,
  refreshCookieValidation,
  validate,
  refresh,
);
router.post('/logout', refreshCookieValidation, validate, logout);
// A POST: it carries the sign-up password, which must not travel in a URL.
// Limited like login, since it checks a password.
router.post(
  '/verify-email',
  authLimiter,
  verifyEmailValidation,
  validate,
  verifyEmailController,
);
router.get(
  '/verify-email-change',
  verifyEmailTokenValidation,
  validate,
  verifyEmailChangeController,
);
router.post(
  '/resend-verification',
  forgotPasswordLimiter,
  resendVerificationValidation,
  validate,
  resendVerificationController,
);
router.post(
  '/forgot-password',
  forgotPasswordLimiter,
  forgotPasswordValidation,
  validate,
  forgotPasswordController,
);
router.post(
  '/reset-password',
  authLimiter,
  resetPasswordValidation,
  validate,
  resetPasswordController,
);
router.get('/sessions', authenticate, getSessionsController);
router.delete('/sessions', authenticate, revokeAllSessionsController);

export default router;
