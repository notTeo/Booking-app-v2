import { Router } from 'express';
import { validate } from '../middleware/validate';
import {
    getShopInfoValidation
} from '../validators/public.validator';
import {
    getShopInfo
} from '../controllers/public.controller';

const router = Router();

router.get('/:slug', getShopInfoValidation, validate, getShopInfo);

export default router;