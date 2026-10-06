import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import {
  listTimeOffValidation,
  createTimeOffValidation,
  updateTimeOffValidation,
  timeOffIdParamValidation,
} from '../validators/timeOff.validator';
import {
  listTimeOff,
  createTimeOff,
  updateTimeOff,
  deleteTimeOff,
} from '../controllers/timeOff.controller';

// mergeParams: true lets us access :shopId from the parent router
const router = Router({ mergeParams: true });

router.get('/', authenticate, listTimeOffValidation, validate, listTimeOff);
router.post(
  '/',
  authenticate,
  createTimeOffValidation,
  validate,
  createTimeOff,
);
router.patch(
  '/:timeOffId',
  authenticate,
  updateTimeOffValidation,
  validate,
  updateTimeOff,
);
router.delete(
  '/:timeOffId',
  authenticate,
  timeOffIdParamValidation,
  validate,
  deleteTimeOff,
);

export default router;
