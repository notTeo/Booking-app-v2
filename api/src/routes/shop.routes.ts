import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import {
  createShopValidation,
  updateShopValidation,
  shopIdParamValidation,
} from '../validators/shop.validator';
import {
  createShop,
  getMyShops,
  getShop,
  updateShop,
  deleteShop,
} from '../controllers/shop.controller';
import workingHoursRouter from './workingHours.routes';
import { dayScheduleValidation } from '../validators/workingHours.validator';
import { getDaySchedule } from '../controllers/workingHours.controller';
import teamRouter from './team.routes';
import serviceRouter from './service.routes';
import bookingRouter from './booking.routes';
import customerRouter from './customer.routes';

const router = Router();

router.post('/', authenticate, createShopValidation, validate, createShop);
router.get('/', authenticate, getMyShops);
router.get('/:id', authenticate, shopIdParamValidation, validate, getShop);
router.patch('/:id', authenticate, updateShopValidation, validate, updateShop);
router.delete(
  '/:id',
  authenticate,
  shopIdParamValidation,
  validate,
  deleteShop,
);

// Declared before the schedules router so 'day' is never read as a :scheduleId.
router.get(
  '/:shopId/schedules/day',
  authenticate,
  dayScheduleValidation,
  validate,
  getDaySchedule,
);
router.use('/:shopId/schedules', workingHoursRouter);
router.use('/:shopId/team', teamRouter);
router.use('/:shopId/services', serviceRouter);
router.use('/:shopId/bookings', bookingRouter);
router.use('/:shopId/customers', customerRouter);

export default router;
