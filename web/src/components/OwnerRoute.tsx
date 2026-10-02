import { Navigate, Outlet } from 'react-router-dom';
import { useShop } from '../context/ShopContext';

// Layout route for shop pages only owners may use. Staff are sent to the shop
// overview; the sidebar already hides these links, this covers direct URLs.
// Must sit inside ShopGate so `shop` is resolved.
export default function OwnerRoute() {
  const { shop } = useShop();
  if (!shop) return null;
  if (shop.role !== 'owner') return <Navigate to={`/shops/${shop.slug}`} replace />;
  return <Outlet />;
}
