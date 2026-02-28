import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { createShop, type CreateShopDto } from '../api/shop.api';
import '../styles/pages/shops.css';

const TIMEZONES = Intl.supportedValuesOf('timeZone');

export default function ShopNewPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [timezone, setTimezone] = useState('Europe/Athens');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isPro = user?.plan === 'pro';

  if (!isPro) {
    return (
      <div className="shops-page">
        <div className="card shops-upgrade-card">
          <h2>Pro Plan Required</h2>
          <p>Creating shops requires an active Pro or Business subscription.</p>
          <a href="/pricing" className="btn btn-primary">Upgrade to Pro</a>
        </div>
      </div>
    );
  }

  const handleSlugInput = (value: string) => {
    setSlug(value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const dto: CreateShopDto = {
        name,
        slug,
        ...(description && { description }),
        ...(phone && { phone }),
        ...(address && { address }),
        ...(city && { city }),
        ...(country && { country }),
        timezone,
      };
      const shop = await createShop(dto);
      navigate(`/shops/${shop.slug}`);
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Failed to create shop.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="shops-page">
      <div className="shop-detail-back">
        <button className="card-back" type="button" onClick={() => navigate('/shops')}>
          ← My Shops
        </button>
      </div>

      <div className="card shop-form-card">
        <h1>New Shop</h1>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="shop-name">Name *</label>
            <input
              id="shop-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="shop-slug">Slug *</label>
            <input
              id="shop-slug"
              type="text"
              value={slug}
              onChange={(e) => handleSlugInput(e.target.value)}
              placeholder="my-barbershop"
              required
            />
            <span className="shop-field-hint">
              Lowercase letters, numbers, and hyphens only. Used in your shop URL.
            </span>
          </div>

          <div className="form-group">
            <label htmlFor="shop-description">Description</label>
            <input
              id="shop-description"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="shop-form-row">
            <div className="form-group">
              <label htmlFor="shop-phone">Phone</label>
              <input
                id="shop-phone"
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="shop-city">City</label>
              <input
                id="shop-city"
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="shop-address">Address</label>
            <input
              id="shop-address"
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          <div className="shop-form-row">
            <div className="form-group">
              <label htmlFor="shop-country">Country</label>
              <input
                id="shop-country"
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="shop-timezone">Timezone</label>
              <select
                id="shop-timezone"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </select>
            </div>
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          <div className="shop-form-actions">
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Shop'}
            </button>
            <button
              className="btn btn-ghost"
              type="button"
              onClick={() => navigate('/shops')}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
