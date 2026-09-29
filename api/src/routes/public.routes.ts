import { Router } from 'express';
import { validate } from '../middleware/validate';
import {
  getShopInfoValidation,
  cancelBookingValidation,
} from '../validators/public.validator';
import {
  createBookingValidation,
  getPublicSlotsValidation,
} from '../validators/booking.validator';
import {
  getShopInfo,
  createBooking,
  cancelBooking,
  getPublicSlots,
} from '../controllers/public.controller';
import {
  publicReadLimiter,
  publicWriteLimiter,
} from '../middleware/rateLimiter';

const router = Router();

router.post(
  '/cancel',
  publicWriteLimiter,
  cancelBookingValidation,
  validate,
  cancelBooking,
);
router.get(
  '/:slug/slots',
  publicReadLimiter,
  getPublicSlotsValidation,
  validate,
  getPublicSlots,
);
router.get(
  '/:slug',
  publicReadLimiter,
  getShopInfoValidation,
  validate,
  getShopInfo,
);
router.post(
  '/:slug/book',
  publicWriteLimiter,
  createBookingValidation,
  validate,
  createBooking,
);

export default router;
