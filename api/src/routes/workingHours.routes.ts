import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import {
  createScheduleValidation,
  updateScheduleValidation,
  upsertDaysValidation,
  updateDayValidation,
  scheduleIdParamValidation,
} from '../validators/workingHours.validator';
import {
  createSchedule,
  getSchedules,
  getSchedule,
  updateSchedule,
  deleteSchedule,
  upsertDays,
  updateDay,
} from '../controllers/workingHours.controller';

// mergeParams: true lets us access :shopId from the parent router
const router = Router({ mergeParams: true });

router.post('/', authenticate, createScheduleValidation, validate, createSchedule);
router.get('/', authenticate, getSchedules);
router.get('/:scheduleId', authenticate, scheduleIdParamValidation, validate, getSchedule);
router.patch('/:scheduleId', authenticate, updateScheduleValidation, validate, updateSchedule);
router.delete('/:scheduleId', authenticate, scheduleIdParamValidation, validate, deleteSchedule);
router.put('/:scheduleId/days', authenticate, upsertDaysValidation, validate, upsertDays);
router.patch('/:scheduleId/days/:day', authenticate, updateDayValidation, validate, updateDay);

export default router;
