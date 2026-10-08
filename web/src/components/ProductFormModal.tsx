import { useEffect, useId, useState, type FormEvent } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { useLang } from '../context/LanguageContext';
import { createProduct, setProductPhoto, type Product } from '../api/product.api';
import type { PhotoCrop } from '../api/photo.api';
import { apiErrorMessage } from '../utils/apiError';
import { planErrorMessage } from '../utils/plan';
import { parsePrice, parseStock } from '../utils/productForm';
import Alert from './Alert';
import Modal from './Modal';
import PhotoField from './PhotoField';
import ProductThumb from './ProductThumb';
import Switch from './Switch';

interface Props {
  shopId: string;
  /** The new product, and whether its photo (if one was chosen) failed to upload. */
  onCreated: (product: Product, photoFailed: boolean) => void;
  onClose: () => void;
}

// A new product in a pop-up, for the setup guide: photo, name, price, stock,
// description. The product page has the rest (supplier link, deleting).
export default function ProductFormModal({ shopId, onCreated, onClose }: Props) {
  const uid = useId();
  const { t } = useLang();
  const to = t.onboarding.products;
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  // The photo chosen so far, uploaded once the product exists.
  const [pending, setPending] = useState<{ file: File; crop: PhotoCrop; preview: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // The chosen file's preview is released when it is replaced or the pop-up closes.
  const previewUrl = pending?.preview;
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (saving) return;
    const cents = parsePrice(price);
    const left = parseStock(stock || '0');
    if (!name.trim() || cents === null || left === null) {
      setError(t.products.errorSave);
      return;
    }
    setSaving(true);
    setError('');
    try {
      let product = await createProduct(shopId, {
        name: name.trim(),
        price: cents,
        stock: left,
        description: description.trim(),
        isActive,
      });
      let photoFailed = false;
      if (pending) {
        try {
          product = await setProductPhoto(shopId, product.id, pending.file, pending.crop);
        } catch {
          photoFailed = true;
        }
      }
      onCreated(product, photoFailed);
    } catch (err: unknown) {
      setError(planErrorMessage(err, t.shopPlan) ?? apiErrorMessage(err, t.products.errorSave));
      setSaving(false);
    }
  };

  return (
    <Modal onClose={() => { if (!saving) onClose(); }} labelledBy={`${uid}-title`}>
      <div className="modal__header">
        <h2 id={`${uid}-title`} className="modal__title">{to.newTitle}</h2>
        <button type="button" className="btn btn--ghost btn--icon btn--sm" onClick={onClose} disabled={saving} aria-label={to.cancel}>
          <FontAwesomeIcon icon={faXmark} aria-hidden="true" />
        </button>
      </div>
      <div className="modal__body">
        {error && <Alert variant="danger">{error}</Alert>}
        <PhotoField
          photo={{ photoUrl: pending?.preview ?? null, photoOriginalUrl: null, photoCrop: null }}
          shape="square"
          canEdit={!saving}
          preview={<ProductThumb photoUrl={pending?.preview} large />}
          onUpload={async (file, crop) => {
            if (file) setPending({ file, crop, preview: URL.createObjectURL(file) });
          }}
          onRemove={async () => setPending(null)}
        >
          {pending && <small className="field__hint">{to.photoLater}</small>}
        </PhotoField>
        <form id={`${uid}-form`} onSubmit={handleSubmit}>
          <div className="field">
            <label className="field__label" htmlFor={`${uid}-name`}>{to.name}</label>
            <input id={`${uid}-name`} className="input" value={name} onChange={(e) => setName(e.target.value)} disabled={saving} required />
          </div>
          <div className="field-row">
            <div className="field">
              <label className="field__label" htmlFor={`${uid}-price`}>{to.price}</label>
              <input
                id={`${uid}-price`}
                className="input"
                inputMode="decimal"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                disabled={saving}
                required
              />
            </div>
            <div className="field">
              <label className="field__label" htmlFor={`${uid}-stock`}>{to.stock}</label>
              <input
                id={`${uid}-stock`}
                className="input"
                inputMode="numeric"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                placeholder="0"
                disabled={saving}
              />
            </div>
          </div>
          <div className="field">
            <label className="field__label" htmlFor={`${uid}-description`}>{to.description}</label>
            <textarea
              id={`${uid}-description`}
              className="textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              disabled={saving}
            />
          </div>
          <div className="setting-row">
            <span className="setting-row__title">{to.active}</span>
            <Switch checked={isActive} onChange={setIsActive} label={to.active} disabled={saving} />
          </div>
        </form>
      </div>
      <div className="modal__footer">
        <button type="button" className="btn btn--ghost" onClick={onClose} disabled={saving}>{to.cancel}</button>
        <button type="submit" form={`${uid}-form`} className={`btn${saving ? ' is-loading' : ''}`} aria-busy={saving}>
          {to.add}
        </button>
      </div>
    </Modal>
  );
}
