import { Router } from 'express';
import { validate, validateAs } from '../middleware/validate';
import {
  getShopInfoValidation,
  cancelBookingValidation,
  rescheduleBookingValidation,
  customerProfileValidation,
} from '../validators/public.validator';
import {
  createBookingValidation,
  getPublicSlotsValidation,
} from '../validators/booking.validator';
import {
  getShopInfo,
  createBooking,
  cancelBooking,
  getBookingForCustomer,
  rescheduleBooking,
  getPublicSlots,
  saveCustomerProfile,
} from '../controllers/public.controller';
import { photoUpload } from '../middleware/photoUpload';
import { rejectControlChars } from '../middleware/rejectControlChars';
import {
  publicReadLimiter,
  publicWriteLimiter,
} from '../middleware/rateLimiter';

const router = Router();

router.post(
  '/cancel',
  publicWriteLimiter,
  cancelBookingValidation,
  validateAs('INVALID_CANCEL_LINK'),
  cancelBooking,
);
router.post(
  '/booking',
  publicReadLimiter,
  cancelBookingValidation,
  validateAs('INVALID_CANCEL_LINK'),
  getBookingForCustomer,
);
router.post(
  '/reschedule',
  publicWriteLimiter,
  rescheduleBookingValidation,
  validateAs('INVALID_RESCHEDULE_REQUEST'),
  rescheduleBooking,
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
// The sign-up page's form, with an optional photo. Multipart, so its fields
// only exist (and can only be checked) once photoUpload has read them.
router.post(
  '/:slug/profile',
  publicWriteLimiter,
  photoUpload,
  rejectControlChars,
  customerProfileValidation,
  validate,
  saveCustomerProfile,
);

export default router;
