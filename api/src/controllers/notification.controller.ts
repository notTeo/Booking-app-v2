import { Request, Response, NextFunction } from 'express';
import { successResponse } from '../utils/response';
import {
  deletePushSubscription,
  getNotificationSettings,
  savePushSubscription,
  setEmailNotifications,
} from '../services/notify.service';

export const getNotifications = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    successResponse(res, await getNotificationSettings(req.user!.userId!));
  } catch (err) {
    next(err);
  }
};

export const updateNotifications = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    successResponse(
      res,
      await setEmailNotifications(
        req.user!.userId!,
        req.body.emailNotifications,
      ),
    );
  } catch (err) {
    next(err);
  }
};

export const addPushSubscription = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    await savePushSubscription(req.user!.userId!, {
      endpoint: req.body.endpoint,
      p256dh: req.body.keys.p256dh,
      auth: req.body.keys.auth,
      userAgent: req.get('user-agent')?.slice(0, 300),
    });
    successResponse(res, { subscribed: true }, 201);
  } catch (err) {
    next(err);
  }
};

export const removePushSubscription = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    await deletePushSubscription(req.user!.userId!, req.body.endpoint);
    successResponse(res, { subscribed: false });
  } catch (err) {
    next(err);
  }
};
