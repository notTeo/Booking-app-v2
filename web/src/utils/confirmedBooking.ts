import type { ReservedProduct } from '../api/public.api';

/**
 * The confirmation a customer sees after booking, kept for this tab only so
 * that reloading the page still shows it instead of an empty first step.
 * sessionStorage: gone when the tab closes, never sent anywhere.
 */

const keyFor = (slug: string) => `booking-confirmed:${slug}`;
const TEXT_MAX_LENGTH = 300;
const MAX_PRODUCTS = 20;

export interface ConfirmedBooking {
  name: string;
  serviceNames: string;
  date: string;
  time: string;
  phone: string;
  email: string;
  products: ReservedProduct[];
  /** The service's fee in cents, when the booking has products (for the total). */
  servicePrice?: number;
}

const isProduct = (p: unknown): p is ReservedProduct => {
  if (typeof p !== 'object' || p === null) return false;
  const { name, quantity, unitPrice } = p as Record<string, unknown>;
  return typeof name === 'string' && Number.isFinite(quantity) && Number.isFinite(unitPrice);
};

/** What is stored may be hand-edited or written by an older build: anything unexpected reads as "nothing to show". */
export function parseConfirmedBooking(raw: string | null): ConfirmedBooking | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== 'object' || value === null) return null;
    const { name, serviceNames, date, time, phone, email, products, servicePrice } = value as Record<string, unknown>;
    const texts = [name, serviceNames, date, time, phone, email];
    if (!texts.every((x): x is string => typeof x === 'string')) return null;
    if (!Array.isArray(products) || !products.every(isProduct)) return null;
    const [n, s, d, tm, ph, em] = texts.map((x) => x.slice(0, TEXT_MAX_LENGTH));
    return {
      name: n,
      serviceNames: s,
      date: d,
      time: tm,
      phone: ph,
      email: em,
      products: products
        .slice(0, MAX_PRODUCTS)
        .map((p) => ({ name: p.name.slice(0, TEXT_MAX_LENGTH), quantity: p.quantity, unitPrice: p.unitPrice })),
      ...(typeof servicePrice === 'number' && Number.isFinite(servicePrice) && { servicePrice }),
    };
  } catch {
    return null;
  }
}

/** The page was reloaded (or reached with Back/Forward), as opposed to opened afresh. */
const cameBack = () => {
  const [entry] = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
  return entry?.type === 'reload' || entry?.type === 'back_forward';
};

/**
 * The confirmation to show again after a reload. Opening the page afresh
 * (a link, the address bar) starts a new booking and forgets the old one.
 */
export function readConfirmedBooking(slug: string): ConfirmedBooking | null {
  try {
    if (!cameBack()) {
      sessionStorage.removeItem(keyFor(slug));
      return null;
    }
    return parseConfirmedBooking(sessionStorage.getItem(keyFor(slug)));
  } catch {
    return null;
  }
}

export function saveConfirmedBooking(slug: string, booking: ConfirmedBooking) {
  try {
    sessionStorage.setItem(keyFor(slug), JSON.stringify(booking));
  } catch {
    // Private mode or blocked storage: a reload just starts the page afresh.
  }
}

export function clearConfirmedBooking(slug: string) {
  try {
    sessionStorage.removeItem(keyFor(slug));
  } catch {
    // Nothing was stored, so there is nothing to remove.
  }
}
