import type { ProductLine, PublicProduct, ReservedProduct } from '../api/public.api';

/** The chosen quantities as the list the API takes (products with none are left out). */
export const toProductLines = (value: Record<string, number>): ProductLine[] =>
  Object.entries(value)
    .filter(([, quantity]) => quantity > 0)
    .map(([productId, quantity]) => ({ productId, quantity }));

/** Whether any chosen quantity is more than what is left. */
export const exceedsStock = (products: PublicProduct[], value: Record<string, number>) =>
  products.some((p) => (value[p.id] ?? 0) > p.stock);

/** The chosen quantities as named, priced lines, in the shop's own order (for a summary before booking). */
export const toReservedProducts = (products: PublicProduct[], value: Record<string, number>): ReservedProduct[] =>
  products
    .filter((p) => (value[p.id] ?? 0) > 0)
    .map((p) => ({ name: p.name, quantity: value[p.id], unitPrice: p.price }));
