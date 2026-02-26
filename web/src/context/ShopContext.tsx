import { createContext, useContext, useEffect, useState } from 'react';
import { Outlet, useParams } from 'react-router-dom';
import { getMyShops, type Shop } from '../api/shop.api';

interface ShopContextType {
  shop: Shop | null;
  isLoading: boolean;
  setShop: (shop: Shop | null) => void;
  setIsLoading: (v: boolean) => void;
}

const ShopContext = createContext<ShopContextType | null>(null);

export function ShopContextProvider({ children }: { children: React.ReactNode }) {
  const [shop, setShop] = useState<Shop | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  return (
    <ShopContext.Provider value={{ shop, isLoading, setShop, setIsLoading }}>
      {children}
    </ShopContext.Provider>
  );
}

export function ShopRouteProvider() {
  const { slug } = useParams<{ slug: string }>();
  const ctx = useContext(ShopContext);

  if (!ctx) throw new Error('ShopRouteProvider must be inside ShopContextProvider');

  const { setShop, setIsLoading } = ctx;

  useEffect(() => {
    if (!slug) return;

    setIsLoading(true);
    getMyShops()
      .then((shops) => {
        const found = shops.find((s) => s.slug === slug) ?? null;
        setShop(found);
      })
      .catch(() => setShop(null))
      .finally(() => setIsLoading(false));

    return () => {
      setShop(null);
    };
  }, [slug]);

  return <Outlet />;
}

export function useShop() {
  const ctx = useContext(ShopContext);
  if (!ctx) throw new Error('useShop must be used within ShopContextProvider');
  return { shop: ctx.shop, isLoading: ctx.isLoading };
}