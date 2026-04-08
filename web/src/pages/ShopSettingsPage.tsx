import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getMyShops, updateShop, deleteShop, type Shop, type UpdateShopDto } from '../api/shop.api';
import { useLang } from '../context/LanguageContext';
import type { Translations } from '../locales/translations';
import '../styles/pages/shops.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faStore,
  faLocationDot,
  faGear,
  faTriangleExclamation,
} from '@fortawesome/free-solid-svg-icons';

// ─── Google Maps loader (same singleton as ShopNewPage) ───────────────────────
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
// ─────────────────────────────────────────────────────────────────────────────

interface LocationData {
  lat: number;
  lng: number;
  formattedAddress: string;
  placeId: string;
}

const TIMEZONES = Intl.supportedValuesOf('timeZone');

function formatDate(iso: string, language: string) {
  const locale = language === 'el' ? 'el-GR' : 'en-US';
  return new Date(iso).toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatRelative(iso: string, t: Translations['shopSettings']) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return t.relativeToday;
  if (diffDays === 1) return t.relativeYesterday;
  if (diffDays < 7) return `${diffDays} ${t.relativeDaysAgo}`;
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 5) return `${diffWeeks} ${diffWeeks > 1 ? t.relativeWeeksAgo : t.relativeWeekAgo}`;
  const diffMonths = Math.floor(diffDays / 30);
  return `${diffMonths} ${diffMonths > 1 ? t.relativeMonthsAgo : t.relativeMonthAgo}`;
}

