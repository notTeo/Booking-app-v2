import { Router } from 'express';
import { getMe, updateMe, deleteMe } from '../controllers/user.controller';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import { updateMeValidation, deleteAccountValidation } from '../validators/userValidation';

const router = Router();

router.get('/me', authenticate, getMe);
router.patch('/me', authenticate, updateMeValidation, validate, updateMe);
router.delete('/me', authenticate, deleteAccountValidation, validate, deleteMe);

export default router;
