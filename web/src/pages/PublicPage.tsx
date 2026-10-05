import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPhone, faLocationDot, faClock, faCircleCheck } from '@fortawesome/free-solid-svg-icons';
import { createBooking } from '../api/public.api';
import { useLang } from '../context/LanguageContext';
import { usePageMeta } from '../hooks/usePageMeta';
import { SITE_NAME } from '../config/seo';
import { useBookingWizard } from '../hooks/useBookingWizard';
import WizardStepsIndicator from '../components/booking-wizard/WizardStepsIndicator';
import ServiceSelectStep from '../components/booking-wizard/ServiceSelectStep';
import StaffSelectStep from '../components/booking-wizard/StaffSelectStep';
import DateTimeStep from '../components/booking-wizard/DateTimeStep';
import PublicIdentityStep, { type PublicIdentity } from '../components/booking-wizard/PublicIdentityStep';
import { buildISODateTime } from '../components/booking-wizard/wizardUtils';
import { shiftDate, todayInZone } from '../utils/shopTime';
import { getApiError, isBookingRuleViolation } from '../api/booking.api';
import { isPlausibleSlug } from '../utils/publicLink';
import { clearSavedCustomer, readSavedCustomer, saveCustomer } from '../utils/savedCustomer';
import Alert from '../components/Alert';
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
  const [confirmed, setConfirmed] = useState(false);

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
      await createBooking(slug, {
        name,
        phone,
        email: email || undefined,
        serviceId: wizard.selectedServiceId,
        staffId: wizard.selectedMemberId ?? '',
        startTime: buildISODateTime(wizard.date, wizard.time, wizard.shop!.timezone),
        notes: notes || undefined,
      });
      if (remember) saveCustomer({ name: name.trim(), phone: phone.trim(), email: email.trim() });
      else clearSavedCustomer();
      setConfirmed(true);
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

  function handleBackFromForm() {
    setSubmitError(null);
    setBusyNotice(null);
    wizard.setStep(3);
  }

  return (
    <div className="public-page">
      <header className="page-hero">
        <div className="page-hero__inner">
          <h1 className="t-title">{shop.name}</h1>
          {shop.description && <p className="t-body t-muted">{shop.description}</p>}
          <div className="cluster cluster--tight">
            {shop.phone && <span className="badge badge--neutral"><FontAwesomeIcon icon={faPhone} aria-hidden="true" /> {shop.phone}</span>}
            {shop.formattedAddress && <span className="badge badge--neutral"><FontAwesomeIcon icon={faLocationDot} aria-hidden="true" /> {shop.formattedAddress}</span>}
            <span className="badge badge--neutral"><FontAwesomeIcon icon={faClock} aria-hidden="true" /> {shop.timezone}</span>
          </div>
        </div>
      </header>

      <main className="public-main">
        {confirmed ? (
          <section className="public-section">
            <div className="card card--center">
              <div className="avatar avatar--xl" aria-hidden="true">
                <FontAwesomeIcon icon={faCircleCheck} />
              </div>
              <h2 className="card__title">{t.public.bookingConfirmed}</h2>
              <p className="card__text">
                {t.public.bookingConfirmedMsg
                  .replace('{name}', name)
                  .replace('{service}', wizard.selectedService?.name ?? '')
                  .replace('{date}', wizard.date)
                  .replace('{time}', wizard.time)}
              </p>
              {(phone || email) && (
                <p className="card__text">
                  {phone && <strong>{phone}</strong>}
                  {phone && email && ' / '}
                  {email && <strong>{email}</strong>}
                </p>
              )}
            </div>
          </section>
        ) : (
          <section className="public-section">
            <h2 className="t-heading">{t.public.bookAppointment}</h2>

            <WizardStepsIndicator currentStep={wizard.step} />

            {wizard.step === 1 && (
              <PublicIdentityStep
                identity={identity}
                name={name}
                phone={phone}
                onConfirm={() => setIdentity('known')}
                onDecline={handleDeclineIdentity}
                onUsePhone={handleUsePhone}
              />
            )}

            {/* Saved details found: the customer says who is booking before anything else. */}
            {wizard.step === 1 && identity !== 'ask' && (
              <ServiceSelectStep services={shop.services} onSelect={wizard.handleSelectService} />
            )}

            {wizard.step === 2 && (
              <StaffSelectStep
                members={wizard.eligibleMembers}
                selectedService={wizard.selectedService}
                onSelect={wizard.handleSelectMember}
                onBack={wizard.goBack}
              />
            )}

            {wizard.step === 3 && (
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
              />
            )}

            {wizard.step === 4 && (
              <div className="public-wizard-panel">
                {wizard.selectedService && (
                  <p className="t-body-sm t-muted">
                    {t.public.serviceContext} <strong>{wizard.selectedService.name}</strong>
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

                <div className="cluster public-wizard-actions">
                  <button
                    className="btn btn--ghost"
                    onClick={handleBackFromForm}
                    disabled={submitting}
                  >
                    {t.public.back}
                  </button>
                  <button
                    className={`btn${submitting && !cooling ? ' is-loading' : ''}`}
                    onClick={handleSubmit}
                    aria-busy={submitting && !cooling}
                    disabled={cooling || name.trim() === '' || phone.trim() === ''}
                  >
                    {t.public.confirmBooking}
                  </button>
                </div>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
