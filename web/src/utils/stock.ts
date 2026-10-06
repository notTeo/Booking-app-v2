export type StockLevel = 'out' | 'last' | 'low' | 'ok';

/** How a product's stock reads: none left, the last one, a few, or plenty. */
export const stockLevel = (stock: number): StockLevel =>
  stock <= 0 ? 'out' : stock === 1 ? 'last' : stock <= 3 ? 'low' : 'ok';

export const STOCK_BADGE: Record<StockLevel, string> = {
  out: 'badge--danger',
  last: 'badge--warning',
  low: 'badge--warning',
  ok: 'badge--success',
};

interface StockStrings {
  stockOut: string;
  stockLast: string;
  stockLow: string;
  stockOk: string;
}

const KEY = {
  out: 'stockOut',
  last: 'stockLast',
  low: 'stockLow',
  ok: 'stockOk',
} as const satisfies Record<StockLevel, keyof StockStrings>;

/** The message shown for a stock count ("Not available", "Last one", "Only 3 left", "In stock"). */
export const stockText = (s: StockStrings, stock: number) =>
  s[KEY[stockLevel(stock)]].replace('{n}', String(stock));
