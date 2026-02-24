import { Router } from 'express';
import { login, register, refresh, logout, verifyEmailController, verifyEmailChangeController, forgotPasswordController, resendVerificationController, resetPasswordController, googleCallback, googleFailure, getSessionsController, revokeAllSessionsController } from '../controllers/auth.controller';
import { forgotPasswordValidation, loginValidation, registerValidation, resendVerificationValidation, resetPasswordValidation } from '../validators/authValidation';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import passport from '../config/passport';
import { authLimiter, forgotPasswordLimiter } from '../middleware/rateLimiter';

const router = Router();

router.get(
  '/google',
  passport.authenticate('google', { scope: ['email', 'profile'], session: false }),
);

router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/auth/google/failure' }),
  googleCallback,
);

router.get('/google/failure', googleFailure);

router.post('/register', authLimiter, registerValidation, validate, register);
router.post('/login', authLimiter, loginValidation, validate, login);
router.post('/refresh', authLimiter, refresh);
router.post('/logout', logout);
router.get('/verify-email', verifyEmailController);
router.get('/verify-email-change', verifyEmailChangeController);
router.post('/resend-verification', forgotPasswordLimiter, resendVerificationValidation, validate, resendVerificationController);
router.post('/forgot-password', forgotPasswordLimiter, forgotPasswordValidation, validate, forgotPasswordController);
router.post('/reset-password', authLimiter, resetPasswordValidation, validate, resetPasswordController);
router.get('/sessions', authenticate, getSessionsController);
router.delete('/sessions', authenticate, revokeAllSessionsController);

export default router;