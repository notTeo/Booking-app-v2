import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import {
  createServiceValidation,
  updateServiceValidation,
  serviceParamsValidation,
  assignStaffValidation,
  unassignStaffValidation,
} from '../validators/service.validator';
import * as serviceController from '../controllers/service.controller'

const router = Router({ mergeParams: true }); // mergeParams to access :shopId from parent

router.post('/', authenticate, createServiceValidation, validate, serviceController.createService);
router.get('/', authenticate, serviceController.getServices);
router.get('/:serviceId', authenticate, serviceParamsValidation, validate, serviceController.getService);
router.patch('/:serviceId', authenticate, updateServiceValidation, validate, serviceController.updateService);
router.delete('/:serviceId', authenticate, serviceParamsValidation, validate, serviceController.deleteService);

router.post('/:serviceId/staff', authenticate, assignStaffValidation, validate, serviceController.assignStaff);
router.delete('/:serviceId/staff/:userShopId', authenticate, unassignStaffValidation, validate, serviceController.unassignStaff);

export default router;