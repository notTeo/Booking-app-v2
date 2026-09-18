import { Request, Response, NextFunction } from 'express';
import { successResponse } from '../utils/response';
import {
  listCustomers as listCustomersService,
  getCustomer as getCustomerService,
  updateCustomer as updateCustomerService,
} from '../services/customer.service';

export const listCustomers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId!;
    const shopId = req.params.shopId as string;
    const search = req.query.search as string | undefined;
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const customers = await listCustomersService(userId, shopId, search, page, limit);
    successResponse(res, customers);
  } catch (err) {
    next(err);
  }
};

export const getCustomer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId!;
    const shopId = req.params.shopId as string;
    const customerId = req.params.customerId as string;
    const customer = await getCustomerService(userId, shopId, customerId);
    successResponse(res, customer);
  } catch (err) {
    next(err);
  }
};

export const updateCustomer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId!;
    const shopId = req.params.shopId as string;
    const customerId = req.params.customerId as string;
    const customer = await updateCustomerService(userId, shopId, customerId, req.body);
    successResponse(res, customer);
  } catch (err) {
    next(err);
  }
};