export default function ShopSettingsPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { language, t } = useLang();

  const [shop, setShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState('');

  const [name, setName] = useState('');
  const [editSlug, setEditSlug] = useState('');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [timezone, setTimezone] = useState('');
  const [isActive, setIsActive] = useState(true);

  // Address autocomplete
  const [addressInput, setAddressInput] = useState('');
  const [location, setLocation] = useState<LocationData | null>(null);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [mapsReady, setMapsReady] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const sessionTokenRef = useRef<any>(null);

  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Load Maps
  useEffect(() => {
    loadGoogleMaps()
      .then(() => setMapsReady(true))
      .catch(() => setMapsReady(true)); // still enable input on failure
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load shop data
  useEffect(() => {
    getMyShops()
      .then((shops) => {
        const found = shops.find((s) => s.slug === slug);
        if (!found) {
          setNotFound(true);
        } else {
          setShop(found);
          setName(found.name);
          setEditSlug(found.slug);
          setDescription(found.description ?? '');
          setPhone(found.phone ?? '');
          setTimezone(found.timezone);
          setIsActive(found.isActive);
          if (found.formattedAddress) {
            setAddressInput(found.formattedAddress);
            if (found.lat && found.lng) {
              setLocation({
                lat: found.lat,
                lng: found.lng,
                formattedAddress: found.formattedAddress,
                placeId: found.placeId ?? '',
              });
            }
          }
        }
      })
      .catch(() => setLoadError('Failed to load shop.'))
      .finally(() => setLoading(false));
  }, [slug]);

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

  const handleSlugInput = (value: string) => {
    setEditSlug(value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shop) return;
    setSaveError('');
    setSaveSuccess('');
    setSaveLoading(true);
    try {
      const dto: UpdateShopDto = {
        name,
        slug: editSlug,
        isActive,
        ...(description !== undefined && { description }),
        ...(phone !== undefined && { phone }),
        ...(location && {
          lat: location.lat,
          lng: location.lng,
          formattedAddress: location.formattedAddress,
          placeId: location.placeId,
        }),
        ...(!location && addressInput && { formattedAddress: addressInput }),
        timezone,
      };
      const updated = await updateShop(shop.id, dto);
      setShop(updated);
      setSaveSuccess('Shop updated successfully.');
      if (updated.slug !== slug) {
        navigate(`/shops/${updated.slug}/settings`, { replace: true });
      }
    } catch (err: any) {
      setSaveError(err.response?.data?.message ?? 'Failed to update shop.');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shop) return;
    setDeleteError('');
    setDeleteLoading(true);
    try {
      await deleteShop(shop.id);
      navigate('/shops');
    } catch (err: any) {
      setDeleteError(err.response?.data?.message ?? 'Failed to delete shop.');
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="shops-page">
        <div className="shops-spinner-wrap"><div className="spinner" /></div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="shops-page">
        <div className="alert alert-error">{loadError}</div>
      </div>
    );
  }

  if (notFound || !shop) {
    return (
      <div className="shops-page">
        <button className="card-back" type="button" onClick={() => navigate(`/shops/${slug}`)}>
          ← Back to Shop
        </button>
        <div className="shops-empty">
          <p>Shop not found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="shops-page">
      <div className="shop-detail-header">
        <h1>{shop.name}</h1>
        <div className="shop-detail-meta">
          <span className="shop-role-badge">{shop.role}</span>
          <span className={`shop-status-badge ${shop.isActive ? 'active' : 'inactive'}`}>
            {shop.isActive ? 'Active' : 'Inactive'}
          </span>
          <span className="shop-detail-date">Created {formatDate(shop.createdAt, language)}</span>
          <span className="shop-detail-date">· Updated {formatRelative(shop.updatedAt, t.shopSettings)}</span>
        </div>
      </div>

      <form onSubmit={handleSave}>
        {/* General Info */}
        <div className="settings-section shop-settings-section">
          <p className="settings-section-title">
            <FontAwesomeIcon icon={faStore} className="settings-section-icon" />
            General Info
          </p>
          <div className="form-group">
            <label htmlFor="detail-name">Name</label>
            <input id="detail-name" type="text" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="form-group">
            <label htmlFor="detail-slug">Slug</label>
            <input
              id="detail-slug"
              type="text"
              value={editSlug}
              onChange={(e) => handleSlugInput(e.target.value)}
              required
            />
            <span className="shop-field-hint">Lowercase letters, numbers, and hyphens only.</span>
          </div>
          <div className="form-group">
            <label htmlFor="detail-description">Description</label>
            <textarea
              id="detail-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Describe your shop..."
            />
          </div>
        </div>

        {/* Contact & Location */}
        <div className="settings-section shop-settings-section">
          <p className="settings-section-title">
            <FontAwesomeIcon icon={faLocationDot} className="settings-section-icon" />
            Contact &amp; Location
          </p>
          <div className="form-group">
            <label htmlFor="detail-phone">Phone</label>
            <input id="detail-phone" type="text" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>

          {/* Address autocomplete */}
          <div className="form-group" ref={wrapperRef} style={{ position: 'relative' }}>
            <label htmlFor="detail-address">Address</label>
            <input
              id="detail-address"
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
                    <span style={{ fontWeight: 500 }}>{p.text.text}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="detail-timezone">Timezone</label>
            <select id="detail-timezone" value={timezone} onChange={(e) => setTimezone(e.target.value)}>
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Configuration */}
        <div className="settings-section shop-settings-section">
          <p className="settings-section-title">
            <FontAwesomeIcon icon={faGear} className="settings-section-icon" />
            Configuration
          </p>
          <div className="shop-active-row">
            <div className="shop-active-label">
              <label htmlFor="detail-active" className="shop-active-name">Active</label>
              <span className="shop-active-desc">When inactive, your shop won't accept new bookings.</span>
            </div>
            <input
              id="detail-active"
              type="checkbox"
              className="shop-active-checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
          </div>
          {saveError && <div className="alert alert-error">{saveError}</div>}
          {saveSuccess && <div className="alert alert-success">{saveSuccess}</div>}
          <button className="btn btn-primary" type="submit" disabled={saveLoading}>
            {saveLoading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>

      {/* Danger Zone */}
      {shop.role === 'owner' && (
        <div className="settings-section settings-section--danger shop-settings-section">
          <p className="settings-section-title">
            <FontAwesomeIcon icon={faTriangleExclamation} className="settings-section-icon" />
            Danger Zone
          </p>
          <p className="settings-danger-desc">Permanently delete this shop and all its data. This action cannot be undone.</p>
          {!showDeleteConfirm ? (
            <button className="btn btn-danger" type="button" onClick={() => setShowDeleteConfirm(true)}>
              Delete Shop
            </button>
          ) : (
            <form onSubmit={handleDelete}>
              <p className="settings-danger-desc">
                Are you sure? This will permanently delete <strong>{shop.name}</strong> and all its data.
              </p>
              {deleteError && <div className="alert alert-error">{deleteError}</div>}
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button className="btn btn-danger" type="submit" disabled={deleteLoading}>
                  {deleteLoading ? 'Deleting...' : 'Yes, Delete Shop'}
                </button>
                <button className="btn btn-ghost" type="button" onClick={() => { setShowDeleteConfirm(false); setDeleteError(''); }}>
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
