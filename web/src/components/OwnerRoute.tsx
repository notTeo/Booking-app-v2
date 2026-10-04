import { Navigate, Outlet } from 'react-router-dom';
import { canManageShop } from '../utils/roles';
import { useShop } from '../context/ShopContext';

// Layout route for shop pages only the owner and managers may use. Staff are sent to the shop
// overview; the sidebar already hides these links, this covers direct URLs.
// Must sit inside ShopGate so `shop` is resolved.
export default function OwnerRoute() {
  const { shop } = useShop();
  if (!shop) return null;
  if (!canManageShop(shop.role)) return <Navigate to={`/shops/${shop.slug}`} replace />;
  return <Outlet />;
}
