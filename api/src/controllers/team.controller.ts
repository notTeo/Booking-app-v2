import { Request, Response, NextFunction } from 'express';
import { successResponse } from '../utils/response';
import {
  getMembers as getMembersService,
  getMember as getMemberService,
  updateMemberRole as updateMemberRoleService,
  removeMember as removeMemberService,
  UpdateMemberRoleDto,
} from '../services/team.service';

export const getMembers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId!;
    const shopId = req.params.shopId as string;
    const members = await getMembersService(userId, shopId);
    successResponse(res, members);
  } catch (err) {
    next(err);
  }
};

export const getMember = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId!;
    const shopId = req.params.shopId as string;
    const memberId = req.params.memberId as string;
    const member = await getMemberService(userId, shopId, memberId);
    successResponse(res, member);
  } catch (err) {
    next(err);
  }
};

export const updateMemberRole = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId!;
    const shopId = req.params.shopId as string;
    const memberId = req.params.memberId as string;
    const dto: UpdateMemberRoleDto = req.body;
    const member = await updateMemberRoleService(userId, shopId, memberId, dto);
    successResponse(res, member);
  } catch (err) {
    next(err);
  }
};

export const removeMember = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId!;
    const shopId = req.params.shopId as string;
    const memberId = req.params.memberId as string;
    await removeMemberService(userId, shopId, memberId);
    successResponse(res, { message: 'Member removed successfully' });
  } catch (err) {
    next(err);
  }
};
