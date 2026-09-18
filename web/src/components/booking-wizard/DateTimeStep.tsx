import { useEffect } from 'react';
import type { Service, ShopMember } from '../../api/public.api';
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
  onDateChange,
  onSelectTime,
  onBack,
  onContinue,
}: {
  date: string;
  time: string;
  slots: string[];
  selectedService: Service | null;
  selectedMember: ShopMember | null;
  minDate?: string;
  timeHint?: string;
  onDateChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSelectTime: (time: string) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const { t } = useLang();

  // Auto-select the nearest available slot to a calendar-click time hint,
  // but never override an explicit user pick, and only within a sane
  // distance of the hint — otherwise leave it unselected.
  useEffect(() => {
    if (!timeHint || slots.length === 0 || time) return;
    const hintMins = toMins(timeHint);
    let nearest = slots[0];
    let nearestDist = Math.abs(toMins(nearest) - hintMins);
    for (const s of slots) {
      const d = Math.abs(toMins(s) - hintMins);
      if (d < nearestDist) {
        nearest = s;
        nearestDist = d;
      }
    }
    if (nearestDist <= TIME_HINT_THRESHOLD_MINS) onSelectTime(nearest);
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

      <div className="public-slots-grid">
        {slots.map((slot) => (
          <button
            key={slot}
            className={`public-slot-btn${time === slot ? ' public-slot-btn--selected' : ''}`}
            onClick={() => onSelectTime(slot)}
          >
            {slot}
          </button>
        ))}
      </div>

      <div className="public-wizard-actions">
        <button className="btn btn-ghost wizard-btn" onClick={onBack}>{t.public.back}</button>
        {date !== '' && time !== '' && (
          <button className="btn btn-primary wizard-btn" onClick={onContinue}>{t.public.continue}</button>
        )}
      </div>
    </div>
  );
}
