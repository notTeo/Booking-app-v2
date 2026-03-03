import { Request, Response, NextFunction } from 'express';
import { successResponse } from '../utils/response';
import * as serviceService from '../services/service.service';

export const createService = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId!;
    const { shopId } = req.params as Record<string, string>;
    const service = await serviceService.createService(userId, shopId, req.body);
    successResponse(res, service, 201);
  } catch (err) {
    next(err);
  }
};

export const getServices = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId!;
    const { shopId } = req.params as Record<string, string>;
    const services = await serviceService.getServices(userId, shopId);
    successResponse(res, services);
  } catch (err) {
    next(err);
  }
};

export const getService = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId!;
    const { shopId, serviceId } = req.params as Record<string, string>;
    const service = await serviceService.getServiceById(userId, shopId, serviceId);
    successResponse(res, service);
  } catch (err) {
    next(err);
  }
};

export const updateService = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId!;
    const { shopId, serviceId } = req.params as Record<string, string>;
    const service = await serviceService.updateService(userId, shopId, serviceId, req.body);
    successResponse(res, service);
  } catch (err) {
    next(err);
  }
};

export const deleteService = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId!;
    const { shopId, serviceId } = req.params as Record<string, string>;
    await serviceService.deleteService(userId, shopId, serviceId);
    successResponse(res, { message: 'Service deleted' });
  } catch (err) {
    next(err);
  }
};

export const assignStaff = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId!;
    const { shopId, serviceId } = req.params as Record<string, string>;
    const assignment = await serviceService.assignStaffToService(
      userId,
      shopId,
      serviceId,
      req.body.userShopId
    );
    successResponse(res, assignment, 201);
  } catch (err) {
    next(err);
  }
};

export const unassignStaff = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId!;
    const { shopId, serviceId, userShopId } = req.params as Record<string, string>;
    await serviceService.unassignStaffFromService(userId, shopId, serviceId, userShopId);
    successResponse(res, { message: 'Staff unassigned from service' });
  } catch (err) {
    next(err);
  }
};

export const getMemberServices = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId!;
    const { shopId, memberId } = req.params as Record<string, string>;
    const assignments = await serviceService.getMemberServices(userId, shopId, memberId);
    successResponse(res, assignments);
  } catch (err) {
    next(err);
  }
};