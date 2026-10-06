import { Request, Response, NextFunction } from 'express';
import { successResponse } from '../utils/response';
import {
  listTimeOff as listTimeOffService,
  createTimeOff as createTimeOffService,
  updateTimeOff as updateTimeOffService,
  deleteTimeOff as deleteTimeOffService,
  CreateTimeOffDto,
  UpdateTimeOffDto,
} from '../services/timeOff.service';

export const listTimeOff = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user!.userId!;
    const shopId = req.params.shopId as string;
    const memberId = req.query.memberId as string | undefined;
    const entries = await listTimeOffService(userId, shopId, memberId);
    successResponse(res, entries);
  } catch (err) {
    next(err);
  }
};

export const createTimeOff = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user!.userId!;
    const shopId = req.params.shopId as string;
    const dto: CreateTimeOffDto = req.body;
    const entry = await createTimeOffService(userId, shopId, dto);
    successResponse(res, entry, 201);
  } catch (err) {
    next(err);
  }
};

export const updateTimeOff = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user!.userId!;
    const shopId = req.params.shopId as string;
    const timeOffId = req.params.timeOffId as string;
    const dto: UpdateTimeOffDto = req.body;
    const entry = await updateTimeOffService(userId, shopId, timeOffId, dto);
    successResponse(res, entry);
  } catch (err) {
    next(err);
  }
};

export const deleteTimeOff = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user!.userId!;
    const shopId = req.params.shopId as string;
    const timeOffId = req.params.timeOffId as string;
    await deleteTimeOffService(userId, shopId, timeOffId);
    successResponse(res, null);
  } catch (err) {
    next(err);
  }
};
