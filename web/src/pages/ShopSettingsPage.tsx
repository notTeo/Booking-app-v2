import { useEffect, useState } from 'react';
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
  const [address, setAddress] = useState('');
  const [timezone, setTimezone] = useState('');
  const [isActive, setIsActive] = useState(true);

  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

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
          setAddress(found.formattedAddress ?? '');
          setTimezone(found.timezone);
          setIsActive(found.isActive);
        }
      })
      .catch(() => setLoadError(t.shopSettings.errorLoad))
      .finally(() => setLoading(false));
  }, [slug]);

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
        formattedAddress: address,
        timezone,
      };
      const updated = await updateShop(shop.id, dto);
      setShop(updated);
      setSaveSuccess(t.shopSettings.successUpdate);
      if (updated.slug !== slug) {
        navigate(`/shops/${updated.slug}/settings`, { replace: true });
      }
    } catch (err: any) {
      setSaveError(err.response?.data?.message ?? t.shopSettings.errorUpdate);
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
      setDeleteError(err.response?.data?.message ?? t.shopSettings.errorDelete);
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
          {t.shopSettings.backToShop}
        </button>
        <div className="shops-empty">
          <p>{t.shopSettings.notFound}</p>
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
            {shop.isActive ? t.shops.active : t.shops.inactive}
          </span>
          <span className="shop-detail-date">{t.shopSettings.created} {formatDate(shop.createdAt, language)}</span>
          <span className="shop-detail-date">{t.shopSettings.updatedPrefix} {formatRelative(shop.updatedAt, t.shopSettings)}</span>
        </div>
      </div>

      <form onSubmit={handleSave}>
        {/* General Info */}
        <div className="settings-section shop-settings-section">
          <p className="settings-section-title">
            <FontAwesomeIcon icon={faStore} className="settings-section-icon" />
            {t.shopSettings.generalInfo}
          </p>
          <div className="form-group">
            <label htmlFor="detail-name">{t.shops.name}</label>
            <input id="detail-name" type="text" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="form-group">
            <label htmlFor="detail-slug">{t.shops.slug}</label>
            <input
              id="detail-slug"
              type="text"
              value={editSlug}
              onChange={(e) => handleSlugInput(e.target.value)}
              required
            />
            <span className="shop-field-hint">{t.shops.slugHint}</span>
          </div>
          <div className="form-group">
            <label htmlFor="detail-description">{t.shops.description}</label>
            <textarea
              id="detail-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder={t.shopSettings.descPlaceholder}
            />
          </div>
        </div>

        {/* Contact & Location */}
        <div className="settings-section shop-settings-section">
          <p className="settings-section-title">
            <FontAwesomeIcon icon={faLocationDot} className="settings-section-icon" />
            {t.shopSettings.contactLocation}
          </p>
          <div className="form-group">
            <label htmlFor="detail-phone">{t.shops.phone}</label>
            <input id="detail-phone" type="text" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="form-group">
            <label htmlFor="detail-address">{t.shops.address}</label>
            <input
              id="detail-address"
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={t.shopSettings.addressPlaceholder}
            />
          </div>
          <div className="form-group">
            <label htmlFor="detail-timezone">{t.shops.timezone}</label>
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
            {t.shopSettings.configuration}
          </p>
          <div className="shop-active-row">
            <div className="shop-active-label">
              <label htmlFor="detail-active" className="shop-active-name">{t.shopSettings.activeLabel}</label>
              <span className="shop-active-desc">{t.shopSettings.activeDesc}</span>
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
            {saveLoading ? t.shopSettings.saving : t.shopSettings.saveChanges}
          </button>
        </div>
      </form>

      {/* Danger Zone */}
      {shop.role === 'owner' && (
        <div className="settings-section settings-section--danger shop-settings-section">
          <p className="settings-section-title">
            <FontAwesomeIcon icon={faTriangleExclamation} className="settings-section-icon" />
            {t.shops.dangerZone}
          </p>
          <p className="settings-danger-desc">{t.shops.dangerDesc}</p>
          {!showDeleteConfirm ? (
            <button className="btn btn-danger" type="button" onClick={() => setShowDeleteConfirm(true)}>
              {t.shops.deleteShop}
            </button>
          ) : (
            <form onSubmit={handleDelete}>
              <p className="settings-danger-desc">
                {t.shopSettings.areYouSure.replace('{name}', shop.name)}
              </p>
              {deleteError && <div className="alert alert-error">{deleteError}</div>}
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button className="btn btn-danger" type="submit" disabled={deleteLoading}>
                  {deleteLoading ? t.shops.deleting : t.shopSettings.yesDeleteShop}
                </button>
                <button className="btn btn-ghost" type="button" onClick={() => { setShowDeleteConfirm(false); setDeleteError(''); }}>
                  {t.shops.cancel}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
