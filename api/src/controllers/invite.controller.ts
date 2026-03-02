import { Request, Response, NextFunction } from 'express';
import { successResponse } from '../utils/response';
import {
  createInvite as createInviteService,
  getShopInvites as getShopInvitesService,
  revokeInvite as revokeInviteService,
  getMyInvites as getMyInvitesService,
  acceptInvite as acceptInviteService,
  declineInvite as declineInviteService,
  lookupInviteByToken,
} from '../services/invite.service';

export const createInvite = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId!;
    const shopId = req.params.shopId as string;
    const invite = await createInviteService(userId, shopId, req.body);
    successResponse(res, invite, 201);
  } catch (err) {
    next(err);
  }
};

export const getShopInvites = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId!;
    const shopId = req.params.shopId as string;
    const invites = await getShopInvitesService(userId, shopId);
    successResponse(res, invites);
  } catch (err) {
    next(err);
  }
};

export const revokeInvite = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId!;
    const shopId = req.params.shopId as string;
    const inviteId = req.params.inviteId as string;
    await revokeInviteService(userId, shopId, inviteId);
    successResponse(res, { message: 'Invite revoked' });
  } catch (err) {
    next(err);
  }
};

export const getMyInvites = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId!;
    const invites = await getMyInvitesService(userId);
    successResponse(res, invites);
  } catch (err) {
    next(err);
  }
};

export const acceptInvite = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId!;
    const inviteId = req.params.inviteId as string;
    const result = await acceptInviteService(userId, inviteId);
    successResponse(res, result);
  } catch (err) {
    next(err);
  }
};

export const declineInvite = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId!;
    const inviteId = req.params.inviteId as string;
    await declineInviteService(userId, inviteId);
    successResponse(res, { message: 'Invite declined' });
  } catch (err) {
    next(err);
  }
};

export const lookupInvite = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.query.token as string;
    const invite = await lookupInviteByToken(token);
    successResponse(res, invite);
  } catch (err) {
    next(err);
  }
};
