import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import { photoUpload } from '../middleware/photoUpload';
import {
  createProductValidation,
  productParamsValidation,
  shopIdParamValidation,
  updateProductValidation,
} from '../validators/product.validator';
import * as controller from '../controllers/product.controller';

const router = Router({ mergeParams: true }); // :shopId comes from the parent

router.post(
  '/',
  authenticate,
  createProductValidation,
  validate,
  controller.createProduct,
);
router.get(
  '/',
  authenticate,
  shopIdParamValidation,
  validate,
  controller.getProducts,
);
router.get(
  '/:productId',
  authenticate,
  productParamsValidation,
  validate,
  controller.getProduct,
);
router.patch(
  '/:productId',
  authenticate,
  updateProductValidation,
  validate,
  controller.updateProduct,
);
router.delete(
  '/:productId',
  authenticate,
  productParamsValidation,
  validate,
  controller.deleteProduct,
);
router.put(
  '/:productId/photo',
  authenticate,
  productParamsValidation,
  validate,
  photoUpload,
  controller.setProductPhoto,
);
router.delete(
  '/:productId/photo',
  authenticate,
  productParamsValidation,
  validate,
  controller.removeProductPhoto,
);

export default router;
