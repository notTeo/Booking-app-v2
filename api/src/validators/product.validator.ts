import { body, param } from 'express-validator';

export const MAX_STOCK = 100_000;

const shopId = param('shopId').notEmpty().withMessage('shopId is required');
const productId = param('productId')
  .notEmpty()
  .withMessage('productId is required');

// An empty string clears an optional field.
const supplierUrl = body('supplierUrl')
  .optional({ values: 'null' })
  .trim()
  .isLength({ max: 500 })
  .withMessage('supplierUrl must be 500 characters or fewer')
  .custom((value: string) => {
    if (value === '') return true;
    try {
      const url = new URL(value);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  })
  .withMessage(
    'supplierUrl must be a web address starting with http:// or https://',
  );

const fields = (required: boolean) => {
  const opt = <T extends { optional: () => T }>(chain: T) =>
    required ? chain : chain.optional();
  return [
    opt(body('name'))
      .notEmpty()
      .withMessage('Name is required')
      .trim()
      .isLength({ max: 120 })
      .withMessage('Name must be 120 characters or fewer'),
    body('description')
      .optional({ values: 'null' })
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Description must be 1000 characters or fewer'),
    opt(body('price'))
      .isInt({ min: 0, max: 10_000_000 })
      .withMessage('Price must be a non-negative integer (cents)'),
    opt(body('stock'))
      .isInt({ min: 0, max: MAX_STOCK })
      .withMessage(`Stock must be a whole number from 0 to ${MAX_STOCK}`),
    body('isActive')
      .optional()
      .isBoolean({ strict: true })
      .withMessage('isActive must be true or false'),
    supplierUrl,
  ];
};

export const shopIdParamValidation = [shopId];
export const productParamsValidation = [shopId, productId];
export const createProductValidation = [shopId, ...fields(true)];
export const updateProductValidation = [shopId, productId, ...fields(false)];
