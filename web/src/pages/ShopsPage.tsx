import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getMyShops, type Shop } from '../api/shop.api';
import '../styles/pages/shops.css';

export default function ShopsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isPro = user?.plan === 'pro';

  useEffect(() => {
    getMyShops()
      .then(setShops)
      .catch(() => setError('Failed to load shops.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="shops-page">
      <div className="shops-header">
        <h1>My Shops</h1>
        <div>
          {!isPro && (
            <span className="shops-upgrade-hint">
              <a href="/pricing">Upgrade to Pro</a> to create shops.
            </span>
          )}
          <button
            className="btn btn-primary shops-new-btn"
            onClick={() => navigate('/shops/new')}
            disabled={!isPro}
            title={!isPro ? 'Upgrade to Pro to create shops' : undefined}
          >
            + New Shop
          </button>
        </div>
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
          <p>You have no shops yet.</p>
          {isPro && (
            <button className="btn btn-primary" onClick={() => navigate('/shops/new')}>
              Create your first shop
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
                  {shop.isActive ? 'Active' : 'Inactive'}
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
        </div>
      )}
    </div>
  );
}
