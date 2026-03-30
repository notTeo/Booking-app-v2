import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import {
  customerParamsValidation,
  listCustomersValidation,
  updateCustomerValidation,
} from '../validators/customer.validator';
import {
  listCustomers,
  getCustomer,
  updateCustomer,
} from '../controllers/customer.controller';

// mergeParams: true lets us access :shopId from the parent shop router
const router = Router({ mergeParams: true });

router.get('/', authenticate, listCustomersValidation, validate, listCustomers);
router.get('/:customerId', authenticate, customerParamsValidation, validate, getCustomer);
router.patch('/:customerId', authenticate, updateCustomerValidation, validate, updateCustomer);

export default router;
