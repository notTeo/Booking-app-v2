import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getMyShops, updateShop, deleteShop, type Shop, type UpdateShopDto } from '../api/shop.api';
import '../styles/pages/shops.css';

export default function ShopSettingsPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [shop, setShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState('');

  const [name, setName] = useState('');
  const [editSlug, setEditSlug] = useState('');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
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
          setAddress(found.address ?? '');
          setCity(found.city ?? '');
          setCountry(found.country ?? '');
          setTimezone(found.timezone);
          setIsActive(found.isActive);
        }
      })
      .catch(() => setLoadError('Failed to load shop.'))
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
        ...(address !== undefined && { address }),
        ...(city !== undefined && { city }),
        ...(country !== undefined && { country }),
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

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

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
        {/* CHANGED: back to shop overview, not /shops */}
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
          <span className="shop-detail-date">Created {formatDate(shop.createdAt)}</span>
        </div>
      </div>

      <div className="card shop-form-card">
        <form onSubmit={handleSave}>
          <div className="form-group">
            <label htmlFor="detail-name">Name</label>
            <input id="detail-name" type="text" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="form-group">
            <label htmlFor="detail-slug">Slug</label>
            <input id="detail-slug" type="text" value={editSlug} onChange={(e) => handleSlugInput(e.target.value)} required />
            <span className="shop-field-hint">Lowercase letters, numbers, and hyphens only.</span>
          </div>
          <div className="form-group">
            <label htmlFor="detail-description">Description</label>
            <input id="detail-description" type="text" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="shop-form-row">
            <div className="form-group">
              <label htmlFor="detail-phone">Phone</label>
              <input id="detail-phone" type="text" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="form-group">
              <label htmlFor="detail-city">City</label>
              <input id="detail-city" type="text" value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="detail-address">Address</label>
            <input id="detail-address" type="text" value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
          <div className="shop-form-row">
            <div className="form-group">
              <label htmlFor="detail-country">Country</label>
              <input id="detail-country" type="text" value={country} onChange={(e) => setCountry(e.target.value)} />
            </div>
            <div className="form-group">
              <label htmlFor="detail-timezone">Timezone</label>
              <input id="detail-timezone" type="text" value={timezone} onChange={(e) => setTimezone(e.target.value)} />
            </div>
          </div>
          <div className="form-group shop-active-toggle">
            <label className="shop-checkbox-label">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
              Active
            </label>
          </div>
          {saveError && <div className="alert alert-error">{saveError}</div>}
          {saveSuccess && <div className="alert alert-success">{saveSuccess}</div>}
          <button className="btn btn-primary" type="submit" disabled={saveLoading}>
            {saveLoading ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>

      {shop.role === 'owner' && (
        <div className="card shop-danger-card">
          <p className="shop-danger-title">Danger Zone</p>
          <p className="shop-danger-desc">Permanently delete this shop and all its data. This action cannot be undone.</p>
          {!showDeleteConfirm ? (
            <button className="btn btn-danger" type="button" onClick={() => setShowDeleteConfirm(true)}>
              Delete Shop
            </button>
          ) : (
            <form onSubmit={handleDelete}>
              <p className="shop-danger-desc">
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