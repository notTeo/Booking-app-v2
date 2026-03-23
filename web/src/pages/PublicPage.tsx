import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import type { ShopInfo } from '../api/public.api';
import { getShopInfo } from '../api/public.api';
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
// ─── Component ────────────────────────────────────────────────────────────────

export default function PublicPage() {
  const { slug } = useParams<{ slug: string }>();
  const [shop, setShop]       = useState<ShopInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  // ── Wizard state ──
  const [step, setStep]                     = useState<1 | 2 | 3>(1);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [selectedMemberId, setSelectedMemberId]   = useState<string | null>(null);
  const [date, setDate]                     = useState('');

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
    setSelectedMemberId(null); // reset downstream
    setDate('');
    setStep(2);
  }

  function handleSelectMember(memberId: string | null) {
    setSelectedMemberId(memberId);
    setDate('');
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
      setStep(2);
    }
  }

  // ── Step labels for the progress indicator ──
  const STEPS = ['Service', 'Staff', 'Date'];

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
        <section className="public-section">
          <h2 className="public-section-title">Book an Appointment</h2>

          {/* Step progress indicator */}
          <div className="public-wizard-steps">
            {STEPS.map((label, i) => {
              const stepNum = (i + 1) as 1 | 2 | 3;
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

              <button className="public-wizard-back" onClick={goBack}>← Back</button>
            </div>
          )}

          {/* ── Step 3: Select a date ── */}
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

              <input type="date" value={date} onChange={handleDateChange} />

              <div>
                              <button className="public-wizard-btn" onClick={goBack}>← Back</button>
              {date != '' && (<button className="public-wizard-btn" onClick={e => console.log({selectedServiceId, selectedMemberId, date})}>Get Slots</button>)}
          
              </div>
             </div>
          )}

        </section>

      </main>
    </div>
  );
}
