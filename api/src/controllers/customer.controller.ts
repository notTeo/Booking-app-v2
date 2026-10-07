import { Request, Response, NextFunction } from 'express';
import { successResponse } from '../utils/response';
import { parseCrop } from '../services/photo.service';
import {
  listCustomers as listCustomersService,
  getCustomer as getCustomerService,
  updateCustomer as updateCustomerService,
  createCustomer as createCustomerService,
  setCustomerPhoto as setCustomerPhotoService,
  removeCustomerPhoto as removeCustomerPhotoService,
  exportCustomer as exportCustomerService,
  deleteCustomer as deleteCustomerService,
  mergeCustomers as mergeCustomersService,
  listCustomerBookings as listCustomerBookingsService,
  exportAllCustomers as exportAllCustomersService,
  importCustomers as importCustomersService,
  setCustomerServiceDurations as setCustomerServiceDurationsService,
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
      String(req.query.hasCustomDurations) === 'true',
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

export const setCustomerServiceDurations = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user!.userId!;
    const shopId = req.params.shopId as string;
    const customerId = req.params.customerId as string;
    const durations = await setCustomerServiceDurationsService(
      userId,
      shopId,
      customerId,
      req.body.items,
    );
    successResponse(res, durations);
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

export const mergeCustomers = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user!.userId!;
    const shopId = req.params.shopId as string;
    const customerId = req.params.customerId as string;
    const customer = await mergeCustomersService(
      userId,
      shopId,
      customerId,
      req.body.sourceCustomerId,
    );
    successResponse(res, customer);
  } catch (err) {
    next(err);
  }
};

export const exportAllCustomers = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user!.userId!;
    const shopId = req.params.shopId as string;
    successResponse(res, await exportAllCustomersService(userId, shopId));
  } catch (err) {
    next(err);
  }
};

export const importCustomers = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user!.userId!;
    const shopId = req.params.shopId as string;
    successResponse(
      res,
      await importCustomersService(userId, shopId, req.body.rows),
    );
  } catch (err) {
    next(err);
  }
};

export const listCustomerBookings = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user!.userId!;
    const shopId = req.params.shopId as string;
    const customerId = req.params.customerId as string;
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit
      ? parseInt(req.query.limit as string, 10)
      : 10;
    successResponse(
      res,
      await listCustomerBookingsService(
        userId,
        shopId,
        customerId,
        page,
        limit,
      ),
    );
  } catch (err) {
    next(err);
  }
};

export const createCustomer = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user!.userId!;
    const shopId = req.params.shopId as string;
    const { name, phone, email, notes } = req.body;
    const customer = await createCustomerService(userId, shopId, {
      name,
      phone,
      email,
      notes,
    });
    successResponse(res, customer, 201);
  } catch (err) {
    next(err);
  }
};

export const setCustomerPhoto = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user!.userId!;
    const shopId = req.params.shopId as string;
    const customerId = req.params.customerId as string;
    successResponse(
      res,
      await setCustomerPhotoService(
        userId,
        shopId,
        customerId,
        req.file?.buffer,
        parseCrop(req.body?.crop),
      ),
    );
  } catch (err) {
    next(err);
  }
};

export const removeCustomerPhoto = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user!.userId!;
    const shopId = req.params.shopId as string;
    const customerId = req.params.customerId as string;
    successResponse(
      res,
      await removeCustomerPhotoService(userId, shopId, customerId),
    );
  } catch (err) {
    next(err);
  }
};
