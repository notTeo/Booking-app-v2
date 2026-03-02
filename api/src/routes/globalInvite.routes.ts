import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import {
  inviteIdParamValidation,
  lookupTokenQueryValidation,
} from '../validators/invite.validator';
import {
  getMyInvites,
  acceptInvite,
  declineInvite,
  lookupInvite,
} from '../controllers/invite.controller';

const router = Router();

// Public lookup — must be declared before /:inviteId to avoid route collision
router.get('/lookup', lookupTokenQueryValidation, validate, lookupInvite);

router.get('/', authenticate, getMyInvites);
router.post('/:inviteId/accept', authenticate, inviteIdParamValidation, validate, acceptInvite);
router.post('/:inviteId/decline', authenticate, inviteIdParamValidation, validate, declineInvite);

export default router;
