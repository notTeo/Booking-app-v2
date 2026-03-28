import { Router } from 'express';
import { validate } from '../middleware/validate';
import { getShopInfoValidation } from '../validators/public.validator';
import { createBookingValidation } from '../validators/booking.validator';
import { getShopInfo, createBooking } from '../controllers/public.controller';

const router = Router();

router.get('/:slug', getShopInfoValidation, validate, getShopInfo);
router.post('/:slug/book', createBookingValidation, validate, createBooking);

export default router;