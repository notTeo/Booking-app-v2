import type { ProductLine, PublicProduct } from '../api/public.api';

/** The chosen quantities as the list the API takes (products with none are left out). */
export const toProductLines = (value: Record<string, number>): ProductLine[] =>
  Object.entries(value)
    .filter(([, quantity]) => quantity > 0)
    .map(([productId, quantity]) => ({ productId, quantity }));

/** Whether any chosen quantity is more than what is left. */
export const exceedsStock = (products: PublicProduct[], value: Record<string, number>) =>
  products.some((p) => (value[p.id] ?? 0) > p.stock);
