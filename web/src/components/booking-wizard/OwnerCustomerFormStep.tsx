import { fillIfEmpty, isExactPhoneMatch } from './customerAutofill';
import { useRef, useState } from 'react';
import { getCustomers, type Customer } from '../../api/customer.api';
import type { BookingRuleCode } from '../../api/booking.api';
import type { Service, ShopMember } from '../../api/public.api';
import { useLang } from '../../context/LanguageContext';

export interface OwnerCustomerFormValues {
  name: string;
  phone: string;
  email?: string;
  notes?: string;
}

export default function OwnerCustomerFormStep({
  shopId,
  selectedService,
  selectedMember,
  date,
  time,
  outsideRules = [],
  onSubmit,
  onBack,
  submitting,
  error,
  notice,
}: {
  shopId: string;
  selectedService: Service | null;
  selectedMember: ShopMember | null;
  date: string;
  time: string;
  /** Rules the chosen time is known to break; non-empty shows the confirmation panel. */
  outsideRules?: BookingRuleCode[];
  onSubmit: (values: OwnerCustomerFormValues) => void;
  onBack: () => void;
  submitting: boolean;
  error: string | null;
  /** A non-error notice (e.g. the server is momentarily busy) — never rendered in the error style. */
  notice?: string | null;
}) {
  const { t } = useLang();

  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');

  const [customerResults, setCustomerResults] = useState<Customer[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The latest phone text, so a slow look-up that returns after the user kept
  // typing is discarded instead of filling in for a number no longer shown.
  const phoneRef = useRef('');

  function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    phoneRef.current = val;
    setPhone(val);
    // Deliberately NOT touching name/email: text the user typed is never
    // cleared just because the phone changed.
    setShowDropdown(false);
    setCustomerResults([]);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.trim().length < 2) return;

    debounceRef.current = setTimeout(() => {
      getCustomers(shopId, val.trim())
        .then((result) => {
          if (phoneRef.current !== val) return; // stale
          const exact = result.items.find((c) => isExactPhoneMatch(val, c.phone));
          if (exact) {
            // A known customer: fill in what is still empty, nothing else.
            setName((n) => fillIfEmpty(n, exact.name));
            setEmail((m) => fillIfEmpty(m, exact.email));
            return;
          }
          setCustomerResults(result.items);
          setShowDropdown(result.items.length > 0);
        })
        .catch(() => {});
    }, 300);
  }

  function selectCustomer(c: Customer) {
    phoneRef.current = c.phone;
    setPhone(c.phone);
    setName((n) => fillIfEmpty(n, c.name));
    setEmail((m) => fillIfEmpty(m, c.email));
    setShowDropdown(false);
    setCustomerResults([]);
  }

  function handleSubmit() {
    onSubmit({ name, phone, email: email || undefined, notes: notes || undefined });
  }

  return (
    <div className="public-wizard-panel">
      {selectedService && (
        <p className="public-wizard-context">
          {t.public.serviceContext} <strong>{selectedService.name}</strong>
          {selectedMember && (
            <> · {t.public.staffContext} <strong>{selectedMember.name}</strong></>
          )}
          {' · '}<strong>{date}</strong> {t.public.atLabel} <strong>{time}</strong>
        </p>
      )}

      <div className="public-booking-form">
        {/* Phone first — with customer search dropdown */}
        <div className="public-field-group" style={{ position: 'relative' }}>
          <label className="public-field-label" htmlFor="b-phone">
            {t.public.phoneLabel} <span className="public-field-required">*</span>
          </label>
          <input
            id="b-phone"
            className="public-field-input"
            type="tel"
            placeholder={t.bookings.phoneSearchHint}
            value={phone}
            onChange={handlePhoneChange}
            autoComplete="off"
          />
          {showDropdown && (
            <ul className="customer-search-dropdown">
              {customerResults.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    className="customer-search-item"
                    onClick={() => selectCustomer(c)}
                  >
                    <strong>{c.name}</strong>
                    <span className="customer-search-phone">{c.phone}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {phone.trim().length >= 2 && customerResults.length === 0 && (
            <p className="public-field-hint">{t.bookings.newCustomerHint}</p>
          )}
        </div>

        <div className="public-field-group">
          <label className="public-field-label" htmlFor="b-name">
            {t.public.nameLabel} <span className="public-field-required">*</span>
          </label>
          <input
            id="b-name"
            className="public-field-input"
            type="text"
            placeholder={t.public.namePlaceholder}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="public-field-group">
          <label className="public-field-label" htmlFor="b-email">
            {t.public.emailLabel} <span className="public-field-optional">{t.public.emailOptional}</span>
          </label>
          <input
            id="b-email"
            className="public-field-input"
            type="email"
            placeholder={t.public.emailPlaceholder}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="off"
          />
        </div>

        <div className="public-field-group">
          <label className="public-field-label" htmlFor="b-notes">
            {t.public.notesLabel} <span className="public-field-optional">{t.public.notesOptional}</span>
          </label>
          <textarea
            id="b-notes"
            className="public-field-input public-field-textarea"
            placeholder={t.public.notesPlaceholder}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </div>

        {outsideRules.length > 0 && (
          <div className="ooh-panel" role="note">
            <p className="ooh-panel-title">
              <span aria-hidden="true">☾ </span>
              {t.bookings.outsideHours.panelTitle}
            </p>
            <p>{outsideRules.map((c) => t.bookings.override[c]).join(' ')}</p>
            <p>{t.bookings.outsideHours.panelBody}</p>
          </div>
        )}

        {notice && <p className="public-submit-notice" role="status">{notice}</p>}
        {error && <p className="public-submit-error">{error}</p>}
      </div>

      <div className="public-wizard-actions">
        <button className="btn btn-ghost wizard-btn" onClick={onBack} disabled={submitting}>
          {t.public.back}
        </button>
        <button
          className="btn btn-primary wizard-btn"
          onClick={handleSubmit}
          disabled={submitting || name.trim() === '' || phone.trim() === ''}
        >
          {submitting
            ? t.bookings.creating
            : outsideRules.length > 0
              ? t.bookings.outsideHours.confirmButton
              : t.bookings.createBooking}
        </button>
      </div>
    </div>
  );
}
