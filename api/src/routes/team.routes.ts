import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import {
  memberIdParamValidation,
  updateMemberRoleValidation,
  createTeamMemberValidation,
} from '../validators/team.validator';
import {
  getMembers,
  getMember,
  createTeamMember,
  updateMemberRole,
  removeMember,
  sendLoginInvite,
  cancelLoginInvite,
} from '../controllers/team.controller';
import { getMemberServices } from '../controllers/service.controller';
import workingHoursRouter from './workingHours.routes';

// mergeParams: true lets us access :shopId from the parent shop router
const router = Router({ mergeParams: true });

router.get('/', authenticate, getMembers);
router.post('/', authenticate, createTeamMemberValidation, validate, createTeamMember);
router.get('/:memberId', authenticate, memberIdParamValidation, validate, getMember);
router.patch('/:memberId', authenticate, updateMemberRoleValidation, validate, updateMemberRole);
router.delete('/:memberId', authenticate, memberIdParamValidation, validate, removeMember);
router.post('/:memberId/invite', authenticate, memberIdParamValidation, validate, sendLoginInvite);
router.delete('/:memberId/invite', authenticate, memberIdParamValidation, validate, cancelLoginInvite);

// Staff services
router.get('/:memberId/services', authenticate, memberIdParamValidation, validate, getMemberServices);

// Staff schedule routes — re-use the existing working hours router
// workingHoursRouter has mergeParams: true, so it will see :shopId and :memberId
router.use('/:memberId/schedules', workingHoursRouter);

export default router;
