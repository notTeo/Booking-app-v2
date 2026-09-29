import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Service, ShopMember, SlotInfo, SlotsResponse } from '../../api/public.api';
import { useLang } from '../../context/LanguageContext';
import { groupSlotSections, type SlotSectionKey } from './wizardUtils';

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
  maxDate,
  timeHint,
  mode,
  closedLinkTo,
  defaultShowOutside,
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
  maxDate?: string;
  timeHint?: string;
  /** 'public' = customer-facing booking page, 'internal' = owner/staff creating a booking. */
  mode: 'public' | 'internal';
  /** Internal mode only — link to the working-hours page to fix a closed/no-schedule day. */
  closedLinkTo?: string;
  /** Internal mode only — start with the out-of-hours toggle already on (e.g. the calendar's hatched area was clicked). */
  defaultShowOutside?: boolean;
  onDateChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSelectTime: (time: string) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const { t } = useLang();

  const isClosed = date !== '' && slots.status === 'closed';
  // Owner/staff can also book outside working hours: the slot list carries the
  // out-of-hours grid, shown only when the toggle is on. (A closed day still
  // shows its "closed" note and can offer the grid too.)
  const [showOutside, setShowOutside] = useState(defaultShowOutside ?? false);
  const [customTime, setCustomTime] = useState('');
  const internal = mode === 'internal';
  const allSlots: SlotInfo[] = slots.slots ?? [];
  const sections = internal ? groupSlotSections(allSlots, showOutside) : [];
  // Public view only ever offers free times (unchanged from before). Internal
  // view shows every slot in the day, with booked ones disabled rather than
  // hidden, so staff can see the whole working window.
  const visibleSlots = internal
    ? sections.flatMap((g) => g.slots)
    : slots.status === 'ok'
      ? slots.slots.filter((s) => s.available)
      : [];
  const hasOutsideSlots = allSlots.some((s) => s.outsideHours);
  // The "Other time…" input only shows while it holds the selected time.
  const customValue = customTime !== '' && customTime === time ? customTime : '';

  const os = t.bookings.outsideHours;
  const sectionTitle = (key: SlotSectionKey) =>
    key === 'working' ? os.workingHours : `${os[key]} ${os.needsConfirm}`;
  const slotLabel = (slot: SlotInfo) => {
    const parts = [slot.time];
    if (slot.outsideHours) parts.push(os.slotAria);
    if (!slot.available) parts.push(os.booked);
    if (slot.past) parts.push(os.past);
    return parts.join(', ');
  };
  const pickSlot = (slot: SlotInfo) => {
    if (!slot.available) return;
    setCustomTime('');
    onSelectTime(slot.time);
  };
  const renderSlot = (slot: SlotInfo) => (
    <button
      key={slot.time}
      className={`public-slot-btn${time === slot.time ? ' public-slot-btn--selected' : ''}${!slot.available ? ' public-slot-btn--disabled' : ''}${slot.outsideHours ? ' public-slot-btn--outside' : ''}`}
      onClick={() => pickSlot(slot)}
      disabled={internal && !slot.available}
      aria-label={internal && (slot.outsideHours || !slot.available || slot.past) ? slotLabel(slot) : undefined}
    >
      {slot.outsideHours && <span aria-hidden="true">☾ </span>}
      {slot.time}
      {internal && !slot.available && <span className="slot-tag"> {os.booked}</span>}
      {internal && slot.available && slot.past && <span className="slot-tag"> {os.past}</span>}
    </button>
  );

  // Auto-select the nearest available slot to a calendar-click time hint,
  // but never override an explicit user pick, and only within a sane
  // distance of the hint — otherwise leave it unselected.
  useEffect(() => {
    if (!timeHint || time || slots.status !== 'ok') return;
    // Only slots currently on screen are candidates.
    const onScreen = internal ? groupSlotSections(slots.slots, showOutside).flatMap((g) => g.slots) : slots.slots;
    const availableSlots = onScreen.filter((s) => s.available);
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
  }, [slots, timeHint, time, onSelectTime, showOutside, internal]);

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
          max={maxDate}
        />
      </div>

      {internal && date !== '' && (hasOutsideSlots || isClosed) && (
        <label className="ooh-toggle">
          <input
            type="checkbox"
            checked={showOutside}
            onChange={(e) => {
              setShowOutside(e.target.checked);
              // A chosen time that only exists in the out-of-hours list (or was
              // typed in) goes away with it, rather than staying selected unseen.
              if (!e.target.checked) {
                const chosen = allSlots.find((x) => x.time === time);
                if (time !== '' && (!chosen || chosen.outsideHours)) {
                  setCustomTime('');
                  onSelectTime('');
                }
              }
            }}
          />
          <span aria-hidden="true">☾</span> {os.toggle}
        </label>
      )}

      {isClosed && (
        <div className="public-closed-message">
          <p>{mode === 'internal' ? t.public.closedOrNoSchedule : t.public.closedThisDay}</p>
          {mode === 'internal' && closedLinkTo && (
            <p className="public-closed-hint">
              <Link to={closedLinkTo}>{t.public.manageWorkingHours}</Link>
            </p>
          )}
        </div>
      )}

      {!internal && !isClosed && (
        <div className="public-slots-grid">{visibleSlots.map(renderSlot)}</div>
      )}

      {internal &&
        sections.map((g) => {
          const heading = (
            <>
              {g.key !== 'working' && <span aria-hidden="true">☾ </span>}
              {sectionTitle(g.key)}
            </>
          );
          // Out-of-hours sections collapse (handy on a phone screen); working
          // hours never do — it's the one section that's always relevant.
          if (g.key === 'working') {
            return (
              <section key={g.key} className="slot-section">
                {showOutside && <h4 className="slot-section-title">{heading}</h4>}
                <div className="public-slots-grid">{g.slots.map(renderSlot)}</div>
              </section>
            );
          }
          return (
            <details key={g.key} className="slot-section slot-section--collapsible" open>
              <summary>
                {/* <h4> (not <summary> itself) so this keeps its heading role for assistive tech and tests. */}
                <h4 className="slot-section-title">
                  {heading} <span className="slot-section-count">({g.slots.length})</span>
                </h4>
              </summary>
              <div className="public-slots-grid">{g.slots.map(renderSlot)}</div>
            </details>
          );
        })}

      {internal && showOutside && date !== '' && (
        <div className="ooh-other-time">
          <label className="public-field-label" htmlFor="booking-other-time">{os.otherTime}</label>
          <input
            id="booking-other-time"
            className="public-field-input"
            type="time"
            step={300}
            value={customValue}
            onChange={(e) => {
              setCustomTime(e.target.value);
              onSelectTime(e.target.value);
            }}
          />
          <p className="public-closed-hint">{os.otherTimeHint}</p>
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
