import express, { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import { rejectControlChars } from '../middleware/rejectControlChars';
import {
  customerParamsValidation,
  listCustomerBookingsValidation,
  listCustomersValidation,
  mergeCustomersValidation,
  importCustomersValidation,
  shopParamValidation,
  updateCustomerValidation,
  setServiceDurationsValidation,
} from '../validators/customer.validator';
import {
  listCustomers,
  getCustomer,
  updateCustomer,
  exportCustomer,
  deleteCustomer,
  mergeCustomers,
  listCustomerBookings,
  exportAllCustomers,
  importCustomers,
  setCustomerServiceDurations,
} from '../controllers/customer.controller';

// mergeParams: true lets us access :shopId from the parent shop router
const router = Router({ mergeParams: true });

router.get('/', authenticate, listCustomersValidation, validate, listCustomers);
// Before /:customerId, which would otherwise take 'export-all' for an id.
router.get(
  '/export-all',
  authenticate,
  shopParamValidation,
  validate,
  exportAllCustomers,
);
router.post(
  '/import',
  authenticate,
  // Up to 500 rows: more than the default 100kb body, and only read once the
  // caller is known (app.ts skips the default parser for this path).
  express.json({ limit: '2mb' }),
  rejectControlChars,
  importCustomersValidation,
  validate,
  importCustomers,
);
router.get(
  '/:customerId',
  authenticate,
  customerParamsValidation,
  validate,
  getCustomer,
);
router.get(
  '/:customerId/bookings',
  authenticate,
  listCustomerBookingsValidation,
  validate,
  listCustomerBookings,
);
router.patch(
  '/:customerId',
  authenticate,
  updateCustomerValidation,
  validate,
  updateCustomer,
);
router.put(
  '/:customerId/service-durations',
  authenticate,
  setServiceDurationsValidation,
  validate,
  setCustomerServiceDurations,
);

router.get(
  '/:customerId/export',
  authenticate,
  customerParamsValidation,
  validate,
  exportCustomer,
);
router.delete(
  '/:customerId',
  authenticate,
  customerParamsValidation,
  validate,
  deleteCustomer,
);
router.post(
  '/:customerId/merge',
  authenticate,
  mergeCustomersValidation,
  validate,
  mergeCustomers,
);

export default router;
