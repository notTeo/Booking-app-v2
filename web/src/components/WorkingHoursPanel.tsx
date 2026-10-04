import { useEffect, useState, useId } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown, faXmark } from '@fortawesome/free-solid-svg-icons';
import { useLang } from '../context/LanguageContext';
import {
  type DayOfWeek,
  type HourRange,
  type Schedule,
  type CreateScheduleDto,
  type UpdateScheduleDto,
  type UpsertDaysDto,
} from '../api/workingHours.api';
import { handleActivateKeyDown } from '../utils/a11y';
import { apiErrorMessage } from '../utils/apiError';
import { findOverlap, scheduleStatus } from '../utils/scheduleOverlap';
import Switch from './Switch';
import '../styles/pages/working-hours.css';
import Alert from './Alert';
import ConfirmDialog from './ConfirmDialog';

// API bundle — callers build this with the correct shopId / memberId baked in
export interface WorkingHoursApi {
  getSchedules: () => Promise<Schedule[]>;
  createSchedule: (dto: CreateScheduleDto) => Promise<Schedule>;
  updateSchedule: (scheduleId: string, dto: UpdateScheduleDto) => Promise<Schedule>;
  deleteSchedule: (scheduleId: string) => Promise<unknown>;
  upsertDays: (scheduleId: string, dto: UpsertDaysDto) => Promise<Schedule | null | undefined>;
}

export interface WorkingHoursPanelProps {
  api: WorkingHoursApi;
  isOwner: boolean;
  /** Shop-wide content rendered above the schedules (e.g. the booking window). */
  /** Section heading; defaults to the working-hours title. */
  title?: string;
}

const DAY_ORDER: DayOfWeek[] = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

type DayState = { isOpen: boolean; hours: HourRange[] };
type DaysForm = Record<DayOfWeek, DayState>;

function defaultDays(): DaysForm {
  return DAY_ORDER.reduce((acc, d) => {
    acc[d] = { isOpen: false, hours: [] };
    return acc;
  }, {} as DaysForm);
}

