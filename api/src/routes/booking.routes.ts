import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import {
  ownerCreateBookingValidation,
  ownerSlotsValidation,
  listBookingsValidation,
  bookingParamsValidation,
  updateBookingValidation,
  updateStatusValidation,
  productLineValidation,
  productLineParamsValidation,
  shopIdParamValidation,
} from '../validators/booking.validator';
import * as bookingController from '../controllers/booking.controller';

const router = Router({ mergeParams: true });

router.post(
  '/',
  authenticate,
  ownerCreateBookingValidation,
  validate,
  bookingController.createBooking,
);
router.get(
  '/',
  authenticate,
  listBookingsValidation,
  validate,
  bookingController.listBookings,
);
router.get(
  '/stats',
  authenticate,
  shopIdParamValidation,
  validate,
  bookingController.getBookingStats,
);
// Declared before /:bookingId so these are not treated as a booking id.
router.get(
  '/wizard-info',
  authenticate,
  shopIdParamValidation,
  validate,
  bookingController.getWizardInfo,
);
router.get(
  '/slots',
  authenticate,
  ownerSlotsValidation,
  validate,
  bookingController.getAvailableSlots,
);
router.get(
  '/:bookingId',
  authenticate,
  bookingParamsValidation,
  validate,
  bookingController.getBooking,
);
router.patch(
  '/:bookingId',
  authenticate,
  updateBookingValidation,
  validate,
  bookingController.updateBooking,
);
router.patch(
  '/:bookingId/status',
  authenticate,
  updateStatusValidation,
  validate,
  bookingController.updateBookingStatus,
);

router.patch(
  '/:bookingId/products/:lineId',
  authenticate,
  productLineValidation,
  validate,
  bookingController.updateBookingProductLine,
);

router.delete(
  '/:bookingId/products/:lineId',
  authenticate,
  productLineParamsValidation,
  validate,
  bookingController.removeBookingProductLine,
);

export default router;
