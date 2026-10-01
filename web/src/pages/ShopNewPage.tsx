import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { createShop, type CreateShopDto } from '../api/shop.api';
import '../styles/pages/shops.css';
import { apiErrorMessage } from '../utils/apiError';
import Alert from '../components/Alert';

const TIMEZONES = Intl.supportedValuesOf('timeZone');

export default function ShopNewPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [timezone, setTimezone] = useState('Europe/Athens');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!user?.isPro) {
    return (
      <div className="shops-page">
        <div className="card shops-upgrade-card">
          <h2 className="card__title">Pro Account Required</h2>
          <p className="card__text">Creating a shop requires a Pro account. Contact us to upgrade.</p>
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
        ...(address && { formattedAddress: address }),
        timezone,
      };
      const shop = await createShop(dto);
      navigate(`/shops/${shop.slug}`);
    } catch (err: unknown) {
      setError(apiErrorMessage(err, 'Failed to create shop.'));
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
        <h1 className="t-heading">New Shop</h1>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label className="field__label" htmlFor="shop-name">Name *</label>
            <input className="input"
              id="shop-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="field">
            <label className="field__label" htmlFor="shop-slug">Slug *</label>
            <input className="input"
              id="shop-slug"
              type="text"
              value={slug}
              onChange={(e) => handleSlugInput(e.target.value)}
              placeholder="my-barbershop"
              minLength={3}
              maxLength={40}
              required
            />
            <span className="shop-field-hint">
              3-40 characters: lowercase letters, numbers, and hyphens (not at the start or end).
              Used in your shop URL and cannot be changed later.
            </span>
          </div>

          <div className="field">
            <label className="field__label" htmlFor="shop-description">Description</label>
            <input className="input"
              id="shop-description"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="shop-form-row">
            <div className="field">
              <label className="field__label" htmlFor="shop-phone">Phone</label>
              <input className="input"
                id="shop-phone"
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div className="field">
              <label className="field__label" htmlFor="shop-timezone">Timezone</label>
              <div className="select-wrap"><select className="select"
                id="shop-timezone"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </select></div>
            </div>
          </div>

          <div className="field">
            <label className="field__label" htmlFor="shop-address">Address</label>
            <input className="input"
              id="shop-address"
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="123 Main St, Athens, Greece"
            />
          </div>

          {error && <Alert variant="danger">{error}</Alert>}

          <div className="shop-form-actions">
            <button className="btn" type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Shop'}
            </button>
            <button
              className="btn btn--secondary"
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
