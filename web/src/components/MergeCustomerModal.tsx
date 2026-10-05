import { useEffect, useId, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import { useLang } from '../context/LanguageContext';
import { getCustomers, mergeCustomer, type Customer, type MergedCustomer } from '../api/customer.api';
import { apiErrorMessage } from '../utils/apiError';
import Alert from './Alert';
import Modal from './Modal';

interface Props {
  shopId: string;
  /** The customer that is kept; the one picked here is merged into it. */
  target: Customer;
  onMerged: (customer: MergedCustomer) => void;
  onClose: () => void;
}

// Merge a duplicate into the customer being viewed: search for the other
// record, pick it, confirm. The picked record's bookings move over and the
// record itself is removed.
export default function MergeCustomerModal({ shopId, target, onMerged, onClose }: Props) {
  const uid = useId();
  const { t } = useLang();

  const [search, setSearch] = useState('');
  const [found, setFound] = useState<Customer[] | null>(null);
  // Nothing is listed until there is something to search for.
  const results = search.trim().length < 2 ? null : found;
  const [source, setSource] = useState<Customer | null>(null);
  const [merging, setMerging] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const term = search.trim();
    if (term.length < 2) return;
    let stale = false;
    const timer = setTimeout(() => {
      getCustomers(shopId, term, 1, 10)
        .then((r) => { if (!stale) setFound(r.items.filter((c) => c.id !== target.id)); })
        .catch(() => { if (!stale) setFound([]); });
    }, 250);
    return () => { stale = true; clearTimeout(timer); };
  }, [search, shopId, target.id]);

  const handleMerge = async () => {
    if (!source || merging) return;
    setMerging(true);
    setError('');
    try {
      onMerged(await mergeCustomer(shopId, target.id, source.id));
    } catch (err: unknown) {
      setError(apiErrorMessage(err, t.customers.mergeError));
      setMerging(false);
    }
  };

  return (
    <Modal onClose={() => { if (!merging) onClose(); }} labelledBy={`${uid}-title`}>
      <div className="modal__header">
        <h2 id={`${uid}-title`} className="modal__title">{t.customers.mergeTitle}</h2>
        <button
          type="button"
          className="btn btn--ghost btn--icon btn--sm"
          onClick={onClose}
          disabled={merging}
          aria-label={t.customers.cancel}
        >
          <FontAwesomeIcon icon={faXmark} aria-hidden="true" />
        </button>
      </div>
      <div className="modal__body">
        {error && <Alert variant="danger">{error}</Alert>}
        {source ? (
          <>
            <Alert variant="warning">
              {t.customers.mergeSummary
                .replace('{source}', `${source.name} (${source.phone})`)
                .replace('{target}', `${target.name} (${target.phone})`)}
            </Alert>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setSource(null)} disabled={merging}>
              {t.customers.mergeChange}
            </button>
          </>
        ) : (
          <>
            <p className="t-body-sm t-muted">{t.customers.mergeHint.replace('{target}', target.name)}</p>
            <div className="field">
              <label className="field__label" htmlFor={`${uid}-search`}>{t.customers.mergeSearchLabel}</label>
              <input
                id={`${uid}-search`}
                className="input"
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t.customers.searchPlaceholder}
                autoComplete="off"
              />
            </div>
            {results && results.length === 0 && (
              <p className="t-body-sm t-muted">{t.customers.noResults}</p>
            )}
            {results && results.length > 0 && (
              <ul className="list">
                {results.map((c) => (
                  <li key={c.id} className="list__item">
                    <span>
                      <span className="t-body-sm">{c.name}</span>{' '}
                      <span className="t-body-sm t-muted">{c.phone}</span>
                    </span>
                    <button type="button" className="btn btn--secondary btn--sm" onClick={() => setSource(c)}>
                      {t.customers.mergeSelect}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
      <div className="modal__footer">
        <button type="button" className="btn btn--ghost" onClick={onClose} disabled={merging}>
          {t.customers.cancel}
        </button>
        <button
          type="button"
          className={`btn btn--danger${merging ? ' is-loading' : ''}`}
          onClick={handleMerge}
          aria-busy={merging}
          disabled={!source}
        >
          {t.customers.mergeConfirmButton}
        </button>
      </div>
    </Modal>
  );
}
