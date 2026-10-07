import { formatDuration } from './wizardUtils';
import { fillIfEmpty, isExactPhoneMatch, shouldLookUpCustomer } from './customerAutofill';
import { useRef, useState } from 'react';
import { getCustomers, type Customer } from '../../api/customer.api';
import type { BookingRuleCode } from '../../api/booking.api';
import type { PublicProduct, Service, ShopMember } from '../../api/public.api';
import ReservedProducts from '../ReservedProducts';
import { exceedsStock, toProductLines, toReservedProducts } from '../../utils/productLines';
import { useLang } from '../../context/LanguageContext';
import { useShop } from '../../context/ShopContext';
import Alert from '../Alert';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLock, faUser } from '@fortawesome/free-solid-svg-icons';

export interface OwnerCustomerFormValues {
  name: string;
  phone: string;
  email?: string;
  notes?: string;
  /** Block the slot instead of booking a customer; name, phone and email are then unused. */
  block?: boolean;
  /** Products reserved with the booking. */
  products?: { productId: string; quantity: number }[];
  /** The user accepted reserving more of a product than is left. */
  acceptStockOverride?: boolean;
}

export default function OwnerCustomerFormStep({
  shopId,
  initialCustomer,
  selectedService,
  selectedMember,
  date,
  time,
  outsideRules = [],
  products = [],
  reserved = {},
  canOverStock = false,
  onSubmit,
  onBack,
  submitting,
  cooling = false,
  error,
  notice,
}: {
  shopId: string;
  /** The customer picked on the first step, if any: the form starts filled in with them. */
  initialCustomer?: Customer | null;
  selectedService: Service | null;
  selectedMember: ShopMember | null;
  date: string;
  time: string;
  /** Rules the chosen time is known to break; non-empty shows the confirmation panel. */
  outsideRules?: BookingRuleCode[];
  /** The shop's products on offer. */
  products?: PublicProduct[];
  /** What was chosen on the products step: quantity per product id. Dropped when the slot is blocked instead. */
  reserved?: Record<string, number>;
  /** Owner and managers may reserve more than what is left (after the warning). */
  canOverStock?: boolean;
  onSubmit: (values: OwnerCustomerFormValues) => void;
  onBack: () => void;
  submitting: boolean;
  /** Disabled (not spinning) while the server's Retry-After window runs. */
  cooling?: boolean;
  error: string | null;
  /** A non-error notice (e.g. the server is momentarily busy) — never rendered in the error style. */
  notice?: string | null;
}) {
  const { t } = useLang();
  const { shop } = useShop();
  // Until the shop has loaded, behave as before; the API enforces the rule anyway.
  const canViewCustomerDetails = shop?.canViewCustomerDetails !== false;

  // A time that is only off the shop's slot grid is a "custom time", not an
  // out-of-hours one, so the panel and button say that instead.
  const onlyOffGrid = outsideRules.length > 0 && outsideRules.every((c) => c === 'OFF_SLOT_GRID');

  const [phone, setPhone] = useState(initialCustomer?.phone ?? '');
  const [name, setName] = useState(initialCustomer?.name ?? '');
  const [email, setEmail] = useState(initialCustomer?.email ?? '');
  const [notes, setNotes] = useState('');
  // "Block this slot": the time is held with no customer, only a note.
  const [blocking, setBlocking] = useState(false);
  const overStock = !blocking && canOverStock && exceedsStock(products, reserved);

  function handleToggleBlock(next: boolean) {
    setBlocking(next);
    // The note starts as "Blocked slot" and is dropped again if left untouched.
    setNotes((n) => (next ? n || t.bookings.block.noteDefault : n === t.bookings.block.noteDefault ? '' : n));
  }

  const [customerResults, setCustomerResults] = useState<Customer[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  // True only once a look-up for the phone now shown has completed and found
  // nobody — not while typing, in flight, failed, or after an exact match.
  const [searchedNoMatch, setSearchedNoMatch] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The latest phone text, so a slow look-up that returns after the user kept
  // typing is discarded instead of filling in for a number no longer shown.
  const phoneRef = useRef(initialCustomer?.phone ?? '');

  function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    phoneRef.current = val;
    setPhone(val);
    // Deliberately NOT touching name/email: text the user typed is never
    // cleared just because the phone changed.
    setShowDropdown(false);
    setCustomerResults([]);
    setSearchedNoMatch(false);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!shouldLookUpCustomer(canViewCustomerDetails, val)) return;

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
          setSearchedNoMatch(result.items.length === 0);
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
    if (submitting) return;
    if (blocking) onSubmit({ block: true, name: '', phone: '', notes: notes || undefined });
    else {
      const lines = toProductLines(reserved);
      onSubmit({
        name,
        phone,
        email: email || undefined,
        notes: notes || undefined,
        ...(lines.length > 0 && { products: lines }),
        ...(overStock && { acceptStockOverride: true }),
      });
    }
  }

  return (
    <div className="public-wizard-panel">
      {selectedService && (
        <p className="t-body-sm t-muted">
          {t.public.serviceContext} <strong>{selectedService.name}</strong> ({formatDuration(selectedService.duration)})
          {selectedMember && (
            <> · {t.public.staffContext} <strong>{selectedMember.name}</strong></>
          )}
          {' · '}<strong>{date}</strong> {t.public.atLabel} <strong>{time}</strong>
        </p>
      )}

      <div className="public-booking-form">
        <div className="cluster">
          <button
            type="button"
            className="btn btn--secondary btn--sm"
            onClick={() => handleToggleBlock(!blocking)}
            disabled={submitting}
          >
            <FontAwesomeIcon icon={blocking ? faUser : faLock} aria-hidden="true" />
            {blocking ? t.bookings.block.bookCustomer : t.bookings.block.button}
          </button>
        </div>

        {blocking && (
          <div className="field">
            <label className="field__label" htmlFor="b-blocked">{t.public.nameLabel}</label>
            <input id="b-blocked" className="input" type="text" value={t.bookings.block.name} disabled readOnly />
            <p className="field__hint">{t.bookings.block.hint}</p>
          </div>
        )}

        {/* Phone first — with customer search dropdown */}
        {!blocking && (<>
        <div className="field field--anchor">
          <label className="field__label" htmlFor="b-phone">
            {t.public.phoneLabel} <span className="field__required">*</span>
          </label>
          <input
            id="b-phone"
            className="input"
            type="tel"
            placeholder={t.bookings.phoneSearchHint}
            value={phone}
            onChange={handlePhoneChange}
            autoComplete="off"
          />
          {showDropdown && (
            <ul className="suggest">
              {customerResults.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    className="suggest__item"
                    onClick={() => selectCustomer(c)}
                  >
                    <strong>{c.name}</strong>
                    <span className="suggest__meta">{c.phone}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {searchedNoMatch && (
            <p className="field__hint">{t.bookings.newCustomerHint}</p>
          )}
        </div>

        <div className="field">
          <label className="field__label" htmlFor="b-name">
            {t.public.nameLabel} <span className="field__required">*</span>
          </label>
          <input
            id="b-name"
            className="input"
            type="text"
            placeholder={t.public.namePlaceholder}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="field">
          <label className="field__label" htmlFor="b-email">
            {t.public.emailLabel} <span className="field__optional">{t.public.emailOptional}</span>
          </label>
          <input
            id="b-email"
            className="input"
            type="email"
            placeholder={t.public.emailPlaceholder}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="off"
          />
        </div>
        </>)}

        <div className="field">
          <label className="field__label" htmlFor="b-notes">
            {t.public.notesLabel} <span className="field__optional">{t.public.notesOptional}</span>
          </label>
          <textarea
            id="b-notes"
            className="textarea"
            placeholder={t.public.notesPlaceholder}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
        </div>

        {!blocking && (
          <ReservedProducts
            title={t.products.pickerTitle}
            products={toReservedProducts(products, reserved)}
            servicePrice={selectedService?.price}
          />
        )}
        {overStock && <Alert variant="warning">{t.products.overStock}</Alert>}

        {outsideRules.length > 0 && (
          <Alert
            variant="warning"
            title={onlyOffGrid ? t.bookings.intervalPicker.panelTitle : t.bookings.outsideHours.panelTitle}
          >
            <p>{outsideRules.map((c) => t.bookings.override[c]).join(' ')}</p>
            <p>{t.bookings.outsideHours.panelBody}</p>
          </Alert>
        )}

        {notice && <Alert variant="info">{notice}</Alert>}
        {error && <Alert variant="danger">{error}</Alert>}
      </div>

      <div className="cluster public-wizard-actions">
        <button className="btn btn--ghost" onClick={onBack} disabled={submitting}>
          {t.public.back}
        </button>
        <button
          className={`btn${submitting && !cooling ? ' is-loading' : ''}`}
          onClick={handleSubmit}
          aria-busy={submitting && !cooling}
          disabled={cooling || (!blocking && (name.trim() === '' || phone.trim() === ''))}
        >
          {blocking
            ? t.bookings.block.confirm
            : outsideRules.length > 0
            ? onlyOffGrid
              ? t.bookings.intervalPicker.confirmButton
              : t.bookings.outsideHours.confirmButton
            : overStock
            ? t.products.overStockConfirm
            : t.bookings.createBooking}
        </button>
      </div>
    </div>
  );
}
