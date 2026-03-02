import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import {
  createInviteValidation,
  inviteIdParamValidation,
} from '../validators/invite.validator';
import {
  createInvite,
  getShopInvites,
  revokeInvite,
} from '../controllers/invite.controller';

// mergeParams: true lets us access :shopId from the parent shop router
const router = Router({ mergeParams: true });

router.post('/', authenticate, createInviteValidation, validate, createInvite);
router.get('/', authenticate, getShopInvites);
router.delete('/:inviteId', authenticate, inviteIdParamValidation, validate, revokeInvite);

export default router;
