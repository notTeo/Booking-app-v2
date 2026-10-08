import { createContext, useContext, useEffect, useState } from 'react';
import { Outlet, useParams } from 'react-router-dom';
import { getMyShops, type Shop } from '../api/shop.api';

interface ShopContextType {
  shop: Shop | null;
  isLoading: boolean;
  /** The shop list could not be fetched (as opposed to the shop not being in it). */
  error: boolean;
  setShop: (shop: Shop | null) => void;
  setIsLoading: (v: boolean) => void;
  setError: (v: boolean) => void;
  /** Bumped to make ShopRouteProvider look the shop up again. */
  reloadKey: number;
  refetch: () => void;
}

const ShopContext = createContext<ShopContextType | null>(null);

export function ShopContextProvider({ children }: { children: React.ReactNode }) {
  const [shop, setShop] = useState<Shop | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const refetch = () => setReloadKey((k) => k + 1);

  return (
    <ShopContext.Provider
      value={{ shop, isLoading, error, setShop, setIsLoading, setError, reloadKey, refetch }}
    >
      {children}
    </ShopContext.Provider>
  );
}

export function ShopRouteProvider() {
  const { slug } = useParams<{ slug: string }>();
  const ctx = useContext(ShopContext);

  if (!ctx) throw new Error('ShopRouteProvider must be inside ShopContextProvider');

  const { setShop, setIsLoading, setError, reloadKey } = ctx;

  useEffect(() => {
    if (!slug) return;

    let cancelled = false;
    setIsLoading(true);
    setError(false);
    getMyShops()
      .then((shops) => {
        if (!cancelled) setShop(shops.find((s) => s.slug === slug) ?? null);
      })
      .catch(() => {
        if (cancelled) return;
        setShop(null);
        setError(true);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
      setShop(null);
    };
  }, [slug, reloadKey]);

  return <Outlet />;
}

export function useShop() {
  const ctx = useContext(ShopContext);
  if (!ctx) throw new Error('useShop must be used within ShopContextProvider');
  return {
    shop: ctx.shop,
    isLoading: ctx.isLoading,
    error: ctx.error,
    refetch: ctx.refetch,
    /** Puts a shop the API just returned in place, without the reload (and spinner) of `refetch`. */
    update: ctx.setShop as (shop: Shop) => void,
  };
}