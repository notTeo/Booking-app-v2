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
import { buildISODateTime } from '../components/booking-wizard/wizardUtils';
import { shiftDate, todayInZone } from '../utils/shopTime';
import { getApiError, isBookingRuleViolation } from '../api/booking.api';
import { isPlausibleSlug } from '../utils/publicLink';
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
  const wizard = useBookingWizard({ slug });

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

  // ── Customer form state (step 4 — plain form, no autocomplete) ──
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');

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
    return <div className="public-loading"><div className="spinner" /></div>;
  }
  if (wizard.notFound) return <NotFoundPage />;
  if (wizard.error || !wizard.shop) {
    return <div className="public-error"><p>{wizard.error ?? t.public.somethingWrong}</p></div>;
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

  function handleBackFromForm() {
    setSubmitError(null);
    setBusyNotice(null);
    wizard.setStep(3);
  }

  return (
    <div className="public-page">
      <header className="public-header">
        <div className="public-header-inner">
          <h1 className="public-shop-name">{shop.name}</h1>
          {shop.description && <p className="public-shop-desc">{shop.description}</p>}
          <div className="public-shop-meta">
            {shop.phone && <span className="badge badge--neutral"><FontAwesomeIcon icon={faPhone} aria-hidden="true" /> {shop.phone}</span>}
            {shop.formattedAddress && <span className="badge badge--neutral"><FontAwesomeIcon icon={faLocationDot} aria-hidden="true" /> {shop.formattedAddress}</span>}
            <span className="badge badge--neutral"><FontAwesomeIcon icon={faClock} aria-hidden="true" /> {shop.timezone}</span>
          </div>
        </div>
      </header>

      <main className="public-main">
        {confirmed ? (
          <section className="public-section">
            <div className="card public-booking-confirmed">
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
            <h2 className="public-section-title">{t.public.bookAppointment}</h2>

            <WizardStepsIndicator currentStep={wizard.step} />

            {wizard.step === 1 && (
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
                  <p className="public-wizard-context">
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
                      {t.public.nameLabel} <span className="public-field-required">*</span>
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
                      {t.public.phoneLabel} <span className="public-field-required">*</span>
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

                  <p className="field__hint">
                    {t.public.privacyNoticeBefore}{' '}
                    <Link to="/privacy" target="_blank" rel="noopener">{t.public.privacyNoticeLink}</Link>
                    {t.public.privacyNoticeAfter}
                  </p>

                  {busyNotice && <Alert variant="info">{busyNotice}</Alert>}
                  {submitError && <Alert variant="danger">{submitError}</Alert>}
                </div>

                <div className="public-wizard-actions">
                  <button
                    className="btn btn--ghost wizard-btn"
                    onClick={handleBackFromForm}
                    disabled={submitting}
                  >
                    {t.public.back}
                  </button>
                  <button
                    className={`btn wizard-btn${submitting && !cooling ? ' is-loading' : ''}`}
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
