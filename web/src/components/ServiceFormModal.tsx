import { useId } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { useLang } from '../context/LanguageContext';
import Alert from './Alert';
import Modal from './Modal';
import Switch from './Switch';
import type { ServiceFormData } from '../utils/serviceForm';

export type { ServiceFormData };

interface Props {
  title: string;
  submitLabel: string;
  form: ServiceFormData;
  onChange: (key: keyof ServiceFormData, value: string | boolean) => void;
  onSubmit: (e: React.FormEvent) => void;
  submitting: boolean;
  error: string;
  onClose: () => void;
}

// The service form, shared by "new service" and "edit service".
export default function ServiceFormModal({ title, submitLabel, form, onChange, onSubmit, submitting, error, onClose }: Props) {
  const uid = useId();
  const { t } = useLang();

  return (
    <Modal onClose={() => { if (!submitting) onClose(); }} labelledBy={`${uid}-title`}>
      <div className="modal__header">
        <h2 id={`${uid}-title`} className="modal__title">{title}</h2>
        <button
          type="button"
          className="btn btn--ghost btn--icon btn--sm"
          onClick={onClose}
          disabled={submitting}
          aria-label={t.services.cancel}
        >
          <FontAwesomeIcon icon={faXmark} aria-hidden="true" />
        </button>
      </div>
      <div className="modal__body">
        {error && <Alert variant="danger">{error}</Alert>}
        <form id={`${uid}-form`} onSubmit={onSubmit}>
          <div className="field">
            <label className="field__label" htmlFor={`${uid}-name`}>{t.services.name}</label>
            <input
              id={`${uid}-name`}
              className="input"
              value={form.name}
              onChange={(e) => onChange('name', e.target.value)}
              required
              placeholder={t.services.name}
              disabled={submitting}
            />
          </div>
          <div className="field-row">
            <div className="field">
              <label className="field__label" htmlFor={`${uid}-duration`}>{t.services.duration} (min)</label>
              <input
                id={`${uid}-duration`}
                className="input"
                type="number"
                min="1"
                value={form.duration}
                onChange={(e) => onChange('duration', e.target.value)}
                required
                placeholder="30"
                disabled={submitting}
              />
            </div>
            <div className="field">
              <label className="field__label" htmlFor={`${uid}-price`}>{t.services.price} (€)</label>
              <input
                id={`${uid}-price`}
                className="input"
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={(e) => onChange('price', e.target.value)}
                required
                placeholder="0.00"
                disabled={submitting}
              />
            </div>
          </div>
          <div className="field">
            <label className="field__label" htmlFor={`${uid}-description`}>{t.services.description}</label>
            <textarea
              id={`${uid}-description`}
              className="textarea"
              value={form.description}
              onChange={(e) => onChange('description', e.target.value)}
              placeholder={t.services.description}
              rows={2}
              disabled={submitting}
            />
          </div>
          <div className="setting-row">
            <span className="setting-row__title">{t.services.isActive}</span>
            <Switch
              checked={form.isActive}
              onChange={(v) => onChange('isActive', v)}
              label={t.services.isActive}
              disabled={submitting}
            />
          </div>
          <div className="setting-row">
            <span className="setting-row__label">
              <span className="setting-row__title">{t.services.showOnPublicPage}</span>
              <span className="setting-row__text">{t.services.showOnPublicPageHint}</span>
            </span>
            <Switch
              checked={form.showOnPublicPage}
              onChange={(v) => onChange('showOnPublicPage', v)}
              label={t.services.showOnPublicPage}
              disabled={submitting}
            />
          </div>
        </form>
      </div>
      <div className="modal__footer">
        <button type="button" className="btn btn--ghost" onClick={onClose} disabled={submitting}>
          {t.services.cancel}
        </button>
        <button
          type="submit"
          form={`${uid}-form`}
          className={`btn${submitting ? ' is-loading' : ''}`}
          aria-busy={submitting}
        >
          {submitLabel}
        </button>
      </div>
    </Modal>
  );
}
