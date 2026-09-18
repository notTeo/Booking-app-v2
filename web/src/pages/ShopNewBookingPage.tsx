import { useNavigate, useParams } from 'react-router-dom';
import { useShop } from '../context/ShopContext';
import OwnerBookingWizard from '../components/booking-wizard/OwnerBookingWizard';
import '../styles/pages/public.css';

export default function ShopNewBookingPage() {
  const { slug } = useParams<{ slug: string }>();
  const { shop, isLoading } = useShop();
  const navigate = useNavigate();

  if (isLoading) return <div className="public-loading"><div className="spinner" /></div>;
  if (!shop || !slug) return null;

  return (
    <div className="public-page">
      <header className="public-header">
        <div className="public-header-inner">
          <h1 className="public-shop-name">{shop.name}</h1>
        </div>
      </header>

      <main className="public-main">
        <OwnerBookingWizard
          shopId={shop.id}
          slug={slug}
          onDone={() => navigate(`/shops/${slug}/bookings`)}
        />
      </main>
    </div>
  );
}