function initDaysFromSchedule(schedule: Schedule): DaysForm {
  const base = defaultDays();
  for (const wd of schedule.days) {
    base[wd.day] = {
      isOpen: wd.isOpen,
      hours: wd.hours.map((h) => ({ startTime: h.startTime, endTime: h.endTime })),
    };
  }
  return base;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

interface ScheduleEditState {
  days: DaysForm;
  startDate: string;
  endDate: string;
  saving: boolean;
  success: string;
  error: string;
  slotErrors: Partial<Record<DayOfWeek, string>>;
  deleting: boolean;
  confirmDelete: boolean;
}

function makeEditState(schedule: Schedule): ScheduleEditState {
  return {
    days: initDaysFromSchedule(schedule),
    startDate: schedule.startDate.slice(0, 10),
    endDate: schedule.endDate ? schedule.endDate.slice(0, 10) : '',
    saving: false,
    success: '',
    error: '',
    slotErrors: {},
    deleting: false,
    confirmDelete: false,
  };
}

const STATUS_BADGE = { current: 'badge--success', upcoming: 'badge--accent', ended: 'badge--neutral' } as const;

export default function WorkingHoursPanel({ api, isOwner, title }: WorkingHoursPanelProps) {
  const uid = useId();
  const { t } = useLang();

  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [editStates, setEditStates] = useState<Record<string, ScheduleEditState>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');

  // Create form state
  const [showCreate, setShowCreate] = useState(false);
  const [createStart, setCreateStart] = useState('');
  const [createEnd, setCreateEnd] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const conflictText = (c: Schedule) =>
    c.endDate
      ? t.workingHours.overlapWith.replace(
          '{range}',
          `${formatDate(c.startDate)} – ${formatDate(c.endDate)}`,
        )
      : t.workingHours.overlapOpenEnded.replace('{date}', formatDate(c.startDate));

  // ---- Validation ----
  const validateSlots = (hours: HourRange[]): string | null => {
    for (const h of hours) {
      if (h.startTime >= h.endTime) return t.workingHours.slotEndBeforeStart;
    }
    const seen = new Set<string>();
    for (const h of hours) {
      const key = `${h.startTime}-${h.endTime}`;
      if (seen.has(key)) return t.workingHours.slotDuplicate;
      seen.add(key);
    }
    const sorted = [...hours].sort((a, b) => a.startTime.localeCompare(b.startTime));
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].startTime < sorted[i - 1].endTime) return t.workingHours.slotOverlap;
    }
    return null;
  };

  // ---- Load ----
  useEffect(() => {
    setLoading(true);
    setPageError('');
    api
      .getSchedules()
      .then((list) => {
        setSchedules(list);
        const states: Record<string, ScheduleEditState> = {};
        for (const s of list) states[s.id] = makeEditState(s);
        setEditStates(states);
        if (list.length > 0) setExpandedId(list[0].id);
      })
      .catch(() => setPageError(t.workingHours.errorLoad))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Edit state helpers ----
  const updateEdit = (scheduleId: string, patch: Partial<ScheduleEditState>) => {
    setEditStates((prev) => ({
      ...prev,
      [scheduleId]: { ...prev[scheduleId], ...patch },
    }));
  };

  const updateDay = (scheduleId: string, day: DayOfWeek, patch: Partial<DayState>) => {
    setEditStates((prev) => {
      const cur = prev[scheduleId];
      const newDays = { ...cur.days, [day]: { ...cur.days[day], ...patch } };
      const newSlotErrors = { ...cur.slotErrors };
      if (patch.hours !== undefined) {
        const err = validateSlots(patch.hours);
        if (err) newSlotErrors[day] = err;
        else delete newSlotErrors[day];
      }
      return { ...prev, [scheduleId]: { ...cur, days: newDays, slotErrors: newSlotErrors } };
    });
  };

  // ---- Day actions ----
  const toggleDay = (scheduleId: string, day: DayOfWeek) => {
    const cur = editStates[scheduleId];
    const wasOpen = cur.days[day].isOpen;
    const hours =
      !wasOpen && cur.days[day].hours.length === 0
        ? [{ startTime: '09:00', endTime: '17:00' }]
        : cur.days[day].hours;
    updateDay(scheduleId, day, { isOpen: !wasOpen, hours });
  };

  const updateHour = (
    scheduleId: string,
    day: DayOfWeek,
    idx: number,
    field: 'startTime' | 'endTime',
    value: string,
  ) => {
    const hours = [...editStates[scheduleId].days[day].hours];
    hours[idx] = { ...hours[idx], [field]: value };
    updateDay(scheduleId, day, { hours });
  };

  const addSlot = (scheduleId: string, day: DayOfWeek) => {
    const hours = [
      ...editStates[scheduleId].days[day].hours,
      { startTime: '09:00', endTime: '17:00' },
    ];
    updateDay(scheduleId, day, { hours });
  };

  const removeSlot = (scheduleId: string, day: DayOfWeek, idx: number) => {
    const hours = editStates[scheduleId].days[day].hours.filter((_, i) => i !== idx);
    updateDay(scheduleId, day, { hours });
  };

  // ---- Save schedule (date range + days, one action) ----
  const handleSaveSchedule = async (scheduleId: string) => {
    const state = editStates[scheduleId];
    if (state.saving) return;

    const allErrors: Partial<Record<DayOfWeek, string>> = {};
    for (const day of DAY_ORDER) {
      if (state.days[day].isOpen) {
        const err = validateSlots(state.days[day].hours);
        if (err) allErrors[day] = err;
      }
    }
    if (Object.keys(allErrors).length > 0) {
      updateEdit(scheduleId, { slotErrors: allErrors });
      return;
    }

    // Editing an active schedule's dates must not overlap another active one
    // (the API enforces this too; checking here gives the message instantly).
    const current = schedules.find((s) => s.id === scheduleId);
    const datesChanged =
      !!current &&
      (state.startDate !== current.startDate.slice(0, 10) ||
        state.endDate !== (current.endDate ? current.endDate.slice(0, 10) : ''));
    if (current?.isActive && datesChanged) {
      const conflict = findOverlap(schedules, state.startDate, state.endDate, scheduleId);
      if (conflict) {
        updateEdit(scheduleId, { error: conflictText(conflict), success: '' });
        return;
      }
    }

    updateEdit(scheduleId, { saving: true, error: '', success: '' });
    try {
      await api.updateSchedule(scheduleId, {
        startDate: state.startDate,
        endDate: state.endDate || null,
      });
      const updated = await api.upsertDays(scheduleId, {
        days: DAY_ORDER.map((d) => ({
          day: d,
          isOpen: state.days[d].isOpen,
          hours: state.days[d].hours,
        })),
      });
      if (updated) {
        setSchedules((prev) => prev.map((s) => (s.id === scheduleId ? updated : s)));
      }
      updateEdit(scheduleId, { saving: false, success: t.workingHours.successSave });
    } catch (err: unknown) {
      updateEdit(scheduleId, { saving: false, error: apiErrorMessage(err, t.workingHours.errorSave) });
    }
  };

  const handleToggleActive = async (schedule: Schedule) => {
    updateEdit(schedule.id, { saving: true, error: '', success: '' });
    try {
      const updated = await api.updateSchedule(schedule.id, { isActive: !schedule.isActive });
      setSchedules((prev) => prev.map((s) => (s.id === schedule.id ? updated : s)));
      updateEdit(schedule.id, { saving: false, success: '' });
    } catch (err: unknown) {
      updateEdit(schedule.id, { saving: false, error: apiErrorMessage(err, t.workingHours.errorSave) });
    }
  };

  // ---- Delete schedule ----
  const handleDelete = async (scheduleId: string) => {
    updateEdit(scheduleId, { deleting: true, error: '' });
    try {
      await api.deleteSchedule(scheduleId);
      setSchedules((prev) => prev.filter((s) => s.id !== scheduleId));
      setEditStates((prev) => {
        const next = { ...prev };
        delete next[scheduleId];
        return next;
      });
      if (expandedId === scheduleId) setExpandedId(null);
    } catch {
      updateEdit(scheduleId, { deleting: false, confirmDelete: false, error: t.workingHours.errorDelete });
    }
  };

  // ---- Create schedule ----
  const handleCreate = async () => {
    if (!createStart || creating) return;
    setCreating(true);
    setCreateError('');
    try {
const dto: CreateScheduleDto = {
  startDate: createStart,
  ...(createEnd ? { endDate: createEnd } : {}),
};
const created = await api.createSchedule(dto);
      setSchedules((prev) => [created, ...prev]);
      setEditStates((prev) => ({ ...prev, [created.id]: makeEditState(created) }));
      setExpandedId(created.id);
      setShowCreate(false);
      setCreateStart('');
      setCreateEnd('');
    } catch (err: unknown) {
      setCreateError(apiErrorMessage(err, t.workingHours.errorCreate));
    } finally {
      setCreating(false);
    }
  };

  // ---- Derived: overlap warning for the create form + open-ended notice ----
  const createConflict =
    showCreate && createStart ? findOverlap(schedules, createStart, createEnd) : undefined;
  const openEnded = schedules.find((s) => s.isActive && !s.endDate);

  // ---- Render ----
  if (loading) {
    return (
      <div className="working-hours">
        <div className="spinner-wrap">
          <div className="spinner spinner--lg" />
        </div>
      </div>
    );
  }

  return (
    <section className="working-hours">
      <div className="page-header">
        <h2 className="t-subheading">{title ?? t.workingHours.title}</h2>
        {isOwner && (
          <button
            className="btn btn--sm"
            onClick={() => {
              setShowCreate((v) => !v);
              setCreateError('');
            }}
          >
            {t.workingHours.newSchedule}
          </button>
        )}
      </div>

      {pageError && <Alert variant="danger">{pageError}</Alert>}

      <p className="t-body-sm t-muted">{t.workingHours.ruleNote}</p>

      {isOwner && openEnded && (
        <Alert
          variant="warning"
          actions={
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              onClick={() => setExpandedId(openEnded.id)}
            >
              {t.workingHours.setEndDate}
            </button>
          }
        >
          {t.workingHours.openEndedNotice.replace(
            '{range}',
            `${t.workingHours.from} ${formatDate(openEnded.startDate)} — ${t.workingHours.ongoing}`,
          )}
        </Alert>
      )}

      {/* Create form */}
      {showCreate && (
        <div className="card">
          <h3 className="card__title">{t.workingHours.newSchedule}</h3>
          <div className="working-hours__dates">
            <div className="field">
              <label className="field__label" htmlFor={`${uid}-create-start`}>{t.workingHours.startDate}</label>
              <input id={`${uid}-create-start`} className="input"
                type="date"
                value={createStart}
                onChange={(e) => setCreateStart(e.target.value)}
              />
            </div>
            <div className="field">
              <label className="field__label" htmlFor={`${uid}-create-end`}>{t.workingHours.endDate}</label>
              <input id={`${uid}-create-end`} className="input"
                type="date"
                value={createEnd}
                onChange={(e) => setCreateEnd(e.target.value)}
              />
            </div>
          </div>
          {createConflict && (
            <Alert variant="danger">{conflictText(createConflict)}</Alert>
          )}
          {createError && <Alert variant="danger">{createError}</Alert>}
          <div className="cluster">
            <button
              className={`btn${creating ? ' is-loading' : ''}`}
              onClick={handleCreate}
              aria-busy={creating}
              disabled={!createStart || !!createConflict}
            >
              {t.workingHours.createSchedule}
            </button>
            <button
              className="btn btn--ghost"
              onClick={() => {
                setShowCreate(false);
                setCreateError('');
              }}
            >
              {t.workingHours.cancel}
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {schedules.length === 0 && !showCreate && (
        <div className="empty empty--sm">
          <p className="empty__text">{t.workingHours.noSchedules}</p>
        </div>
      )}

      {/* Schedule list */}
      {schedules.map((schedule) => {
        const state = editStates[schedule.id];
        if (!state) return null;
        const isExpanded = expandedId === schedule.id;
        const hasErrors = Object.keys(state.slotErrors).length > 0;
        const status = scheduleStatus(schedule);

        return (
          <div key={schedule.id} className="card card--flush">
            {/* Header — role="button" (not a real <button>) since it wraps the
                nested active/inactive toggle button; buttons can't contain buttons. */}
            <div
              className="card__toggle"
              role="button"
              tabIndex={0}
              aria-expanded={isExpanded}
              onClick={() => setExpandedId(isExpanded ? null : schedule.id)}
              onKeyDown={handleActivateKeyDown(() => setExpandedId(isExpanded ? null : schedule.id))}
            >
              <div className="working-hours__range">
                <span className={`badge ${STATUS_BADGE[status]}`}>
                  {
                    {
                      current: t.workingHours.statusCurrent,
                      upcoming: t.workingHours.statusUpcoming,
                      ended: t.workingHours.statusEnded,
                    }[status]
                  }
                </span>
                <span className="t-body-sm">
                  <strong>{t.workingHours.from} {formatDate(schedule.startDate)}</strong>
                  {schedule.endDate ? (
                    <>
                      {' '}
                      <span className="t-muted">{t.workingHours.to}</span>{' '}
                      <strong>{formatDate(schedule.endDate)}</strong>
                    </>
                  ) : (
                    <>
                      {' '}— <span className="t-muted">{t.workingHours.ongoing}</span>
                    </>
                  )}
                </span>
              </div>
              {isOwner ? (
                <span
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                >
                  <Switch
                    checked={schedule.isActive}
                    onChange={() => handleToggleActive(schedule)}
                    disabled={editStates[schedule.id]?.saving}
                    label={schedule.isActive ? t.workingHours.open : t.workingHours.closed}
                  />
                </span>
              ) : (
                <span className={`badge ${schedule.isActive ? 'badge--success' : 'badge--neutral'}`}>
                  {schedule.isActive ? t.workingHours.open : t.workingHours.closed}
                </span>
              )}
              <FontAwesomeIcon icon={faChevronDown} className="card__chevron" aria-hidden="true" />
            </div>

            {/* Body */}
            {isExpanded && (
              <>
                {/* Actions — Save + Delete, at the top of the schedule */}
                {isOwner && (
                  <div className="card__section">
                    <div className="cluster">
                      <button
                        className={`btn${state.saving ? ' is-loading' : ''}`}
                        onClick={() => handleSaveSchedule(schedule.id)}
                        aria-busy={state.saving}
                        disabled={hasErrors}
                      >
                        {t.workingHours.saveDays}
                      </button>
                      <button
                        className={`btn btn--danger-outline${state.deleting ? ' is-loading' : ''}`}
                        onClick={() => updateEdit(schedule.id, { confirmDelete: true })}
                        aria-busy={state.deleting}
                      >
                        {t.workingHours.deleteSchedule}
                      </button>
                    </div>
                    {state.confirmDelete && (
                      <ConfirmDialog
                        tone="danger"
                        title={t.workingHours.deleteScheduleTitle}
                        message={t.workingHours.deleteScheduleMessage}
                        confirmLabel={t.workingHours.deleteScheduleConfirmButton}
                        cancelLabel={t.workingHours.cancel}
                        busy={state.deleting}
                        onConfirm={() => handleDelete(schedule.id)}
                        onCancel={() => updateEdit(schedule.id, { confirmDelete: false })}
                      />
                    )}
                  </div>
                )}

                {(state.error || state.success) && (
                  <div className="card__section">
                    {state.error && <Alert variant="danger">{state.error}</Alert>}
                    {state.success && <Alert variant="success">{state.success}</Alert>}
                  </div>
                )}
                {isOwner && (
                  <div className="card__section">
                    <div className="working-hours__dates">
                      <div className="field">
                        <label className="field__label" htmlFor={`${uid}-${schedule.id}-start`}>{t.workingHours.startDate}</label>
                        <input id={`${uid}-${schedule.id}-start`} className="input"
                          type="date"
                          value={state.startDate}
                          onChange={(e) => updateEdit(schedule.id, { startDate: e.target.value })}
                        />
                      </div>
                      <div className="field">
                        <label className="field__label" htmlFor={`${uid}-${schedule.id}-end`}>{t.workingHours.endDate}</label>
                        <input id={`${uid}-${schedule.id}-end`} className="input"
                          type="date"
                          value={state.endDate}
                          onChange={(e) => updateEdit(schedule.id, { endDate: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Day rows */}
                {DAY_ORDER.map((day) => {
                  const dayState = state.days[day];
                  const slotErr = state.slotErrors[day];
                  return (
                    <div key={day} className="card__section">
                      <div className="setting-row">
                        <span className="setting-row__title">{t.workingHours.days[day]}</span>
                        <div className="cluster cluster--tight">
                          <span className={`badge ${dayState.isOpen ? 'badge--success' : 'badge--neutral'}`}>
                            {dayState.isOpen ? t.workingHours.open : t.workingHours.closed}
                          </span>
                          <Switch
                            checked={dayState.isOpen}
                            onChange={() => toggleDay(schedule.id, day)}
                            disabled={!isOwner}
                            label={t.workingHours.days[day]}
                          />
                        </div>
                      </div>

                      {dayState.isOpen && (
                        <div className="working-hours__slots">
                          {dayState.hours.map((slot, idx) => (
                            <div key={idx} className="working-hours__slot">
                              <input className="input"
                                type="time"
                                aria-label={`${t.workingHours.days[day]} ${t.workingHours.from}`}
                                value={slot.startTime}
                                onChange={(e) =>
                                  updateHour(schedule.id, day, idx, 'startTime', e.target.value)
                                }
                                disabled={!isOwner}
                              />
                              <span className="t-muted" aria-hidden="true">–</span>
                              <input className="input"
                                type="time"
                                aria-label={`${t.workingHours.days[day]} ${t.workingHours.to}`}
                                value={slot.endTime}
                                onChange={(e) =>
                                  updateHour(schedule.id, day, idx, 'endTime', e.target.value)
                                }
                                disabled={!isOwner}
                              />
                              {isOwner && (
                                <button
                                  type="button"
                                  className="btn btn--ghost btn--icon btn--sm"
                                  onClick={() => removeSlot(schedule.id, day, idx)}
                                  aria-label={t.workingHours.removeSlot}
                                >
                                  <FontAwesomeIcon icon={faXmark} aria-hidden="true" />
                                </button>
                              )}
                            </div>
                          ))}
                          {slotErr && <p className="field__error">{slotErr}</p>}
                          {isOwner && (
                            <button
                              type="button"
                              className="btn btn--ghost btn--sm"
                              onClick={() => addSlot(schedule.id, day)}
                            >
                              {t.workingHours.addSlot}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            )}
          </div>
        );
      })}
    </section>
  );
}
