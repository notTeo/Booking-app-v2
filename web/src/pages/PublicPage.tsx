import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPhone, faLocationDot } from '@fortawesome/free-solid-svg-icons';
import { createBooking } from '../api/public.api';
import { useLang } from '../context/LanguageContext';
import { usePageMeta } from '../hooks/usePageMeta';
import { SITE_NAME } from '../config/seo';
import { useBookingWizard } from '../hooks/useBookingWizard';
import WizardProgress from '../components/booking-wizard/WizardProgress';
import ServiceSelectStep from '../components/booking-wizard/ServiceSelectStep';
import StaffSelectStep from '../components/booking-wizard/StaffSelectStep';
import DateTimeStep from '../components/booking-wizard/DateTimeStep';
import PublicIdentityStep, { type PublicIdentity } from '../components/booking-wizard/PublicIdentityStep';
import { buildISODateTime, formatDuration, servicesSummary } from '../components/booking-wizard/wizardUtils';
import { shiftDate, todayInZone } from '../utils/shopTime';
import { getApiError, isBookingRuleViolation, PRODUCT_OUT_OF_STOCK } from '../api/booking.api';
import { isPlausibleSlug } from '../utils/publicLink';
import { clearSavedCustomer, readSavedCustomer, saveCustomer } from '../utils/savedCustomer';
import Alert from '../components/Alert';
import PublicPalette from '../components/PublicPalette';
import LangSwitch from '../components/LangSwitch';
import ReservedProducts from '../components/ReservedProducts';
import SuccessCheck from '../components/SuccessCheck';
import ProductsStep from '../components/booking-wizard/ProductsStep';
import { toProductLines, toReservedProducts } from '../utils/productLines';
import {
  clearConfirmedBooking,
  readConfirmedBooking,
  saveConfirmedBooking,
  type ConfirmedBooking,
} from '../utils/confirmedBooking';
import { parsePublicFont, parsePublicPalette } from '../utils/branding';
import { mediaUrl } from '../utils/media';
import NotFoundPage from './NotFoundPage';
import '../styles/pages/public.css';

// Mounted at /:slug, so it also receives every mistyped top-level URL. Anything
// that can't be a slug, or that the API says doesn't exist, gets the real 404
// page instead of an inline "shop not found".
export default function PublicPage() {
  const { slug } = useParams<{ slug: string }>();
  if (!slug || !isPlausibleSlug(slug)) return <NotFoundPage />;
  return <PublicBookingPage slug={slug} />;
}

