import { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendarXmark, faClock } from '@fortawesome/free-solid-svg-icons';
import { Link } from 'react-router-dom';
import type { Service, ShopMember, SlotInfo, SlotsResponse } from '../../api/public.api';
import { useLang } from '../../context/LanguageContext';
import Alert from '../Alert';
import Switch from '../Switch';
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
  slotsError,
  onRetrySlots,
  selectedService,
  selectedMember,
  minDate,
  maxDate,
  timeHint,
  mode,
  closedLinkTo,
  defaultShowOutside,
  interval,
  intervalOptions,
  onIntervalChange,
  onDateChange,
  onSelectTime,
  onBack,
  onContinue,
}: {
  date: string;
  time: string;
  slots: SlotsResponse;
  /** The last slot fetch failed: show an error with Retry, never "closed". */
  slotsError?: boolean;
  onRetrySlots?: () => void;
  selectedService: Service | null;
  selectedMember: ShopMember | null;
  minDate?: string;
  maxDate?: string;
  timeHint?: string;
  /** 'public' = customer-facing booking page, 'internal' = owner/staff creating a booking. */
  mode: 'public' | 'internal';
  /** Internal mode only — link to the team page (where working hours are set) to fix a closed/no-schedule day. */
  closedLinkTo?: string;
  /** Internal mode only — start with the out-of-hours toggle already on (e.g. the calendar's hatched area was clicked). */
  defaultShowOutside?: boolean;
  /** Internal mode only — the slot step chosen for this booking (the shop's own interval when nothing was picked). */
  interval?: number;
  /** Internal mode only — steps staff can switch between; the picker is hidden when absent. */
  intervalOptions?: readonly number[];
  onIntervalChange?: (minutes: number) => void;
  onDateChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSelectTime: (time: string) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const { t } = useLang();

  const failed = date !== '' && !!slotsError;
  const isClosed = date !== '' && !failed && slots.status === 'closed';
  // Owner/staff can also book outside working hours: the slot list carries the
  // out-of-hours grid, shown only when the toggle is on. (A closed day still
  // shows its "closed" note and can offer the grid too.)
  const [showOutside, setShowOutside] = useState(defaultShowOutside ?? false);
  const [customTime, setCustomTime] = useState('');
  const internal = mode === 'internal';
  const allSlots: SlotInfo[] = failed ? [] : (slots.slots ?? []);
  const sections = internal ? groupSlotSections(allSlots, showOutside) : [];
  // Public view only ever offers free times (unchanged from before). Internal
  // view shows every slot in the day, with booked ones disabled rather than
  // hidden, so staff can see the whole working window.
  const visibleSlots = internal
    ? sections.flatMap((g) => g.slots)
    : !failed && slots.status === 'ok'
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
    if (slot.offGrid) parts.push(t.bookings.intervalPicker.offGrid);
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
      type="button"
      className={`slot${slot.outsideHours || slot.offGrid ? ' slot--dashed' : ''}`}
      aria-pressed={time === slot.time}
      onClick={() => pickSlot(slot)}
      disabled={internal && !slot.available}
      aria-label={internal && (slot.outsideHours || slot.offGrid || !slot.available || slot.past) ? slotLabel(slot) : undefined}
    >
      {slot.outsideHours && <><FontAwesomeIcon icon={faClock} aria-hidden="true" /> </>}
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
        <label className="field__label" htmlFor="booking-date">{t.public.date}</label>
        <input
          id="booking-date"
          className="input"
          type="date"
          value={date}
          onChange={onDateChange}
          min={minDate}
          max={maxDate}
        />
      </div>

      {internal && date !== '' && intervalOptions && interval !== undefined && onIntervalChange && (
        <div className="interval-picker" role="group" aria-label={t.bookings.intervalPicker.label}>
          <span className="field__label">{t.bookings.intervalPicker.label}</span>
          <div className="slots">
          {intervalOptions.map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={interval === m}
              className="slot"
              onClick={() => interval !== m && onIntervalChange(m)}
            >
              {t.bookings.intervalPicker.option.replace('{n}', String(m))}
            </button>
          ))}
          </div>
        </div>
      )}

      {internal && date !== '' && (hasOutsideSlots || isClosed) && (
        <div className="ooh-toggle">
          <Switch
            id="ooh-toggle"
            checked={showOutside}
            label={os.toggle}
            onChange={(checked) => {
              setShowOutside(checked);
              // A chosen time that only exists in the out-of-hours list (or was
              // typed in) goes away with it, rather than staying selected unseen.
              if (!checked) {
                const chosen = allSlots.find((x) => x.time === time);
                if (time !== '' && (!chosen || chosen.outsideHours)) {
                  setCustomTime('');
                  onSelectTime('');
                }
              }
            }}
          />
          <label htmlFor="ooh-toggle">
            <FontAwesomeIcon icon={faClock} /> {os.toggle}
          </label>
        </div>
      )}

      {failed && (
        <Alert
          variant="danger"
          actions={
            onRetrySlots && (
              <button type="button" className="btn btn--secondary btn--sm" onClick={onRetrySlots}>
                {t.public.retry}
              </button>
            )
          }
        >
          {t.public.failedSlots}
        </Alert>
      )}

      {isClosed && (
        <div className="empty empty--sm" role="status">
          <span className="empty__icon"><FontAwesomeIcon icon={faCalendarXmark} aria-hidden="true" /></span>
          <p className="empty__text">{mode === 'internal' ? t.public.closedOrNoSchedule : t.public.closedThisDay}</p>
          {mode === 'internal' && closedLinkTo && (
            <p className="empty__text">
              <Link to={closedLinkTo}>{t.public.manageWorkingHours}</Link>
            </p>
          )}
        </div>
      )}

      {!internal && !isClosed && !failed && (
        <div className="slots">{visibleSlots.map(renderSlot)}</div>
      )}

      {internal &&
        sections.map((g) => {
          const heading = (
            <>
              {g.key !== 'working' && <><FontAwesomeIcon icon={faClock} /> </>}
              {sectionTitle(g.key)}
            </>
          );
          // Out-of-hours sections collapse (handy on a phone screen); working
          // hours never do — it's the one section that's always relevant.
          if (g.key === 'working') {
            return (
              <section key={g.key} className="slot-group">
                {showOutside && <h4 className="slot-group__label">{heading}</h4>}
                <div className="slots">{g.slots.map(renderSlot)}</div>
              </section>
            );
          }
          return (
            <details key={g.key} className="slot-group slot-group--collapsible" open>
              <summary>
                {/* <h4> (not <summary> itself) so this keeps its heading role for assistive tech and tests. */}
                <h4 className="slot-group__label">
                  {heading} <span className="slot-group__count">({g.slots.length})</span>
                </h4>
              </summary>
              <div className="slots">{g.slots.map(renderSlot)}</div>
            </details>
          );
        })}

      {internal && showOutside && date !== '' && !failed && (
        <div className="ooh-other-time">
          <label className="field__label" htmlFor="booking-other-time">{os.otherTime}</label>
          <input
            id="booking-other-time"
            className="input"
            type="time"
            step={300}
            value={customValue}
            onChange={(e) => {
              setCustomTime(e.target.value);
              onSelectTime(e.target.value);
            }}
          />
          <p className="field__hint">{os.otherTimeHint}</p>
        </div>
      )}

      <div className="public-wizard-actions">
        <button className="btn btn--ghost wizard-btn" onClick={onBack}>{t.public.back}</button>
        {date !== '' && time !== '' && (
          <button className="btn wizard-btn" onClick={onContinue}>{t.public.continue}</button>
        )}
      </div>
    </div>
  );
}
