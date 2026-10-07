import { Router } from 'express';
import {
  getMe,
  updateMe,
  deleteMe,
  setMyPhoto,
  removeMyPhoto,
} from '../controllers/user.controller';
import { authenticate } from '../middleware/authenticate';
import { photoUpload } from '../middleware/photoUpload';
import { validate } from '../middleware/validate';
import {
  updateMeValidation,
  deleteAccountValidation,
} from '../validators/userValidation';

const router = Router();

router.get('/me', authenticate, getMe);
router.patch('/me', authenticate, updateMeValidation, validate, updateMe);
router.delete('/me', authenticate, deleteAccountValidation, validate, deleteMe);
router.put('/me/photo', authenticate, photoUpload, setMyPhoto);
router.delete('/me/photo', authenticate, removeMyPhoto);

export default router;
