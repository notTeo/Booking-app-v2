import { Request, Response, NextFunction } from 'express';
import { successResponse } from '../utils/response';
import { parseCrop } from '../services/photo.service';
import * as products from '../services/product.service';

type Handler = (req: Request, res: Response, next: NextFunction) => void;

// Every handler is the same shape: pull the ids, call the service, wrap the
// result (or hand the error to the error middleware).
const handle =
  (
    run: (
      userId: string,
      shopId: string,
      productId: string,
      req: Request,
    ) => Promise<unknown>,
    status = 200,
  ): Handler =>
  async (req, res, next) => {
    try {
      const data = await run(
        req.user!.userId!,
        req.params.shopId as string,
        req.params.productId as string,
        req,
      );
      successResponse(res, data, status);
    } catch (err) {
      next(err);
    }
  };

export const createProduct = handle(
  (userId, shopId, _id, req) =>
    products.createProduct(userId, shopId, req.body),
  201,
);
export const getProducts = handle((userId, shopId) =>
  products.getProducts(userId, shopId),
);
export const getProduct = handle((userId, shopId, id) =>
  products.getProduct(userId, shopId, id),
);
export const updateProduct = handle((userId, shopId, id, req) =>
  products.updateProduct(userId, shopId, id, req.body),
);
export const deleteProduct = handle(async (userId, shopId, id) => {
  await products.deleteProduct(userId, shopId, id);
  return { message: 'Product deleted successfully' };
});
export const setProductPhoto = handle((userId, shopId, id, req) =>
  products.setProductPhoto(
    userId,
    shopId,
    id,
    req.file?.buffer,
    parseCrop(req.body?.crop),
  ),
);
export const removeProductPhoto = handle((userId, shopId, id) =>
  products.removeProductPhoto(userId, shopId, id),
);
