import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { Service, ShopMember, SlotsResponse } from '../../api/public.api';
import { useLang } from '../../context/LanguageContext';

const toMins = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

/** How close (in minutes) a clicked calendar slot's hint must be to an actual
 * available slot before we auto-select it — beyond this we leave it to the
 * user rather than silently jumping them to a far-away time. */
const TIME_HINT_THRESHOLD_MINS = 60;

export default function DateTimeStep({
  date,
  time,
  slots,
  selectedService,
  selectedMember,
  minDate,
  timeHint,
  mode,
  closedLinkTo,
  onDateChange,
  onSelectTime,
  onBack,
  onContinue,
}: {
  date: string;
  time: string;
  slots: SlotsResponse;
  selectedService: Service | null;
  selectedMember: ShopMember | null;
  minDate?: string;
  timeHint?: string;
  /** 'public' = customer-facing booking page, 'internal' = owner/staff creating a booking. */
  mode: 'public' | 'internal';
  /** Internal mode only — link to the working-hours page to fix a closed/no-schedule day. */
  closedLinkTo?: string;
  onDateChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSelectTime: (time: string) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const { t } = useLang();

  const isClosed = date !== '' && slots.status === 'closed';
  // Public view only ever offers free times (unchanged from before); internal
  // view shows every slot in the day, with booked ones disabled rather than
  // hidden, so staff can see the whole working window.
  const slotList = slots.status === 'ok'
    ? (mode === 'internal' ? slots.slots : slots.slots.filter((s) => s.available))
    : [];

  // Auto-select the nearest available slot to a calendar-click time hint,
  // but never override an explicit user pick, and only within a sane
  // distance of the hint — otherwise leave it unselected.
  useEffect(() => {
    if (!timeHint || time || slots.status !== 'ok') return;
    const availableSlots = slots.slots.filter((s) => s.available);
    if (availableSlots.length === 0) return;
    const hintMins = toMins(timeHint);
    let nearest = availableSlots[0];
    let nearestDist = Math.abs(toMins(nearest.time) - hintMins);
    for (const s of availableSlots) {
      const d = Math.abs(toMins(s.time) - hintMins);
      if (d < nearestDist) {
        nearest = s;
        nearestDist = d;
      }
    }
    if (nearestDist <= TIME_HINT_THRESHOLD_MINS) onSelectTime(nearest.time);
  }, [slots, timeHint, time, onSelectTime]);

  return (
    <div className="public-wizard-panel">
      {selectedService && (
        <p className="public-wizard-context">
          {t.public.serviceContext} <strong>{selectedService.name}</strong>
          {selectedMember && (
            <> · {t.public.staffContext} <strong>{selectedMember.name}</strong></>
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
          onChange={onDateChange}
          min={minDate}
        />
      </div>

      {isClosed ? (
        <div className="public-closed-message">
          <p>{mode === 'internal' ? t.public.closedOrNoSchedule : t.public.closedThisDay}</p>
          {mode === 'internal' && closedLinkTo && (
            <p className="public-closed-hint">
              <Link to={closedLinkTo}>{t.public.manageWorkingHours}</Link>
            </p>
          )}
        </div>
      ) : (
        <div className="public-slots-grid">
          {slotList.map((slot) => (
            <button
              key={slot.time}
              className={`public-slot-btn${time === slot.time ? ' public-slot-btn--selected' : ''}${!slot.available ? ' public-slot-btn--disabled' : ''}`}
              onClick={() => slot.available && onSelectTime(slot.time)}
              disabled={mode === 'internal' && !slot.available}
            >
              {slot.time}
            </button>
          ))}
        </div>
      )}

      <div className="public-wizard-actions">
        <button className="btn btn-ghost wizard-btn" onClick={onBack}>{t.public.back}</button>
        {date !== '' && time !== '' && (
          <button className="btn btn-primary wizard-btn" onClick={onContinue}>{t.public.continue}</button>
        )}
      </div>
    </div>
  );
}
