import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { createShop, type CreateShopDto } from '../api/shop.api';
import '../styles/pages/shops.css';

const TIMEZONES = Intl.supportedValuesOf('timeZone');

interface LocationData {
  lat: number;
  lng: number;
  formattedAddress: string;
  placeId: string;
}

let mapsPromise: Promise<void> | null = null;

function loadGoogleMaps(): Promise<void> {
  if (mapsPromise) return mapsPromise;

  mapsPromise = new Promise<void>((resolve, reject) => {
    if (typeof google !== 'undefined' && google.maps?.places) {
      resolve();
      return;
    }

    (window as any).__googleMapsCallback = () => {
      delete (window as any).__googleMapsCallback;
      resolve();
    };

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${
      import.meta.env.VITE_GOOGLE_MAPS_API_KEY
    }&libraries=places&loading=async&callback=__googleMapsCallback`;
    script.async = true;
    script.onerror = () => {
      mapsPromise = null;
      reject(new Error('Google Maps script failed to load'));
    };
    document.head.appendChild(script);
  });

  return mapsPromise;
}

export default function ShopNewPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [timezone, setTimezone] = useState('Europe/Athens');

  const [addressInput, setAddressInput] = useState('');
  const [location, setLocation] = useState<LocationData | null>(null);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [mapsReady, setMapsReady] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const sessionTokenRef = useRef<any>(null);

  const isPro = user?.plan === 'pro';

  useEffect(() => {
    loadGoogleMaps()
      .then(() => setMapsReady(true))
      .catch(() => {
        setError('Address search unavailable. You can still enter an address manually.');
        setMapsReady(true);
      });
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchPredictions = useCallback(async (input: string) => {
    if (input.length < 2) {
      setPredictions([]);
      setDropdownOpen(false);
      return;
    }
    try {
      const { suggestions } =
      await (google.maps.places as any).AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input,
        sessionToken: sessionTokenRef.current,
      });

      const placePredictions = suggestions
        .filter((s: any) => s.placePrediction)
        .map((s: any) => s.placePrediction);

      setPredictions(placePredictions);
      setDropdownOpen(placePredictions.length > 0);
      setActiveIndex(-1);
    } catch {
      setPredictions([]);
      setDropdownOpen(false);
    }
  }, []);

  const handleAddressChange = (value: string) => {
    setAddressInput(value);
    setLocation(null);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchPredictions(value), 300);
  };

  const selectPrediction = async (prediction: any) => {
    setAddressInput(prediction.text.text);
    setPredictions([]);
    setDropdownOpen(false);

    try {
      const place = prediction.toPlace();
      await place.fetchFields({
        fields: ['location', 'formattedAddress', 'id'],
        sessionToken: sessionTokenRef.current,
      });

      if (place.location) {
        setLocation({
          lat: place.location.lat(),
          lng: place.location.lng(),
          formattedAddress: place.formattedAddress ?? prediction.text.text,
          placeId: place.id,
        });
      }
      sessionTokenRef.current = null;
    } catch (err) {
      console.error('Failed to fetch place details:', err);
      setLocation(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!dropdownOpen || predictions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, predictions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      selectPrediction(predictions[activeIndex]);
    } else if (e.key === 'Escape') {
      setDropdownOpen(false);
    }
  };

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
        ...(location && {
          lat: location.lat,
          lng: location.lng,
          formattedAddress: location.formattedAddress,
          placeId: location.placeId,
        }),
        ...(!location && addressInput && { formattedAddress: addressInput }),
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

          {/* Address autocomplete */}
          <div className="form-group" ref={wrapperRef} style={{ position: 'relative' }}>
            <label htmlFor="shop-address">Address</label>
            <input
              id="shop-address"
              type="text"
              value={addressInput}
              onChange={(e) => handleAddressChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => {
                if (mapsReady && !sessionTokenRef.current) {
                  sessionTokenRef.current = new (google.maps.places as any).AutocompleteSessionToken();
                }
                predictions.length > 0 && setDropdownOpen(true);
              }}
              placeholder="123 Main St, Athens, Greece"
              autoComplete="off"
              disabled={!mapsReady}
            />

            {location && (
              <span className="shop-field-hint" style={{ color: 'var(--color-success, #22c55e)' }}>
                ✓ Location confirmed
              </span>
            )}

            {dropdownOpen && predictions.length > 0 && (
              <ul
                role="listbox"
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  zIndex: 50,
                  margin: '2px 0 0',
                  padding: 0,
                  listStyle: 'none',
                  background: 'var(--color-surface, #1e1e1e)',
                  border: '1px solid var(--color-border, #333)',
                  borderRadius: '6px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                  overflow: 'hidden',
                }}
              >
                {predictions.map((p: any, i: number) => (
                  <li
                    key={p.placeId}
                    role="option"
                    aria-selected={i === activeIndex}
                    onMouseDown={() => selectPrediction(p)}
                    onMouseEnter={() => setActiveIndex(i)}
                    style={{
                      padding: '10px 14px',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      lineHeight: 1.4,
                      background: i === activeIndex
                        ? 'var(--color-primary-muted, rgba(34,197,94,0.12))'
                        : 'transparent',
                      color: 'var(--color-text, #e5e5e5)',
                      borderBottom: i < predictions.length - 1
                        ? '1px solid var(--color-border, #2a2a2a)'
                        : 'none',
                      transition: 'background 0.1s',
                    }}
                  >
                    <span style={{ fontWeight: 500 }}>
                      {p.text.text}
                    </span>
                  </li>
                ))}
              </ul>
            )}
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
