import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { ShopInfo } from '../api/public.api';
import { getShopInfo, getPublicSlots } from '../api/public.api';
import { getCustomers, type Customer } from '../api/customer.api';
import { createOwnerBooking } from '../api/booking.api';
import { useLang } from '../context/LanguageContext';
import '../styles/pages/public.css';

function formatDuration(mins: number): string {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatPrice(cents: number): string {
  return `€${(cents / 100).toFixed(2)}`;
}

function buildISODateTime(date: string, time: string): string {
  return new Date(`${date}T${time}:00`).toISOString();
}

export default function ShopNewBookingPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { t } = useLang();

  const [shop, setShop]       = useState<ShopInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  // ── Wizard state ──
  const [step, setStep]                           = useState<1 | 2 | 3 | 4>(1);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [selectedMemberId, setSelectedMemberId]   = useState<string | null>(null);
  const [date, setDate]                           = useState('');
  const [time, setTime]                           = useState('');
  const [slots, setSlots]                         = useState<string[]>([]);

  // ── Customer form state ──
  const [phone, setPhone]                         = useState('');
  const [name, setName]                           = useState('');
  const [email, setEmail]                         = useState('');
  const [notes, setNotes]                         = useState('');

  // ── Phone search state ──
  const [customerResults, setCustomerResults]     = useState<Customer[]>([]);
  const [showDropdown, setShowDropdown]           = useState(false);
  const debounceRef                               = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Submission state ──
  const [submitting, setSubmitting]   = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    getShopInfo(slug)
      .then(setShop)
      .catch(() => setError(t.public.shopNotFound))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <div className="public-loading"><div className="spinner" /></div>;
  if (error || !shop) return <div className="public-error"><p>{error ?? t.public.somethingWrong}</p></div>;

  // ── Derived ──
  const selectedService = shop.services.find(s => s.id === selectedServiceId) ?? null;
  const eligibleMembers = selectedServiceId
    ? shop.members.filter(m => m.staffServices.some(ss => ss.service.id === selectedServiceId))
    : shop.members;

  // ── Wizard navigation ──
  function handleSelectService(serviceId: string) {
    setSelectedServiceId(serviceId);
    setSelectedMemberId(null);
    setDate('');
    setTime('');
    setStep(2);
  }

  function handleSelectMember(memberId: string | null) {
    setSelectedMemberId(memberId);
    setDate('');
    setTime('');
    setStep(3);
  }

  function handleDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newDate = e.target.value;
    setDate(newDate);
    setTime('');
    if (!shop || !selectedServiceId) return;
    getPublicSlots(slug!, newDate, selectedMemberId, selectedServiceId)
      .then(s => setSlots(Array.isArray(s) ? s : []))
      .catch(() => setSlots([]));
  }

  function goBack() {
    if (step === 2) { setSelectedServiceId(null); setStep(1); }
    else if (step === 3) { setSelectedMemberId(null); setDate(''); setTime(''); setStep(2); }
    else if (step === 4) { setSubmitError(null); setStep(3); }
  }

  // ── Phone debounced search ──
  function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setPhone(val);
    setName('');
    setEmail('');
    setShowDropdown(false);
    setCustomerResults([]);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.trim().length < 2) return;

    debounceRef.current = setTimeout(() => {
      getCustomers(shop.id, val.trim())
        .then(results => {
          setCustomerResults(results);
          setShowDropdown(results.length > 0);
        })
        .catch(() => {});
    }, 300);
  }

  function selectCustomer(c: Customer) {
    setPhone(c.phone);
    setName(c.name);
    setEmail(c.email ?? '');
    setShowDropdown(false);
    setCustomerResults([]);
  }

  async function handleSubmit() {
    if (!selectedServiceId) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await createOwnerBooking(shop.id, {
        name,
        phone,
        email: email || undefined,
        serviceId: selectedServiceId,
        staffId: selectedMemberId ?? undefined,
        startTime: buildISODateTime(date, time),
        notes: notes || undefined,
      });
      navigate(`/shops/${slug}/bookings`);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })
          ?.response?.data?.message ?? t.bookings.createError;
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  const STEPS = [t.public.service, t.public.staff, t.public.dateTime, t.public.yourDetails];

  return (
    <div className="public-page">
      <header className="public-header">
        <div className="public-header-inner">
          <h1 className="public-shop-name">{shop.name}</h1>
        </div>
      </header>

      <main className="public-main">
        <section className="public-section">
          <h2 className="public-section-title">{t.bookings.newBookingTitle}</h2>

          <div className="public-wizard-steps">
            {STEPS.map((label, i) => {
              const stepNum = (i + 1) as 1 | 2 | 3 | 4;
              const isCompleted = step > stepNum;
              const isActive    = step === stepNum;
              return (
                <div
                  key={label}
                  className={[
                    'public-wizard-step',
                    isActive    ? 'public-wizard-step--active'    : '',
                    isCompleted ? 'public-wizard-step--completed' : '',
                  ].join(' ').trim()}
                >
                  <span className="public-wizard-step-number">{isCompleted ? '✓' : stepNum}</span>
                  <span className="public-wizard-step-label">{label}</span>
                </div>
              );
            })}
          </div>

          {/* ── Step 1: Select a service ── */}
          {step === 1 && (
            <div className="public-wizard-panel">
              {shop.services.length === 0 ? (
                <p>{t.public.noServices}</p>
              ) : (
                <div className="public-services-grid">
                  {shop.services.map(s => (
                    <button
                      key={s.id}
                      className="public-service-card public-service-card--selectable"
                      onClick={() => handleSelectService(s.id)}
                    >
                      <div className="public-service-header">
                        <h3>{s.name}</h3>
                        <span className="public-service-price">{formatPrice(s.price)}</span>
                      </div>
                      {s.description && <p className="public-service-desc">{s.description}</p>}
                      <div className="public-service-duration">⏱ {formatDuration(s.duration)}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Step 2: Select a staff member ── */}
          {step === 2 && (
            <div className="public-wizard-panel">
              {selectedService && (
                <p className="public-wizard-context">
                  {t.public.serviceContext} <strong>{selectedService.name}</strong>
                </p>
              )}
              {eligibleMembers.length === 0 ? (
                <p>{t.public.noStaff}</p>
              ) : (
                <div className="public-team-grid">
                  {eligibleMembers.map(m => (
                    <button
                      key={m.id}
                      className="public-team-card public-team-card--selectable"
                      onClick={() => handleSelectMember(m.id)}
                    >
                      <div className="public-team-avatar">
                        {m.user.name?.charAt(0)?.toUpperCase() ?? '?'}
                      </div>
                      <div className="public-team-info">
                        <h3>{m.user.name}</h3>
                        {m.staffServices.length > 0 && (
                          <div className="public-team-services">
                            {m.staffServices.map(ss => (
                              <span key={ss.service.id} className="public-team-service-tag">
                                {ss.service.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
              <button
                className="public-team-card public-team-card--selectable"
                onClick={() => handleSelectMember(null)}
              >
                <div className="public-team-avatar">✦</div>
                <div className="public-team-info">
                  <h3>{t.public.noPreference}</h3>
                  <p className="public-team-any-subtitle">{t.public.anyStaff}</p>
                </div>
              </button>
              <button className="public-wizard-btn" onClick={goBack}>{t.public.back}</button>
            </div>
          )}

          {/* ── Step 3: Select a date & time (no past-date restriction) ── */}
          {step === 3 && (
            <div className="public-wizard-panel">
              {selectedService && (
                <p className="public-wizard-context">
                  {t.public.serviceContext} <strong>{selectedService.name}</strong>
                  {selectedMemberId && shop.members.find(m => m.id === selectedMemberId) && (
                    <> · {t.public.staffContext} <strong>{shop.members.find(m => m.id === selectedMemberId)!.user.name}</strong></>
                  )}
                </p>
              )}
              <div className="public-datetime-row">
                <label className="public-field-label" htmlFor="booking-date">{t.public.date}</label>
                <input
                  id="booking-date"
                  className="public-field-input"
                  type="date"
                  value={date}
                  onChange={handleDateChange}
                />
              </div>
              <div className="public-slots-grid">
                {slots.map(slot => (
                  <button
                    key={slot}
                    className={`public-slot-btn${time === slot ? ' public-slot-btn--selected' : ''}`}
                    onClick={() => setTime(slot)}
                  >
                    {slot}
                  </button>
                ))}
              </div>
              <div className="public-wizard-actions">
                <button className="public-wizard-btn" onClick={goBack}>{t.public.back}</button>
                {date !== '' && time !== '' && (
                  <button
                    className="public-wizard-btn public-wizard-btn--primary"
                    onClick={() => setStep(4)}
                  >
                    {t.public.continue}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── Step 4: Customer details ── */}
          {step === 4 && (
            <div className="public-wizard-panel">
              {selectedService && (
                <p className="public-wizard-context">
                  {t.public.serviceContext} <strong>{selectedService.name}</strong>
                  {selectedMemberId && shop.members.find(m => m.id === selectedMemberId) && (
                    <> · {t.public.staffContext} <strong>{shop.members.find(m => m.id === selectedMemberId)!.user.name}</strong></>
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
                      {customerResults.map(c => (
                        <li
                          key={c.id}
                          className="customer-search-item"
                          onMouseDown={() => selectCustomer(c)}
                        >
                          <strong>{c.name}</strong>
                          <span className="customer-search-phone">{c.phone}</span>
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
                    onChange={e => setName(e.target.value)}
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
                    onChange={e => setEmail(e.target.value)}
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
                    onChange={e => setNotes(e.target.value)}
                    rows={3}
                  />
                </div>

                {submitError && <p className="public-submit-error">{submitError}</p>}
              </div>

              <div className="public-wizard-actions">
                <button
                  className="public-wizard-btn"
                  onClick={goBack}
                  disabled={submitting}
                >
                  {t.public.back}
                </button>
                <button
                  className="public-wizard-btn public-wizard-btn--primary"
                  onClick={handleSubmit}
                  disabled={submitting || name.trim() === '' || phone.trim() === ''}
                >
                  {submitting ? t.bookings.creating : t.bookings.createBooking}
                </button>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
