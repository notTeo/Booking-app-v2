import { useEffect } from 'react';
import { useShop } from '../context/ShopContext';
import type { ShopRole } from '../api/shop.api';
import { useMyShops } from './useMyShops';
import { useShopSlug } from './useShopSlug';

export interface NavShop {
  slug: string;
  /** Null while the shop on screen is still being looked up. */
  name: string | null;
  role: ShopRole | undefined;
}

const STORAGE_KEY = 'last-shop';

function read(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function write(slug: string) {
  try {
    localStorage.setItem(STORAGE_KEY, slug);
  } catch {
    // Private mode or blocked storage: the last shop just won't be remembered.
  }
}

/** Outside a shop: the shop opened last if the user is still in it, else their first one. */
export function pickNavShop<T extends { slug: string }>(shops: T[] | undefined, lastSlug: string | null): T | null {
  return shops?.find((s) => s.slug === lastSlug) ?? shops?.[0] ?? null;
}

// The shop the sidebar points at, so it looks the same on every page: the shop
// on screen, or outside a shop (dashboard, account) one of the user's own.
// Null only for someone who is not in any shop.
export function useNavShop(): NavShop | null {
  const slug = useShopSlug();
  const { shop, isLoading } = useShop();
  const { data: shops } = useMyShops();

  useEffect(() => {
    if (slug) write(slug);
  }, [slug]);

  if (slug) {
    // The shop list usually has it before the route's own lookup finishes.
    const known = shop ?? shops?.find((s) => s.slug === slug);
    return { slug, name: known?.name ?? (isLoading ? null : slug), role: known?.role };
  }
  const own = pickNavShop(shops, read());
  return own && { slug: own.slug, name: own.name, role: own.role };
}
