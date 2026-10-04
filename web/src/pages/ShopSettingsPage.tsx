import { publicShopUrl } from '../utils/publicLink';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getMyShops, updateShop, deleteShop, type Shop, type UpdateShopDto } from '../api/shop.api';
import { useLang } from '../context/LanguageContext';
import type { Translations } from '../locales/translations';
import Switch from '../components/Switch';
import CopyLinkButton from '../components/CopyLinkButton';
import '../styles/pages/shops.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faStore,
  faLink,
  faTriangleExclamation,
} from '@fortawesome/free-solid-svg-icons';
import { apiErrorMessage } from '../utils/apiError';
import Alert from '../components/Alert';
import ConfirmDialog from '../components/ConfirmDialog';

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
  const [maxAdvanceDays, setMaxAdvanceDays] = useState('60');
  const [slotInterval, setSlotInterval] = useState('30');
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
          setMaxAdvanceDays(String(found.maxAdvanceDays));
          setSlotInterval(String(found.slotIntervalMinutes));
          setIsActive(found.isActive);
        }
      })
      .catch(() => setLoadError(t.shopSettings.errorLoad))
      .finally(() => setLoading(false));
  }, [slug]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shop || saveLoading) return;
    setSaveError('');
    setSaveSuccess('');
    setSaveLoading(true);
    try {
      const dto: UpdateShopDto = {
        name,
        isActive,
        ...(description !== undefined && { description }),
        ...(phone !== undefined && { phone }),
        formattedAddress: address,
        timezone,
        maxAdvanceDays: Number(maxAdvanceDays),
        slotIntervalMinutes: Number(slotInterval),
      };
      const updated = await updateShop(shop.id, dto);
      setShop(updated);
      setSaveSuccess(t.shopSettings.successUpdate);
      if (updated.slug !== slug) {
        navigate(`/shops/${updated.slug}/settings`, { replace: true });
      }
    } catch (err: unknown) {
      setSaveError(apiErrorMessage(err, t.shopSettings.errorUpdate));
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!shop) return;
    setDeleteError('');
    setDeleteLoading(true);
    try {
      await deleteShop(shop.id);
      navigate('/dashboard');
    } catch (err: unknown) {
      setShowDeleteConfirm(false);
      setDeleteError(apiErrorMessage(err, t.shopSettings.errorDelete));
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="shops-page">
        <div className="spinner-wrap"><div className="spinner spinner--lg" /></div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="shops-page">
        <Alert variant="danger">{loadError}</Alert>
      </div>
    );
  }

  if (notFound || !shop) {
    return (
      <div className="shops-page">
        <button className="back-link" type="button" onClick={() => navigate(`/shops/${slug}`)}>
          {t.shopSettings.backToShop}
        </button>
        <div className="empty">
          <p className="empty__text">{t.shopSettings.notFound}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="shops-page">
      <div className="shop-detail-header">
        <h1 className="t-title">{shop.name}</h1>
        <div className="cluster cluster--tight">
          <span className={`badge ${shop.role === 'owner' ? 'badge--accent' : 'badge--neutral'}`}>{shop.role}</span>
          <span className={`badge ${shop.isActive ? 'badge--success' : 'badge--neutral'}`}>
            {shop.isActive ? t.shops.active : t.shops.inactive}
          </span>
          <span className="t-body-sm t-muted">{t.shopSettings.created} {formatDate(shop.createdAt, language)}</span>
          <span className="t-body-sm t-muted">{t.shopSettings.updatedPrefix} {formatRelative(shop.updatedAt, t.shopSettings)}</span>
        </div>
      </div>

      {/* Booking link — copyable public /:slug link */}
      <div className="card">
        <h2 className="card__title">
          <FontAwesomeIcon icon={faLink} className="card__icon" />
          {t.sharing.title}
        </h2>
        <p className="card__text">{t.sharing.desc}</p>
        <CopyLinkButton link={publicShopUrl(shop.slug)} />
      </div>

      <form onSubmit={handleSave}>
        {/* Shop Details + Configuration — one card, one Save */}
        <div className="card">
          <div className="card__header">
            <div>
              <h2 className="card__title">
                <FontAwesomeIcon icon={faStore} className="card__icon" />
                {t.shopSettings.shopDetails}
              </h2>
              <p className="card__text">{t.shopSettings.saveHint}</p>
            </div>
            <button className={`btn btn--sm${saveLoading ? ' is-loading' : ''}`} type="submit" aria-busy={saveLoading}>
              {t.shopSettings.saveChanges}
            </button>
          </div>
          {saveError && <Alert variant="danger">{saveError}</Alert>}
          {saveSuccess && <Alert variant="success">{saveSuccess}</Alert>}
          <div className="field">
            <label className="field__label" htmlFor="detail-name">{t.shops.name}</label>
            <input className="input" id="detail-name" type="text" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="field">
            <label className="field__label" htmlFor="detail-slug">{t.shops.slug}</label>
            <input className="input"
              id="detail-slug"
              type="text"
              value={editSlug}
              readOnly
              disabled
            />
            <small className="field__hint">{t.shops.slugLockedHint}</small>
          </div>
          <div className="field">
            <label className="field__label" htmlFor="detail-description">{t.shops.description}</label>
            <textarea className="textarea"
              id="detail-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder={t.shopSettings.descPlaceholder}
            />
          </div>
          <div className="field">
            <label className="field__label" htmlFor="detail-phone">{t.shops.phone}</label>
            <input className="input" id="detail-phone" type="text" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="field">
            <label className="field__label" htmlFor="detail-address">{t.shops.address}</label>
            <input className="input"
              id="detail-address"
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={t.shopSettings.addressPlaceholder}
            />
          </div>
          <div className="field">
            <label className="field__label" htmlFor="detail-timezone">{t.shops.timezone}</label>
            <div className="select-wrap"><select className="select" id="detail-timezone" value={timezone} onChange={(e) => setTimezone(e.target.value)}>
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select></div>
          </div>
          <div className="field">
            <label className="field__label" htmlFor="detail-max-advance">{t.shopSettings.maxAdvanceLabel}</label>
            <input className="input"
              id="detail-max-advance"
              type="number"
              inputMode="numeric"
              min={1}
              max={730}
              step={1}
              value={maxAdvanceDays}
              onChange={(e) => setMaxAdvanceDays(e.target.value)}
              required
            />
            <small className="field__hint">{t.shopSettings.maxAdvanceHint}</small>
          </div>
          <div className="field">
            <label className="field__label" htmlFor="detail-slot-interval">{t.shopSettings.slotIntervalLabel}</label>
            <div className="select-wrap"><select className="select"
              id="detail-slot-interval"
              value={slotInterval}
              onChange={(e) => setSlotInterval(e.target.value)}
            >
              {[10, 15, 20, 30].map((m) => (
                <option key={m} value={m}>
                  {t.shopSettings.slotIntervalOption.replace('{n}', String(m))}
                </option>
              ))}
            </select></div>
            <small className="field__hint">{t.shopSettings.slotIntervalHint}</small>
          </div>
          <div className="setting-row">
            <div className="setting-row__label">
              <label htmlFor="detail-active" className="setting-row__title">{t.shopSettings.activeLabel}</label>
              <span className="setting-row__text">{t.shopSettings.activeDesc}</span>
            </div>
            <Switch id="detail-active" checked={isActive} onChange={setIsActive} label={t.shopSettings.activeLabel} />
          </div>
        </div>
      </form>

      {/* Danger Zone */}
      {shop.role === 'owner' && (
        <div className="card card--danger">
          <h2 className="card__title">
            <FontAwesomeIcon icon={faTriangleExclamation} className="card__icon" />
            {t.shops.dangerZone}
          </h2>
          <p className="card__text">{t.shops.dangerDesc}</p>
          {deleteError && <Alert variant="danger">{deleteError}</Alert>}
          <button className="btn btn--danger-outline btn--sm" type="button" onClick={() => { setDeleteError(''); setShowDeleteConfirm(true); }}>
            {t.shops.deleteShop}
          </button>
        </div>
      )}

      {showDeleteConfirm && (
        <ConfirmDialog
          tone="danger"
          title={t.shopSettings.deleteShopTitle.replace('{name}', shop.name)}
          message={t.shopSettings.areYouSure.replace('{name}', shop.name)}
          confirmLabel={t.shopSettings.deleteShopConfirmButton}
          cancelLabel={t.shops.cancel}
          busy={deleteLoading}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </div>
  );
}
