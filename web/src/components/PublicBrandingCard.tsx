import SaveBar from './SaveBar';
import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPalette } from '@fortawesome/free-solid-svg-icons';
import { updateShop, type Shop } from '../api/shop.api';
import { useLang } from '../context/LanguageContext';
import { apiErrorMessage } from '../utils/apiError';
import {
  PUBLIC_FONTS,
  PUBLIC_PALETTES,
  parsePublicFont,
  parsePublicPalette,
  type PublicFont,
  type PublicPalette,
} from '../utils/branding';
import Alert from './Alert';

/**
 * Shop settings: the colour set and fonts of the public booking page, next to
 * a live preview of that page. The preview is the real page in a frame, shown
 * with the look being tried (it takes ?palette=&font=), so nothing changes for
 * customers until Save.
 */
export default function PublicBrandingCard({
  shop,
  onSaved,
}: {
  shop: Shop;
  onSaved: (shop: Shop) => void;
}) {
  const { t } = useLang();
  const tb = t.branding;
  const savedPalette = parsePublicPalette(shop.publicPalette);
  const savedFont = parsePublicFont(shop.publicFont);

  const [palette, setPalette] = useState<PublicPalette>(savedPalette);
  const [font, setFont] = useState<PublicFont>(savedFont);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const canEdit = shop.canEditShopSettings;
  const dirty = palette !== savedPalette || font !== savedFont;

  const handleSave = async () => {
    if (!dirty || saving) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      onSaved(await updateShop(shop.id, { publicPalette: palette, publicFont: font }));
      setSuccess(tb.saved);
    } catch (err: unknown) {
      setError(apiErrorMessage(err, tb.errorSave));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`card${dirty ? ' card--unsaved' : ''}`}>
      <div className="card__header">
        <div>
          <h2 className="card__title">
            <FontAwesomeIcon icon={faPalette} className="card__icon" />
            {tb.title}
          </h2>
          <p className="card__text">{tb.desc}</p>
        </div>
        <button
          type="button"
          className={`btn btn--sm${saving ? ' is-loading' : ''}`}
          onClick={handleSave}
          aria-busy={saving}
          disabled={!canEdit || !dirty}
        >
          {tb.save}
        </button>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}
      {success && !dirty && <Alert variant="success">{success}</Alert>}

      <div className="brand-settings">
        <fieldset className="fieldset brand-settings__controls" disabled={!canEdit}>
          <div className="field">
            <span className="field__label" id="brand-palette-label">{tb.colours}</span>
            <div className="cluster cluster--tight" role="group" aria-labelledby="brand-palette-label">
              {PUBLIC_PALETTES.map((p) => (
                <button
                  key={p}
                  type="button"
                  className={`swatch-box swatch--${p}`}
                  aria-pressed={palette === p}
                  aria-label={tb.palettes[p]}
                  title={tb.palettes[p]}
                  onClick={() => {
                    setPalette(p);
                    setSuccess('');
                  }}
                />
              ))}
            </div>
            <small className="field__hint">{tb.palettes[palette]}</small>
          </div>

          <div className="field">
            <label className="field__label" htmlFor="brand-font">{tb.font}</label>
            <div className="select-wrap">
              <select
                className="select"
                id="brand-font"
                value={font}
                onChange={(e) => {
                  setFont(parsePublicFont(e.target.value));
                  setSuccess('');
                }}
              >
                {PUBLIC_FONTS.map((f) => (
                  <option key={f} value={f}>{tb.fonts[f]}</option>
                ))}
              </select>
            </div>
            <small className="field__hint">{tb.fontHint}</small>
          </div>
        </fieldset>

        <div className="brand-settings__preview">
          <span className="field__label">{tb.preview}</span>
          <iframe
            // Remounted when the shop photo changes, so the preview shows it.
            key={shop.photoUrl ?? 'no-photo'}
            className="preview-frame"
            title={tb.preview}
            src={`/${shop.slug}?palette=${palette}&font=${font}`}
          />
          <small className="field__hint">{dirty ? tb.previewUnsaved : tb.previewSaved}</small>
        </div>
      </div>
      {dirty && canEdit && <SaveBar label={tb.save} saving={saving} onSave={handleSave} />}
    </div>
  );
}
