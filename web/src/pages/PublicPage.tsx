import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPhone, faLocationDot, faClock, faCircleCheck } from '@fortawesome/free-solid-svg-icons';
import { createBooking } from '../api/public.api';
import { useLang } from '../context/LanguageContext';
import { useBookingWizard } from '../hooks/useBookingWizard';
import WizardStepsIndicator from '../components/booking-wizard/WizardStepsIndicator';
import ServiceSelectStep from '../components/booking-wizard/ServiceSelectStep';
import StaffSelectStep from '../components/booking-wizard/StaffSelectStep';
import DateTimeStep from '../components/booking-wizard/DateTimeStep';
import { buildISODateTime } from '../components/booking-wizard/wizardUtils';
import '../styles/pages/public.css';

const todayISO = () => new Date().toISOString().split('T')[0];

export default function PublicPage() {
  const { slug } = useParams<{ slug: string }>();
  const { t } = useLang();
  const wizard = useBookingWizard({ slug: slug ?? '' });

  // ── Customer form state (step 4 — plain form, no autocomplete) ──
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');

  // ── Submission state ──
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  if (wizard.loading) {
    return <div className="public-loading"><div className="spinner" /></div>;
  }
  if (wizard.error || !wizard.shop) {
    return <div className="public-error"><p>{wizard.error ?? t.public.somethingWrong}</p></div>;
  }

  const shop = wizard.shop;
  const selectedMember = shop.members.find((m) => m.id === wizard.selectedMemberId) ?? null;

  async function handleSubmit() {
    if (!slug || !wizard.selectedServiceId) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await createBooking(slug, {
        name,
        phone,
        email: email || undefined,
        serviceId: wizard.selectedServiceId,
        staffId: wizard.selectedMemberId ?? '',
        startTime: buildISODateTime(wizard.date, wizard.time),
        notes: notes || undefined,
      });
      setConfirmed(true);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })
          ?.response?.data?.message ?? t.public.somethingWrong;
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  function handleBackFromForm() {
    setSubmitError(null);
    wizard.setStep(3);
  }

  return (
    <div className="public-page">
      <header className="public-header">
        <div className="public-header-inner">
          <h1 className="public-shop-name">{shop.name}</h1>
          {shop.description && <p className="public-shop-desc">{shop.description}</p>}
          <div className="public-shop-meta">
            {shop.phone && <span><FontAwesomeIcon icon={faPhone} /> {shop.phone}</span>}
            {shop.formattedAddress && <span><FontAwesomeIcon icon={faLocationDot} /> {shop.formattedAddress}</span>}
            <span><FontAwesomeIcon icon={faClock} /> {shop.timezone}</span>
          </div>
        </div>
      </header>

      <main className="public-main">
        {confirmed ? (
          <section className="public-section">
            <div className="public-booking-confirmed">
              <div className="public-booking-confirmed-icon">
                <FontAwesomeIcon icon={faCircleCheck} />
              </div>
              <h2 className="public-booking-confirmed-title">{t.public.bookingConfirmed}</h2>
              <p className="public-booking-confirmed-message">
                {t.public.bookingConfirmedMsg
                  .replace('{name}', name)
                  .replace('{service}', wizard.selectedService?.name ?? '')
                  .replace('{date}', wizard.date)
                  .replace('{time}', wizard.time)}
              </p>
              {(phone || email) && (
                <p className="public-booking-confirmed-contact">
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
                minDate={todayISO()}
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
                      autoComplete="name"
                    />
                  </div>

                  <div className="public-field-group">
                    <label className="public-field-label" htmlFor="b-phone">
                      {t.public.phoneLabel} <span className="public-field-required">*</span>
                    </label>
                    <input
                      id="b-phone"
                      className="public-field-input"
                      type="tel"
                      placeholder={t.public.phonePlaceholder}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      autoComplete="tel"
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
                      autoComplete="email"
                    />
                    <p className="public-field-hint">{t.public.emailHint}</p>
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

                  {submitError && <p className="public-submit-error">{submitError}</p>}
                </div>

                <div className="public-wizard-actions">
                  <button
                    className="btn btn-ghost wizard-btn"
                    onClick={handleBackFromForm}
                    disabled={submitting}
                  >
                    {t.public.back}
                  </button>
                  <button
                    className="btn btn-primary wizard-btn"
                    onClick={handleSubmit}
                    disabled={submitting || name.trim() === '' || phone.trim() === ''}
                  >
                    {submitting ? t.public.booking : t.public.confirmBooking}
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
