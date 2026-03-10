import { param } from 'express-validator';

export const getShopInfoValidation = [
    param('slug').notEmpty().withMessage('Invite ID is required'),
]