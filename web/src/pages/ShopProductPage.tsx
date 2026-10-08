import { useEffect, useId, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowUpRightFromSquare, faChevronLeft } from '@fortawesome/free-solid-svg-icons';
import {
  createProduct,
  deleteProduct,
  getProduct,
  removeProductPhoto,
  setProductPhoto,
  updateProduct,
  type Product,
} from '../api/product.api';
import type { PhotoCrop } from '../api/photo.api';
import { useShop } from '../context/ShopContext';
import { useLang } from '../context/LanguageContext';
import { PLAN_NAMES } from '../config/pricing';
import { apiErrorMessage } from '../utils/apiError';
import { canManageShop } from '../utils/roles';
import { formatPrice } from '../components/booking-wizard/wizardUtils';
import Alert from '../components/Alert';
import ConfirmDialog from '../components/ConfirmDialog';
import PhotoField from '../components/PhotoField';
import ProductThumb from '../components/ProductThumb';
import StockBadge from '../components/StockBadge';
import Switch from '../components/Switch';
import '../styles/pages/products.css';
import { parsePrice, parseStock } from '../utils/productForm';

/**
 * One product's own page (the product list opens it, like a team member's):
 * photo, details, supplier link and delete. `/products/new` is the same page
 * for a product that does not exist yet; its photo is picked first and
 * uploaded as soon as the product is created.
 */
