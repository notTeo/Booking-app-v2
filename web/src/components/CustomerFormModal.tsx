import { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { createCustomer, type Customer } from '../api/customer.api';
import { useLang } from '../context/LanguageContext';
import { apiErrorField, apiErrorMessage } from '../utils/apiError';
import { isPlausiblePhone } from '../utils/phone';
import Alert from './Alert';
import Modal from './Modal';

/** Add a customer by hand, without a booking. */
export default function CustomerFormModal({
  shopId,
  onClose,
  onCreated,
}: {
  shopId: string;
  onClose: () => void;
  onCreated: (customer: Customer) => void;
}) {
  const uid = useId();
  const { t } = useLang();
  const c = t.customerProfile;
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  // The customer this phone already belongs to, when the API says so.
  const [existingId, setExistingId] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError('');
    setExistingId('');
    try {
      onCreated(
        await createCustomer(shopId, {
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim() || null,
          notes: notes.trim() || null,
        }),
      );
    } catch (err: unknown) {
      if (apiErrorField(err, 'code') === 'CUSTOMER_EXISTS') {
        setExistingId(apiErrorField(err, 'customerId'));
        setError(c.existsError);
      } else {
        setError(apiErrorMessage(err, c.errorCreate));
      }
      setSubmitting(false);
    }
  };

  const close = () => { if (!submitting) onClose(); };

  return (
    <Modal onClose={close} labelledBy={`${uid}-title`}>
      <div className="modal__header">
        <h2 id={`${uid}-title`} className="modal__title">{c.newCustomerTitle}</h2>
        <button type="button" className="btn btn--ghost btn--icon btn--sm" onClick={close} disabled={submitting} aria-label={c.cancel}>
          <FontAwesomeIcon icon={faXmark} aria-hidden="true" />
        </button>
      </div>
      <div className="modal__body">
        {error && (
          <Alert variant="danger" actions={existingId ? <Link className="btn btn--secondary btn--sm" to={existingId}>{c.existsLink}</Link> : undefined}>
            {error}
          </Alert>
        )}
        <form id={`${uid}-form`} onSubmit={handleSubmit}>
          <div className="field">
            <label className="field__label" htmlFor={`${uid}-name`}>
              {t.customers.nameLabel} <span className="field__required">*</span>
            </label>
            <input id={`${uid}-name`} className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} required disabled={submitting} />
          </div>
          <div className="field">
            <label className="field__label" htmlFor={`${uid}-phone`}>
              {t.customers.phoneLabel} <span className="field__required">*</span>
            </label>
            <input id={`${uid}-phone`} className="input" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t.public.phonePlaceholder} required disabled={submitting} />
          </div>
          <div className="field">
            <label className="field__label" htmlFor={`${uid}-email`}>
              {t.customers.emailLabel} <span className="field__optional">{t.public.emailOptional}</span>
            </label>
            <input id={`${uid}-email`} className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={submitting} />
          </div>
          <div className="field">
            <label className="field__label" htmlFor={`${uid}-notes`}>
              {t.customers.notesLabel} <span className="field__optional">{t.public.notesOptional}</span>
            </label>
            <textarea id={`${uid}-notes`} className="textarea" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} maxLength={1000} disabled={submitting} />
          </div>
        </form>
      </div>
      <div className="modal__footer">
        <button type="button" className="btn btn--ghost" onClick={close} disabled={submitting}>{c.cancel}</button>
        <button
          type="submit"
          form={`${uid}-form`}
          className={`btn${submitting ? ' is-loading' : ''}`}
          aria-busy={submitting}
          disabled={name.trim() === '' || !isPlausiblePhone(phone)}
        >
          {c.create}
        </button>
      </div>
    </Modal>
  );
}
