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
router.get('/stats', authenticate, bookingController.getBookingStats);
// Declared before /:bookingId so 'slots' is not treated as a booking id.
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
router.delete(
  '/:bookingId',
  authenticate,
  bookingParamsValidation,
  validate,
  bookingController.deleteBooking,
);
router.patch(
  '/:bookingId/status',
  authenticate,
  updateStatusValidation,
  validate,
  bookingController.updateBookingStatus,
);

export default router;
