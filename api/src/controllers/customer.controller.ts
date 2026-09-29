import { Request, Response, NextFunction } from 'express';
import { successResponse } from '../utils/response';
import {
  listCustomers as listCustomersService,
  getCustomer as getCustomerService,
  updateCustomer as updateCustomerService,
  exportCustomer as exportCustomerService,
  deleteCustomer as deleteCustomerService,
} from '../services/customer.service';

export const listCustomers = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user!.userId!;
    const shopId = req.params.shopId as string;
    const search = req.query.search as string | undefined;
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit
      ? parseInt(req.query.limit as string, 10)
      : 20;
    const customers = await listCustomersService(
      userId,
      shopId,
      search,
      page,
      limit,
    );
    successResponse(res, customers);
  } catch (err) {
    next(err);
  }
};

export const getCustomer = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
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

export const updateCustomer = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user!.userId!;
    const shopId = req.params.shopId as string;
    const customerId = req.params.customerId as string;
    const customer = await updateCustomerService(
      userId,
      shopId,
      customerId,
      req.body,
    );
    successResponse(res, customer);
  } catch (err) {
    next(err);
  }
};

export const exportCustomer = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user!.userId!;
    const shopId = req.params.shopId as string;
    const customerId = req.params.customerId as string;
    const data = await exportCustomerService(userId, shopId, customerId);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="customer-${customerId}.json"`,
    );
    successResponse(res, data);
  } catch (err) {
    next(err);
  }
};

export const deleteCustomer = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user!.userId!;
    const shopId = req.params.shopId as string;
    const customerId = req.params.customerId as string;
    await deleteCustomerService(userId, shopId, customerId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