function PublicBookingPage({ slug }: { slug: string }) {
  const { t, language } = useLang();
  // The shop settings preview shows a look before it is saved: ?palette=&font=
  const [look] = useSearchParams();

  // ── Customer form state (step 4 — plain form, no autocomplete) ──
  // Prefilled only for a customer who earlier ticked "remember my details" in this browser.
  const [saved] = useState(readSavedCustomer);
  const [name, setName] = useState(saved?.name ?? '');
  const [phone, setPhone] = useState(saved?.phone ?? '');
  const [email, setEmail] = useState(saved?.email ?? '');
  const [notes, setNotes] = useState('');
  const [remember, setRemember] = useState(saved !== null);
  // Saved details are only used to find the customer's own times once they confirm them.
  const [identity, setIdentity] = useState<PublicIdentity>(saved ? 'ask' : 'anonymous');

  const wizard = useBookingWizard({ slug, slotCustomer: identity === 'known' ? { phone } : null });

  usePageMeta(
    wizard.shop
      ? {
          title: `${wizard.shop.name} | ${SITE_NAME}`,
          description:
            wizard.shop.description?.trim() ||
            (language === 'el'
              ? `Κλείσε ραντεβού online στο ${wizard.shop.name}.`
              : `Book an appointment online at ${wizard.shop.name}.`),
          index: true,
          path: `/${slug}`,
        }
      : null,
  );

  // ── Submission state ──
  const [submitting, setSubmitting] = useState(false);
  // After a 503 BOOKING_BUSY the button stays disabled (not spinning) for the Retry-After window.
  const [cooling, setCooling] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // The server is momentarily out of retry budget (503 BOOKING_BUSY) — never
  // shown as an error; kept separate from submitError so it can't render in
  // the red error style.
  const [busyNotice, setBusyNotice] = useState<string | null>(null);
  // The booking that was just made. Kept for this tab, so a reload still shows it.
  const [confirmation, setConfirmation] = useState<ConfirmedBooking | null>(() =>
    // Never in the shop settings preview, which shares the tab's storage.
    look.has('palette') || look.has('font') ? null : readConfirmedBooking(slug),
  );
  const confirmed = confirmation !== null;
  // Products reserved with the booking: quantity per product id.
  const [reserved, setReserved] = useState<Record<string, number>>({});

  if (wizard.loading) {
    return <div className="spinner-page"><div className="spinner spinner--lg" /></div>;
  }
  if (wizard.notFound) return <NotFoundPage />;
  if (wizard.error || !wizard.shop) {
    return (
      <div className="page page--center">
        <div className="empty">
          <p className="empty__title">{wizard.error ?? t.public.somethingWrong}</p>
        </div>
      </div>
    );
  }

  const shop = wizard.shop;
  const selectedMember = shop.members.find((m) => m.id === wizard.selectedMemberId) ?? null;

  async function handleSubmit() {
    if (!slug || !wizard.selectedServiceId || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    setBusyNotice(null);
    try {
      const booked = await createBooking(slug, {
        name,
        phone,
        email: email || undefined,
        serviceId: wizard.selectedServiceId,
        ...(wizard.selectedServiceIds.length > 1 && { serviceIds: wizard.selectedServiceIds }),
        staffId: wizard.selectedMemberId ?? '',
        startTime: buildISODateTime(wizard.date, wizard.time, wizard.shop!.timezone),
        notes: notes || undefined,
        products: toProductLines(reserved),
      });
      const made: ConfirmedBooking = {
        name,
        serviceNames: (booked.services ?? []).map((x) => x.name).join(' + ') || (wizard.selectedService?.name ?? ''),
        date: wizard.date,
        time: wizard.time,
        phone,
        email,
        products: booked.products ?? [],
        servicePrice: booked.servicePrice,
      };
      if (remember) saveCustomer({ name: name.trim(), phone: phone.trim(), email: email.trim() });
      else clearSavedCustomer();
      saveConfirmedBooking(slug, made);
      setConfirmation(made);
      setSubmitting(false);
    } catch (err: unknown) {
      const info = getApiError(err);
      if (info.status === 503 && info.code === 'BOOKING_BUSY') {
        // Not a rejection — the system is momentarily out of retry budget.
        // Keep the button disabled for the server's Retry-After window so the
        // customer doesn't immediately retry into the same contention.
        setBusyNotice(t.public.bookingBusy);
        setCooling(true);
        setTimeout(() => {
          setCooling(false);
          setSubmitting(false);
        }, (info.retryAfterSeconds ?? 1) * 1000);
        return;
      }
      const msg = isBookingRuleViolation(info)
        ? t.public.ruleErrors[info.code]
        : info.code === 'BOOKING_TOO_LONG'
          ? t.public.ruleErrors.BOOKING_TOO_LONG
          : info.code === 'SLOT_TAKEN'
            ? t.public.ruleErrors.SLOT_TAKEN
            : info.code === PRODUCT_OUT_OF_STOCK
              ? t.products.outOfStockError
              : (info.message ?? t.public.somethingWrong);
      setSubmitError(msg);
      setSubmitting(false);
    }
  }

  // Unticking is the customer's "forget me": the stored copy goes at once, the typed values stay.
  function handleRememberChange(checked: boolean) {
    setRemember(checked);
    if (!checked) clearSavedCustomer();
  }

  // "Someone else" / "Not you?": book as a new person with the standard times.
  // The stored copy is left alone; it goes when a booking completes without
  // "remember" ticked, as before.
  function handleDeclineIdentity() {
    setIdentity('anonymous');
    setName('');
    setPhone('');
    setEmail('');
    setRemember(false);
  }

  function handleUsePhone(value: string) {
    setPhone(value);
    setIdentity('known');
  }

  // Forget the confirmation and start over with an empty wizard.
  function handleBookAnother() {
    clearConfirmedBooking(slug);
    window.location.reload();
  }

  function handleBackFromForm() {
    setSubmitError(null);
    setBusyNotice(null);
    wizard.goBack();
  }

  const step = wizard.step;
  const onProducts = step === wizard.productsStep;
  const onDetails = step === wizard.detailsStep;
  const stepHeading =
    step === 1
      ? t.public.chooseService
      : onProducts
        ? t.products.pickerTitle
        : onDetails
          ? t.public.yourDetails
          : [t.public.staff, t.public.dateTime][step - 2];
  const picked = wizard.selectedServices;
  const showFooter = !confirmed && shop.acceptingBookings;

  return (
    <div className="public-page">
      <PublicPalette
        palette={parsePublicPalette(look.get('palette') ?? shop.publicPalette)}
        font={parsePublicFont(look.get('font') ?? shop.publicFont)}
      />
      <div className="booking-card">
        <header className="booking-card__head">
          {shop.photoUrl && (
            <div className="cover"><img src={mediaUrl(shop.photoUrl)} alt="" /></div>
          )}
          <h1 className="booking-card__title">{shop.name}</h1>
          {(shop.formattedAddress || shop.phone) && (
            <div className="booking-card__links">
              {shop.formattedAddress && (
                <a
                  className="booking-card__link"
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(shop.formattedAddress)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={t.public.openMap}
                >
                  <FontAwesomeIcon icon={faLocationDot} aria-hidden="true" />
                  {shop.formattedAddress}
                </a>
              )}
              {shop.phone && (
                <a className="booking-card__link" href={`tel:${shop.phone.replace(/\s+/g, '')}`} title={t.public.callShop.replace('{phone}', shop.phone)}>
                  <FontAwesomeIcon icon={faPhone} aria-hidden="true" />
                  {shop.phone}
                </a>
              )}
            </div>
          )}
        </header>

        <main className="booking-card__body">
          {confirmation ? (
            <div className="card card--center">
              <SuccessCheck />
              <h2 className="card__title">{t.public.bookingConfirmed}</h2>
              <p className="card__text">
                {t.public.bookingConfirmedMsg
                  .replace('{name}', confirmation.name)
                  .replace('{service}', confirmation.serviceNames)
                  .replace('{date}', confirmation.date)
                  .replace('{time}', confirmation.time)}
              </p>
              {(confirmation.phone || confirmation.email) && (
                <p className="card__text">
                  {confirmation.phone && <strong>{confirmation.phone}</strong>}
                  {confirmation.phone && confirmation.email && ' / '}
                  {confirmation.email && <strong>{confirmation.email}</strong>}
                </p>
              )}
              <ReservedProducts products={confirmation.products} servicePrice={confirmation.servicePrice} />
              <button type="button" className="btn btn--secondary" onClick={handleBookAnother}>
                {t.public.bookAnother}
              </button>
            </div>
          ) : !shop.acceptingBookings ? (
            <Alert variant="info" title={t.public.notAcceptingTitle}>
              {shop.phone ? t.public.notAcceptingCall.replace('{phone}', shop.phone) : t.public.notAccepting}
            </Alert>
          ) : (
            <>
              <WizardProgress step={step} total={wizard.detailsStep} />
              <h2 className="booking-card__heading">{stepHeading}</h2>
              {step === 1 && picked.length === 0 && shop.services.length > 1 && (
                <p className="booking-card__hint">{t.public.chooseServiceHint}</p>
              )}

              {/* Saved details found: the customer says who is booking before anything else. */}
              {step === 1 && identity !== 'known' && (
                <PublicIdentityStep
                  identity={identity}
                  name={name}
                  phone={phone}
                  onConfirm={() => setIdentity('known')}
                  onDecline={handleDeclineIdentity}
                  onUsePhone={handleUsePhone}
                />
              )}

              {step === 1 && identity !== 'ask' && (
                <ServiceSelectStep
                  services={shop.services}
                  selectedIds={wizard.selectedServiceIds}
                  onToggle={wizard.toggleService}
                />
              )}

              {step === 2 && (
                <StaffSelectStep
                  members={wizard.eligibleMembers}
                  selectedService={wizard.selectedService}
                  onSelect={wizard.handleSelectMember}
                  onBack={wizard.goBack}
                  hideBack
                />
              )}

              {step === 3 && (
                <DateTimeStep
                  date={wizard.date}
                  time={wizard.time}
                  slots={wizard.slots}
                  slotsError={wizard.slotsError}
                  onRetrySlots={wizard.retrySlots}
                  selectedService={wizard.selectedService}
                  selectedMember={selectedMember}
                  minDate={todayInZone(shop.timezone)}
                  maxDate={shiftDate(todayInZone(shop.timezone), shop.maxAdvanceDays)}
                  mode="public"
                  onDateChange={wizard.handleDateChange}
                  onSelectTime={wizard.setTime}
                  onBack={wizard.goBack}
                  onContinue={() => wizard.setStep(4)}
                  hideActions
                />
              )}

              {onProducts && (
                <ProductsStep
                  products={shop.products}
                  value={reserved}
                  onChange={setReserved}
                  servicePrice={wizard.selectedService?.price}
                  onBack={wizard.goBack}
                  onContinue={() => wizard.setStep(wizard.detailsStep)}
                  hideActions
                />
              )}

              {onDetails && (
                <div className="public-wizard-panel">
                  {wizard.selectedService && (
                    <p className="t-body-sm t-muted">
                      {t.public.serviceContext} <strong>{wizard.selectedService.name}</strong> ({formatDuration(wizard.selectedService.duration)})
                      {selectedMember && (
                        <> · {t.public.staffContext} <strong>{selectedMember.name}</strong></>
                      )}
                      {' · '}<strong>{wizard.date}</strong> {t.public.atLabel} <strong>{wizard.time}</strong>
                    </p>
                  )}

                  <div className="public-booking-form">
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
                      autoComplete="name"
                    />
                  </div>

                  <div className="field">
                    <label className="field__label" htmlFor="b-phone">
                      {t.public.phoneLabel} <span className="field__required">*</span>
                    </label>
                    <input
                      id="b-phone"
                      className="input"
                      type="tel"
                      placeholder={t.public.phonePlaceholder}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      autoComplete="tel"
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
                      autoComplete="email"
                    />
                    <p className="field__hint">{t.public.emailHint}</p>
                  </div>

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

                  <ReservedProducts
                    title={t.products.pickerTitle}
                    products={toReservedProducts(shop.products, reserved)}
                    servicePrice={wizard.selectedService?.price}
                  />

                  <div className="field">
                    <label className="checkbox">
                      <input
                        id="b-remember"
                        className="checkbox__input"
                        type="checkbox"
                        checked={remember}
                        onChange={(e) => handleRememberChange(e.target.checked)}
                        aria-describedby="b-remember-hint"
                      />
                      <span className="checkbox__box" />
                      {t.public.rememberLabel}
                    </label>
                    <p id="b-remember-hint" className="field__hint">{t.public.rememberHint}</p>
                  </div>

                  <p className="field__hint">
                    {t.public.privacyNoticeBefore}{' '}
                    <Link to="/privacy" target="_blank" rel="noopener">{t.public.privacyNoticeLink}</Link>
                    {t.public.privacyNoticeAfter}
                  </p>

                  {busyNotice && <Alert variant="info">{busyNotice}</Alert>}
                  {submitError && <Alert variant="danger">{submitError}</Alert>}
                  </div>
                </div>
              )}
            </>
          )}
          {/* Not in the settings preview: it would change the owner's own language. */}
          {!look.has('palette') && !look.has('font') && (
            <div className="booking-card__lang"><LangSwitch /></div>
          )}
        </main>

        {showFooter && (
          <footer className="booking-card__foot">
            {identity === 'known' && step === 1 && (
              <p className="booking-card__who">
                {t.public.bookingAs.replace('{name}', '')}
                <strong>{name || phone}</strong>
                {' · '}
                <button type="button" className="booking-card__change" onClick={handleDeclineIdentity}>{t.public.change}</button>
              </p>
            )}
            {step === 1 && picked.length > 1 && (
              <p className="booking-card__who">{servicesSummary(t.public, picked, (x) => x.duration)}</p>
            )}
            <div className="booking-card__actions">
              {step > 1 && (
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={onDetails ? handleBackFromForm : wizard.goBack}
                  disabled={submitting}
                >
                  {t.public.back}
                </button>
              )}
              {step === 1 && (
                <button
                  type="button"
                  className="btn btn--block"
                  disabled={picked.length === 0}
                  onClick={wizard.continueFromServices}
                >
                  {picked.length === 0 ? t.public.chooseServiceToContinue : t.public.continue}
                </button>
              )}
              {step === 3 && (
                <button
                  type="button"
                  className="btn btn--block"
                  disabled={wizard.date === '' || wizard.time === ''}
                  onClick={() => wizard.setStep(4)}
                >
                  {t.public.continue}
                </button>
              )}
              {onProducts && (
                <button type="button" className="btn btn--block" onClick={() => wizard.setStep(wizard.detailsStep)}>
                  {t.public.continue}
                </button>
              )}
              {onDetails && (
                <button
                  type="button"
                  className={`btn btn--block${submitting && !cooling ? ' is-loading' : ''}`}
                  onClick={handleSubmit}
                  aria-busy={submitting && !cooling}
                  disabled={cooling || name.trim() === '' || phone.trim() === ''}
                >
                  {t.public.confirmBooking}
                </button>
              )}
            </div>
          </footer>
        )}
      </div>
    </div>
  );
}
