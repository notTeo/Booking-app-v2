import { Router } from 'express';
import { validate } from '../middleware/validate';
import { getShopInfoValidation, cancelBookingValidation } from '../validators/public.validator';
import { createBookingValidation } from '../validators/booking.validator';
import { getShopInfo, createBooking, cancelBooking } from '../controllers/public.controller';

const router = Router();

router.post('/cancel', cancelBookingValidation, validate, cancelBooking);
router.get('/:slug', getShopInfoValidation, validate, getShopInfo);
router.post('/:slug/book', createBookingValidation, validate, createBooking);

export default router;