export default function ShopProductPage() {
  const uid = useId();
  const { slug, productId } = useParams<{ slug: string; productId: string }>();
  const isNew = !productId;
  const { shop } = useShop();
  const { t } = useLang();
  const tp = t.products;
  const navigate = useNavigate();
  const location = useLocation();
  const shopId = shop?.id;
  const canEdit = canManageShop(shop?.role) && !!shop?.products;

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(!isNew);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState((location.state as { photoError?: boolean } | null)?.photoError ? tp.errorPhoto : '');

  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [description, setDescription] = useState('');
  const [supplierUrl, setSupplierUrl] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  // A new product: the photo chosen so far, uploaded once the product exists.
  const [pending, setPending] = useState<{ file: File; crop: PhotoCrop; preview: string } | null>(null);

  const fill = (p: Product) => {
    setName(p.name);
    setPrice((p.price / 100).toFixed(2));
    setStock(String(p.stock));
    setDescription(p.description ?? '');
    setSupplierUrl(p.supplierUrl ?? '');
    setIsActive(p.isActive);
  };

  useEffect(() => {
    if (!shopId || !productId) return;
    let live = true;
    setLoading(true);
    getProduct(shopId, productId)
      .then((p) => {
        if (!live) return;
        setProduct(p);
        fill(p);
      })
      .catch((err: unknown) => live && setError(apiErrorMessage(err, tp.notFound)))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [shopId, productId, tp.notFound]);

  // The chosen file's preview is released when it is replaced or the page closes.
  const previewUrl = pending?.preview;
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  if (!shop) return null;
  const back = `/shops/${slug}/products`;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!shopId || saving) return;
    const cents = parsePrice(price);
    const left = parseStock(stock);
    if (!name.trim() || cents === null || left === null) {
      setError(tp.errorSave);
      return;
    }
    setSaving(true);
    setError('');
    setNotice('');
    setSaved(false);
    const dto = {
      name: name.trim(),
      price: cents,
      stock: left,
      description: description.trim(),
      supplierUrl: supplierUrl.trim(),
      isActive,
    };
    try {
      if (isNew) {
        const created = await createProduct(shopId, dto);
        let photoFailed = false;
        if (pending) {
          try {
            await setProductPhoto(shopId, created.id, pending.file, pending.crop);
          } catch {
            photoFailed = true;
          }
        }
        navigate(`${back}/${created.id}`, { replace: true, state: { photoError: photoFailed } });
        return;
      }
      const updated = await updateProduct(shopId, productId!, dto);
      setProduct(updated);
      fill(updated);
      setSaved(true);
    } catch (err: unknown) {
      setError(apiErrorMessage(err, tp.errorSave));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!shopId || !productId) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await deleteProduct(shopId, productId);
      navigate(back, { replace: true });
    } catch (err: unknown) {
      setDeleteError(apiErrorMessage(err, tp.errorDelete));
      setConfirmDelete(false);
    } finally {
      setDeleting(false);
    }
  };

  const backLink = (
    <div className="cluster">
      <Link className="btn btn--secondary btn--sm" to={back}>
        <FontAwesomeIcon icon={faChevronLeft} aria-hidden="true" />
        {tp.back}
      </Link>
    </div>
  );

  if (loading) return <div className="spinner-wrap"><div className="spinner" role="status" /></div>;
  if (!isNew && !product) {
    return (
      <div className="product-page">
        {backLink}
        <Alert variant="danger">{error || tp.notFound}</Alert>
      </div>
    );
  }

  const photo = isNew
    ? { photoUrl: pending?.preview ?? null, photoOriginalUrl: null, photoCrop: null }
    : product!;

  return (
    <div className="product-page">
      {backLink}

      {!isNew && !shop.products && (
        <Alert variant="info">{tp.notInPlan.replace('{plan}', PLAN_NAMES[shop.plan])}</Alert>
      )}
      {notice && <Alert variant="warning">{notice}</Alert>}

      <div className="card">
        <PhotoField
          photo={photo}
          shape="square"
          canEdit={canEdit}
          preview={<ProductThumb photoUrl={photo.photoUrl} large />}
          onUpload={async (file, crop) => {
            if (isNew) {
              if (file) setPending({ file, crop, preview: URL.createObjectURL(file) });
            } else {
              setProduct(await setProductPhoto(shop.id, product!.id, file, crop));
            }
          }}
          onRemove={async () => {
            if (isNew) setPending(null);
            else setProduct(await removeProductPhoto(shop.id, product!.id));
          }}
        >
          <h1 className="t-heading product-page__title">{isNew ? tp.newTitle : product!.name}</h1>
          {!isNew && (
            <span className="cluster cluster--tight">
              <span className="t-body-sm">{formatPrice(product!.price)}</span>
              <StockBadge stock={product!.stock} />
              {!product!.isActive && <span className="badge badge--neutral">{tp.inactive}</span>}
            </span>
          )}
          {isNew && <small className="field__hint">{tp.photoPending}</small>}
        </PhotoField>
      </div>

      {canEdit ? (
        <form className="card product-page__form" onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label className="field__label" htmlFor={`${uid}-name`}>
              {tp.name} <span className="field__required">*</span>
            </label>
            <input id={`${uid}-name`} className="input" value={name} maxLength={120} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="field-row">
            <div className="field">
              <label className="field__label" htmlFor={`${uid}-price`}>
                {tp.price} <span className="field__required">*</span>
              </label>
              <input id={`${uid}-price`} className="input" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
            <div className="field">
              <label className="field__label" htmlFor={`${uid}-stock`}>
                {tp.stockLabel} <span className="field__required">*</span>
              </label>
              <input id={`${uid}-stock`} className="input" inputMode="numeric" value={stock} onChange={(e) => setStock(e.target.value)} />
            </div>
          </div>
          <div className="field">
            <label className="field__label" htmlFor={`${uid}-description`}>{tp.description}</label>
            <textarea id={`${uid}-description`} className="textarea" rows={3} maxLength={1000} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="field">
            <label className="field__label" htmlFor={`${uid}-supplier`}>{tp.supplier}</label>
            <div className="product-page__supplier">
              <input id={`${uid}-supplier`} className="input" type="url" inputMode="url" placeholder="https://" maxLength={500} value={supplierUrl} onChange={(e) => setSupplierUrl(e.target.value)} />
              {product?.supplierUrl && (
                <a className="btn btn--secondary btn--sm" href={product.supplierUrl} target="_blank" rel="noopener noreferrer">
                  <FontAwesomeIcon icon={faArrowUpRightFromSquare} aria-hidden="true" />
                  {tp.openSupplier}
                </a>
              )}
            </div>
            <small className="field__hint">{tp.supplierHint}</small>
          </div>
          <div className="setting-row">
            <span className="setting-row__label">
              <span className="setting-row__title">{tp.active}</span>
              <span className="setting-row__text">{tp.activeHint}</span>
            </span>
            <Switch checked={isActive} onChange={setIsActive} label={tp.active} disabled={saving} />
          </div>
          {error && <Alert variant="danger">{error}</Alert>}
          {saved && <Alert variant="success">{tp.saved}</Alert>}
          <button type="submit" className={`btn${saving ? ' is-loading' : ''}`} aria-busy={saving}>
            {isNew ? tp.create : tp.save}
          </button>
        </form>
      ) : (
        <div className="card">
          <p className="card__text">{product?.description}</p>
          <p className="t-body-sm t-muted">{tp.readOnly}</p>
        </div>
      )}

      {canEdit && !isNew && (
        <div className="card card--danger">
          <h2 className="card__title">{tp.deleteCard}</h2>
          <p className="card__text">{tp.deleteMessage}</p>
          {deleteError && <Alert variant="danger">{deleteError}</Alert>}
          <button type="button" className="btn btn--danger-outline btn--block" onClick={() => setConfirmDelete(true)}>
            {tp.delete}
          </button>
        </div>
      )}

      {confirmDelete && (
        <ConfirmDialog
          title={tp.deleteTitle}
          message={tp.deleteMessage}
          confirmLabel={tp.delete}
          cancelLabel={tp.cancel}
          tone="danger"
          busy={deleting}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </div>
  );
}
