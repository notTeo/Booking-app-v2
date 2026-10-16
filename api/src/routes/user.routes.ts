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
  updateNotificationsValidation,
  pushSubscriptionValidation,
  pushUnsubscribeValidation,
} from '../validators/userValidation';
import {
  addPushSubscription,
  getNotifications,
  removePushSubscription,
  updateNotifications,
} from '../controllers/notification.controller';

const router = Router();

router.get('/me', authenticate, getMe);
router.patch('/me', authenticate, updateMeValidation, validate, updateMe);
router.delete('/me', authenticate, deleteAccountValidation, validate, deleteMe);
router.put('/me/photo', authenticate, photoUpload, setMyPhoto);
router.delete('/me/photo', authenticate, removeMyPhoto);

// Booking notifications: their email switch, and this phone's push.
router.get('/me/notifications', authenticate, getNotifications);
router.patch(
  '/me/notifications',
  authenticate,
  updateNotificationsValidation,
  validate,
  updateNotifications,
);
router.post(
  '/me/push-subscriptions',
  authenticate,
  pushSubscriptionValidation,
  validate,
  addPushSubscription,
);
router.delete(
  '/me/push-subscriptions',
  authenticate,
  pushUnsubscribeValidation,
  validate,
  removePushSubscription,
);

export default router;
