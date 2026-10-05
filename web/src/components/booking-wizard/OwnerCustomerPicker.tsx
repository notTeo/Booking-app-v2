import { useId, useRef, useState } from 'react';
import { getCustomers, type Customer } from '../../api/customer.api';
import { useLang } from '../../context/LanguageContext';
import { shouldLookUpCustomer } from './customerAutofill';

/**
 * The shop wizard's optional first question: who is this booking for? Picking
 * an existing customer up front lets the wizard offer their own service
 * durations and the times that fit them, and fills in the last step.
 */
export default function OwnerCustomerPicker({
  shopId,
  customer,
  onPick,
  onClear,
}: {
  shopId: string;
  customer: Customer | null;
  onPick: (customer: Customer) => void;
  onClear: () => void;
}) {
  const uid = useId();
  const { t } = useLang();
  const p = t.bookings.customerPicker;

  const [term, setTerm] = useState('');
  const [results, setResults] = useState<Customer[]>([]);
  // True once a search for the text now shown found nobody.
  const [noMatch, setNoMatch] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // The latest text, so a slow reply for an earlier one is dropped.
  const termRef = useRef('');

  function handleChange(value: string) {
    termRef.current = value;
    setTerm(value);
    setResults([]);
    setNoMatch(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!shouldLookUpCustomer(true, value)) return;
    debounceRef.current = setTimeout(() => {
      getCustomers(shopId, value.trim())
        .then((result) => {
          if (termRef.current !== value) return;
          setResults(result.items);
          setNoMatch(result.items.length === 0);
        })
        .catch(() => {});
    }, 300);
  }

  if (customer) {
    return (
      <div className="cluster cluster--tight t-body-sm">
        <span>{p.selected} <strong>{customer.name}</strong> <span className="t-muted">{customer.phone}</span></span>
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={() => { handleChange(''); onClear(); }}
        >
          {p.change}
        </button>
      </div>
    );
  }

  return (
    <div className="field field--anchor">
      <label className="field__label" htmlFor={`${uid}-search`}>
        {p.label} <span className="field__optional">{t.public.emailOptional}</span>
      </label>
      <input
        id={`${uid}-search`}
        className="input"
        type="text"
        value={term}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={p.placeholder}
        autoComplete="off"
        aria-describedby={`${uid}-hint`}
      />
      {results.length > 0 && (
        <ul className="suggest">
          {results.map((c) => (
            <li key={c.id}>
              <button type="button" className="suggest__item" onClick={() => onPick(c)}>
                <strong>{c.name}</strong>
                <span className="suggest__meta">{c.phone}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <p id={`${uid}-hint`} className="field__hint">{noMatch ? p.noMatch : p.hint}</p>
    </div>
  );
}
