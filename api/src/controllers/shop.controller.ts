import { Request, Response, NextFunction } from 'express';
import { successResponse } from '../utils/response';
import {
  createShop as createShopService,
  getMyShops as getMyShopsService,
  getShopById,
  updateShop as updateShopService,
  deleteShop as deleteShopService,
  setShopPhoto as setShopPhotoService,
  removeShopPhoto as removeShopPhotoService,
  CreateShopDto,
  UpdateShopDto,
} from '../services/shop.service';
import { parseCrop } from '../services/photo.service';

export const createShop = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user!.userId!;
    const dto: CreateShopDto = req.body;
    const shop = await createShopService(userId, dto);
    successResponse(res, shop, 201);
  } catch (err) {
    next(err);
  }
};

export const getMyShops = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user!.userId!;
    const shops = await getMyShopsService(userId);
    successResponse(res, shops);
  } catch (err) {
    next(err);
  }
};

export const getShop = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user!.userId!;
    const shop = await getShopById(userId, req.params.id as string);
    successResponse(res, shop);
  } catch (err) {
    next(err);
  }
};

export const updateShop = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user!.userId!;
    const dto: UpdateShopDto = req.body;
    const shop = await updateShopService(userId, req.params.id as string, dto);
    successResponse(res, shop);
  } catch (err) {
    next(err);
  }
};

export const deleteShop = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user!.userId!;
    await deleteShopService(userId, req.params.id as string);
    successResponse(res, { message: 'Shop deleted successfully' });
  } catch (err) {
    next(err);
  }
};

export const setShopPhoto = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user!.userId!;
    const shop = await setShopPhotoService(
      userId,
      req.params.id as string,
      req.file?.buffer,
      parseCrop(req.body?.crop),
    );
    successResponse(res, shop);
  } catch (err) {
    next(err);
  }
};

export const removeShopPhoto = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = req.user!.userId!;
    const shop = await removeShopPhotoService(userId, req.params.id as string);
    successResponse(res, shop);
  } catch (err) {
    next(err);
  }
};
