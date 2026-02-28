import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { requireFeature } from '../middleware/requireFeature';
import { validate } from '../middleware/validate';
import {
  createShopValidation,
  updateShopValidation,
  shopIdParamValidation,
} from '../validators/shop.validator';
import {
  createShop,
  getMyShops,
  getShop,
  updateShop,
  deleteShop,
} from '../controllers/shop.controller';
import workingHoursRouter from './workingHours.routes';
import teamRouter from './team.routes';

const router = Router();

router.post('/', authenticate, requireFeature('CREATE_SHOP'), createShopValidation, validate, createShop);
router.get('/', authenticate, getMyShops);
router.get('/:id', authenticate, shopIdParamValidation, validate, getShop);
router.patch('/:id', authenticate, updateShopValidation, validate, updateShop);
router.delete('/:id', authenticate, shopIdParamValidation, validate, deleteShop);

router.use('/:shopId/schedules', workingHoursRouter);
router.use('/:shopId/team', teamRouter);

export default router;
