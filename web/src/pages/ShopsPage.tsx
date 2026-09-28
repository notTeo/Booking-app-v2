import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LanguageContext';
import { getMyShops, type Shop } from '../api/shop.api';
import '../styles/pages/shops.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus } from '@fortawesome/free-solid-svg-icons';

export default function ShopsPage() {
  const { user } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();

  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isPro = !!user?.isPro;

  useEffect(() => {
    getMyShops()
      .then(setShops)
      .catch(() => setError(t.shops.errorLoad))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="shops-page">
      <div className="shops-header">
        <h1>{t.shops.title}</h1>
      </div>

      {loading && (
        <div className="shops-spinner-wrap">
          <div className="spinner" />
        </div>
      )}

      {!loading && error && (
        <div className="alert alert-error">{error}</div>
      )}

      {!loading && !error && shops.length === 0 && (
        <div className="shops-empty">
          <p>{t.shops.noShops}</p>
          {isPro && (
            <button type="button" className="shop-card shop-card--add" onClick={() => navigate('/shops/new')}>
              <FontAwesomeIcon icon={faPlus} className="shop-card--add-icon" />
              <span>{t.shops.createFirstShop}</span>
            </button>
          )}
        </div>
      )}

      {!loading && !error && shops.length > 0 && (
        <div className="shops-grid">
          {shops.map((shop) => (
            <Link key={shop.id} to={`/shops/${shop.slug}`} className="shop-card">
              <div className="shop-card-top">
                <span className="shop-card-name">{shop.name}</span>
                <span className={`shop-status-badge ${shop.isActive ? 'active' : 'inactive'}`}>
                  {shop.isActive ? t.shops.active : t.shops.inactive}
                </span>
              </div>
              <span className="shop-card-slug">/{shop.slug}</span>
              {shop.description && (
                <p className="shop-card-desc">{shop.description}</p>
              )}
              <div className="shop-card-meta">
                <span className="shop-role-badge">{shop.role}</span>
                {shop.formattedAddress && <span className="shop-card-city">{shop.formattedAddress}</span>}
              </div>
            </Link>
          ))}
          <button
            type="button"
            className="shop-card shop-card--add"
            onClick={() => navigate('/shops/new')}
            disabled={!isPro}
            title={!isPro ? t.shops.upgradeToCreate : undefined}
          >
            <FontAwesomeIcon icon={faPlus} className="shop-card--add-icon" />
            <span>{t.shops.newShop}</span>
          </button>
        </div>
      )}
    </div>
  );
}
