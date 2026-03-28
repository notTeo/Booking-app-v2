import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import type { ShopInfo } from '../api/public.api';
import { getShopInfo, createBooking } from '../api/public.api';
import '../styles/pages/public.css';

function formatDuration(mins: number): string {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function buildISODateTime(date: string, time: string): string {
  return new Date(`${date}T${time}:00`).toISOString();
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PublicPage() {
  const { slug } = useParams<{ slug: string }>();
  const [shop, setShop]       = useState<ShopInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  // ── Wizard state ──
  const [step, setStep]                           = useState<1 | 2 | 3 | 4>(1);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [selectedMemberId, setSelectedMemberId]   = useState<string | null>(null);
  const [date, setDate]                           = useState('');
  const [time, setTime]                           = useState('');

  // ── Customer form state ──
  const [name, setName]   = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');

  // ── Submission state ──
  const [submitting, setSubmitting]   = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmed, setConfirmed]     = useState(false);

  useEffect(() => {
    if (!slug) return;
    getShopInfo(slug)
      .then(setShop)
      .catch(() => setError('Shop not found'))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return <div className="public-loading"><div className="spinner" /></div>;
  }

  if (error || !shop) {
    return <div className="public-error"><p>{error ?? 'Something went wrong'}</p></div>;
  }

  // ── Derived ──
  const selectedService = shop.services.find(s => s.id === selectedServiceId) ?? null;

  /** Members who offer the selected service (or all members if none selected). */
  const eligibleMembers = selectedServiceId
    ? shop.members.filter(m =>
        m.staffServices.some(ss => ss.service.id === selectedServiceId)
      )
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
    setDate(e.target.value);
  }

  function goBack() {
    if (step === 2) {
      setSelectedServiceId(null);
      setStep(1);
    } else if (step === 3) {
      setSelectedMemberId(null);
      setDate('');
      setTime('');
      setStep(2);
    } else if (step === 4) {
      setSubmitError(null);
      setStep(3);
    }
  }

  async function handleSubmit() {
    if (!slug || !selectedServiceId) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await createBooking(slug, {
        name,
        phone,
        email: email || undefined,
        serviceId: selectedServiceId,
        staffId: selectedMemberId ?? '',
        startTime: buildISODateTime(date, time),
        notes: notes || undefined,
      });
      setConfirmed(true);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })
          ?.response?.data?.message ?? 'Something went wrong. Please try again.';
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  // ── Step labels for the progress indicator ──
  const STEPS = ['Service', 'Staff', 'Date & Time', 'Your Details'];

  return (
    <div className="public-page">

      {/* ── Header ── */}
      <header className="public-header">
        <div className="public-header-inner">
          <h1 className="public-shop-name">{shop.name}</h1>
          {shop.description && <p className="public-shop-desc">{shop.description}</p>}
          <div className="public-shop-meta">
            {shop.phone             && <span>📞 {shop.phone}</span>}
            {shop.formattedAddress  && <span>📍 {shop.formattedAddress}</span>}
            <span>🕐 {shop.timezone}</span>
          </div>
        </div>
      </header>

      <main className="public-main">

        {/* ── Booking wizard ── */}
        {confirmed ? (
          <section className="public-section">
            <div className="public-booking-confirmed">
              <div className="public-booking-confirmed-icon">✓</div>
              <h2 className="public-booking-confirmed-title">Booking Confirmed!</h2>
              <p className="public-booking-confirmed-message">
                Thanks, <strong>{name}</strong>. Your appointment for{' '}
                <strong>{selectedService?.name}</strong> on <strong>{date}</strong> at{' '}
                <strong>{time}</strong> has been booked. We'll see you then!
              </p>
              {(phone || email) && (
                <p className="public-booking-confirmed-contact">
                  {phone && <><strong>{phone}</strong></>}
                  {phone && email && ' / '}
                  {email && <><strong>{email}</strong></>}
                </p>
              )}
            </div>
          </section>
        ) : (
          <section className="public-section">
            <h2 className="public-section-title">Book an Appointment</h2>

            {/* Step progress indicator */}
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
                  <p>No services available.</p>
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
                    Service: <strong>{selectedService.name}</strong>
                  </p>
                )}

                {eligibleMembers.length === 0 ? (
                  <p>No staff available for this service.</p>
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
                    <h3>No preference</h3>
                    <p className="public-team-any-subtitle">Any available staff member</p>
                  </div>
                </button>

                <button className="public-wizard-btn" onClick={goBack}>← Back</button>
              </div>
            )}

            {/* ── Step 3: Select a date & time ── */}
            {step === 3 && (
              <div className="public-wizard-panel">
                {selectedService && (
                  <p className="public-wizard-context">
                    Service: <strong>{selectedService.name}</strong>
                    {selectedMemberId && shop.members.find(m => m.id === selectedMemberId) && (
                      <> · Staff: <strong>{shop.members.find(m => m.id === selectedMemberId)!.user.name}</strong></>
                    )}
                  </p>
                )}

                <div className="public-datetime-row">
                  <label className="public-field-label" htmlFor="booking-date">Date</label>
                  <input
                    id="booking-date"
                    className="public-field-input"
                    type="date"
                    value={date}
                    onChange={handleDateChange}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>

                <div className="public-datetime-row">
                  <label className="public-field-label" htmlFor="booking-time">Time</label>
                  <input
                    id="booking-time"
                    className="public-field-input"
                    type="time"
                    value={time}
                    onChange={e => setTime(e.target.value)}
                  />
                </div>

                <div className="public-wizard-actions">
                  <button className="public-wizard-btn" onClick={goBack}>← Back</button>
                  {date !== '' && time !== '' && (
                    <button
                      className="public-wizard-btn public-wizard-btn--primary"
                      onClick={() => setStep(4)}
                    >
                      Continue →
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
                    Service: <strong>{selectedService.name}</strong>
                    {selectedMemberId && shop.members.find(m => m.id === selectedMemberId) && (
                      <> · Staff: <strong>{shop.members.find(m => m.id === selectedMemberId)!.user.name}</strong></>
                    )}
                    {' · '}<strong>{date}</strong> at <strong>{time}</strong>
                  </p>
                )}

                <div className="public-booking-form">
                  <div className="public-field-group">
                    <label className="public-field-label" htmlFor="b-name">
                      Name <span className="public-field-required">*</span>
                    </label>
                    <input
                      id="b-name"
                      className="public-field-input"
                      type="text"
                      placeholder="Your name"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      autoComplete="name"
                    />
                  </div>

                  <div className="public-field-group">
                    <label className="public-field-label" htmlFor="b-phone">
                      Phone <span className="public-field-required">*</span>
                    </label>
                    <input
                      id="b-phone"
                      className="public-field-input"
                      type="tel"
                      placeholder="+1 555 000 0000"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      autoComplete="tel"
                    />
                  </div>

                  <div className="public-field-group">
                    <label className="public-field-label" htmlFor="b-email">
                      Email <span className="public-field-optional">(optional)</span>
                    </label>
                    <input
                      id="b-email"
                      className="public-field-input"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      autoComplete="email"
                    />
                  </div>

                  <div className="public-field-group">
                    <label className="public-field-label" htmlFor="b-notes">
                      Notes <span className="public-field-optional">(optional)</span>
                    </label>
                    <textarea
                      id="b-notes"
                      className="public-field-input public-field-textarea"
                      placeholder="Any special requests..."
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      rows={3}
                    />
                  </div>

                  {submitError && (
                    <p className="public-submit-error">{submitError}</p>
                  )}
                </div>

                <div className="public-wizard-actions">
                  <button
                    className="public-wizard-btn"
                    onClick={goBack}
                    disabled={submitting}
                  >
                    ← Back
                  </button>
                  <button
                    className="public-wizard-btn public-wizard-btn--primary"
                    onClick={handleSubmit}
                    disabled={submitting || name.trim() === '' || phone.trim() === ''}
                  >
                    {submitting ? 'Booking…' : 'Confirm Booking'}
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
