import { Request, Response, NextFunction } from 'express';
import { DayOfWeek } from '../../dist/generated/prisma';
import { successResponse } from '../utils/response';
import {
  createSchedule as createScheduleService,
  getSchedules as getSchedulesService,
  getSchedule as getScheduleService,
  updateSchedule as updateScheduleService,
  deleteSchedule as deleteScheduleService,
  upsertDays as upsertDaysService,
  updateDay as updateDayService,
  CreateScheduleDto,
  UpdateScheduleDto,
  UpsertDaysDto,
  UpdateDayDto,
} from '../services/workingHours.service';

export const createSchedule = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId!;
    const shopId = req.params.shopId as string;
    const staffId = (req.params.memberId as string | undefined) ?? null;
    const dto: CreateScheduleDto = req.body;
    const schedule = await createScheduleService(userId, shopId, dto, staffId);
    successResponse(res, schedule, 201);
  } catch (err) {
    next(err);
  }
};

export const getSchedules = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId!;
    const shopId = req.params.shopId as string;
    const staffId = (req.params.memberId as string | undefined) ?? null;
    const schedules = await getSchedulesService(userId, shopId, staffId);
    successResponse(res, schedules);
  } catch (err) {
    next(err);
  }
};

export const getSchedule = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId!;
    const shopId = req.params.shopId as string;
    const scheduleId = req.params.scheduleId as string;
    const staffId = (req.params.memberId as string | undefined) ?? null;
    const schedule = await getScheduleService(userId, shopId, scheduleId, staffId);
    successResponse(res, schedule);
  } catch (err) {
    next(err);
  }
};

export const updateSchedule = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId!;
    const shopId = req.params.shopId as string;
    const scheduleId = req.params.scheduleId as string;
    const staffId = (req.params.memberId as string | undefined) ?? null;
    const dto: UpdateScheduleDto = req.body;
    const schedule = await updateScheduleService(userId, shopId, scheduleId, dto, staffId);
    successResponse(res, schedule);
  } catch (err) {
    next(err);
  }
};

export const deleteSchedule = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId!;
    const shopId = req.params.shopId as string;
    const scheduleId = req.params.scheduleId as string;
    const staffId = (req.params.memberId as string | undefined) ?? null;
    await deleteScheduleService(userId, shopId, scheduleId, staffId);
    successResponse(res, { message: 'Schedule deleted successfully' });
  } catch (err) {
    next(err);
  }
};

export const upsertDays = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId!;
    const shopId = req.params.shopId as string;
    const scheduleId = req.params.scheduleId as string;
    const staffId = (req.params.memberId as string | undefined) ?? null;
    const dto: UpsertDaysDto = req.body;
    const schedule = await upsertDaysService(userId, shopId, scheduleId, dto, staffId);
    successResponse(res, schedule);
  } catch (err) {
    next(err);
  }
};

export const updateDay = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId!;
    const shopId = req.params.shopId as string;
    const scheduleId = req.params.scheduleId as string;
    const day = req.params.day as DayOfWeek;
    const staffId = (req.params.memberId as string | undefined) ?? null;
    const dto: UpdateDayDto = req.body;
    const result = await updateDayService(userId, shopId, scheduleId, day, dto, staffId);
    successResponse(res, result);
  } catch (err) {
    next(err);
  }
};
