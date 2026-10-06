import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import { requireWritableShop } from '../middleware/requireWritableShop';
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
  setShopPhoto,
  removeShopPhoto,
} from '../controllers/shop.controller';
import { dayScheduleValidation } from '../validators/workingHours.validator';
import { getDaySchedule } from '../controllers/workingHours.controller';
import { photoUpload } from '../middleware/photoUpload';
import teamRouter from './team.routes';
import timeOffRouter from './timeOff.routes';
import serviceRouter from './service.routes';
import productRouter from './product.routes';
import bookingRouter from './booking.routes';
import customerRouter from './customer.routes';
import {
  myOverviewValidation,
  overviewValidation,
} from '../validators/overview.validator';
import {
  getMyOverview,
  getMyUpcoming,
  getOverview,
} from '../controllers/overview.controller';

const router = Router();

router.post('/', authenticate, createShopValidation, validate, createShop);
router.get('/', authenticate, getMyShops);
// Across all of the user's shops. Must be registered before '/:id', which
// would otherwise capture "overview" and "upcoming" as shop ids.
router.get(
  '/overview',
  authenticate,
  myOverviewValidation,
  validate,
  getMyOverview,
);
router.get('/upcoming', authenticate, getMyUpcoming);
router.get('/:id', authenticate, shopIdParamValidation, validate, getShop);
router.patch(
  '/:id',
  authenticate,
  requireWritableShop(),
  updateShopValidation,
  validate,
  updateShop,
);
router.delete(
  '/:id',
  authenticate,
  shopIdParamValidation,
  validate,
  deleteShop,
);

router.put(
  '/:id/photo',
  authenticate,
  requireWritableShop(),
  shopIdParamValidation,
  validate,
  photoUpload,
  setShopPhoto,
);
router.delete(
  '/:id/photo',
  authenticate,
  requireWritableShop(),
  shopIdParamValidation,
  validate,
  removeShopPhoto,
);

// Working hours are per team member (/:shopId/team/:memberId/schedules); this
// is the one shop-level read, giving every member's hours for a date.
router.get(
  '/:shopId/schedules/day',
  authenticate,
  dayScheduleValidation,
  validate,
  getDaySchedule,
);
router.get(
  '/:shopId/overview',
  authenticate,
  overviewValidation,
  validate,
  getOverview,
);
// A locked shop is read-only: its members' writes stop here. Deleting the shop
// itself (above) and deleting a customer stay possible.
router.use('/:shopId/team', authenticate, requireWritableShop(), teamRouter);
router.use(
  '/:shopId/time-off',
  authenticate,
  requireWritableShop(),
  timeOffRouter,
);
router.use(
  '/:shopId/services',
  authenticate,
  requireWritableShop(),
  serviceRouter,
);
router.use(
  '/:shopId/products',
  authenticate,
  requireWritableShop(),
  productRouter,
);
router.use(
  '/:shopId/bookings',
  authenticate,
  requireWritableShop(),
  bookingRouter,
);
router.use(
  '/:shopId/customers',
  authenticate,
  requireWritableShop({ allowDelete: true }),
  customerRouter,
);

export default router;
