import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import {
  customerParamsValidation,
  listCustomersValidation,
  mergeCustomersValidation,
  importCustomersValidation,
  shopParamValidation,
  updateCustomerValidation,
} from '../validators/customer.validator';
import {
  listCustomers,
  getCustomer,
  updateCustomer,
  exportCustomer,
  deleteCustomer,
  mergeCustomers,
  exportAllCustomers,
  importCustomers,
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
router.patch(
  '/:customerId',
  authenticate,
  updateCustomerValidation,
  validate,
  updateCustomer,
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
