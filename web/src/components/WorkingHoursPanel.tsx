import { useEffect, useState } from 'react';
import { useLang } from '../context/LanguageContext';
import {
  type DayOfWeek,
  type HourRange,
  type Schedule,
  type CreateScheduleDto,
  type UpsertDaysDto,
} from '../api/workingHours.api';
import '../styles/pages/working-hours.css';

// API bundle — callers build this with the correct shopId / memberId baked in
export interface WorkingHoursApi {
  getSchedules: () => Promise<Schedule[]>;
  createSchedule: (dto: CreateScheduleDto) => Promise<Schedule>;
  deleteSchedule: (scheduleId: string) => Promise<unknown>;
  upsertDays: (scheduleId: string, dto: UpsertDaysDto) => Promise<Schedule | null | undefined>;
}

export interface WorkingHoursPanelProps {
  api: WorkingHoursApi;
  isOwner: boolean;
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

export default function WorkingHoursPanel({ api, isOwner }: WorkingHoursPanelProps) {
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

  // ---- Save days ----
  const handleSaveDays = async (scheduleId: string) => {
    const state = editStates[scheduleId];

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

    updateEdit(scheduleId, { saving: true, error: '', success: '' });
    try {
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
    } catch {
      updateEdit(scheduleId, { saving: false, error: t.workingHours.errorSave });
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
      updateEdit(scheduleId, { deleting: false, error: t.workingHours.errorDelete });
    }
  };

  // ---- Create schedule ----
  const handleCreate = async () => {
    if (!createStart) return;
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
    } catch {
      setCreateError(t.workingHours.errorCreate);
    } finally {
      setCreating(false);
    }
  };

  // ---- Render ----
  if (loading) {
    return (
      <div className="working-hours-page">
        <div className="shops-spinner-wrap">
          <div className="spinner" />
        </div>
      </div>
    );
  }

  return (
    <div className="working-hours-page">
      <div className="working-hours-header">
        <h1>{t.workingHours.title}</h1>
        {isOwner && (
          <button
            className="btn btn-primary"
            onClick={() => {
              setShowCreate((v) => !v);
              setCreateError('');
            }}
          >
            {t.workingHours.newSchedule}
          </button>
        )}
      </div>

      {pageError && <div className="alert alert-error">{pageError}</div>}

      {/* Create form */}
      {showCreate && (
        <div className="wh-create-form">
          <h3>{t.workingHours.newSchedule}</h3>
          <div className="wh-create-fields">
            <div className="form-group">
              <label>{t.workingHours.startDate}</label>
              <input
                type="date"
                value={createStart}
                onChange={(e) => setCreateStart(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>{t.workingHours.endDate}</label>
              <input
                type="date"
                value={createEnd}
                onChange={(e) => setCreateEnd(e.target.value)}
              />
            </div>
          </div>
          {createError && <div className="alert alert-error">{createError}</div>}
          <div className="wh-create-actions">
            <button
              className="btn btn-primary"
              onClick={handleCreate}
              disabled={creating || !createStart}
            >
              {creating ? t.workingHours.creating : t.workingHours.createSchedule}
            </button>
            <button
              className="btn btn-ghost"
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
        <p className="wh-empty">{t.workingHours.noSchedules}</p>
      )}

      {/* Schedule list */}
      {schedules.map((schedule) => {
        const state = editStates[schedule.id];
        if (!state) return null;
        const isExpanded = expandedId === schedule.id;
        const hasErrors = Object.keys(state.slotErrors).length > 0;

        return (
          <div key={schedule.id} className="wh-schedule-card">
            {/* Header */}
            <div
              className="wh-schedule-header"
              onClick={() => setExpandedId(isExpanded ? null : schedule.id)}
            >
              <div className="wh-date-range">
                {t.workingHours.from} {formatDate(schedule.startDate)}
                {schedule.endDate ? (
                  <>
                    {' '}
                    <span>{t.workingHours.to}</span> {formatDate(schedule.endDate)}
                  </>
                ) : (
                  <>
                    {' '}— <span>{t.workingHours.ongoing}</span>
                  </>
                )}
              </div>
              <span className={`wh-active-badge ${schedule.isActive ? 'active' : 'inactive'}`}>
                {schedule.isActive ? t.workingHours.open : t.workingHours.closed}
              </span>
              <span className={`wh-chevron ${isExpanded ? 'open' : ''}`}>▼</span>
            </div>

            {/* Body */}
            {isExpanded && (
              <div className="wh-schedule-body">
                {state.error && (
                  <div className="alert alert-error wh-schedule-alert">{state.error}</div>
                )}
                {state.success && (
                  <div className="alert alert-success wh-schedule-alert">{state.success}</div>
                )}
                    {isOwner && (
                    <div className="wh-create-fields">
                      <div className="form-group">
                        <label>{t.workingHours.startDate}</label>
                        <input
                          type="date"
                          value={state.startDate}
                          onChange={(e) => updateEdit(schedule.id, { startDate: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label>{t.workingHours.endDate}</label>
                        <input
                          type="date"
                          value={state.endDate}
                          onChange={(e) => updateEdit(schedule.id, { endDate: e.target.value })}
                        />
                      </div>
                    </div>
                  )}

                {/* Day rows */}
                <div
                  className="working-hours-card"
                  style={{ borderRadius: 0, border: 'none', marginBottom: 0 }}
                >
                  {DAY_ORDER.map((day) => {
                    const dayState = state.days[day];
                    const slotErr = state.slotErrors[day];
                    return (
                      <div key={day} className="working-hours-row">
                        <div className="working-hours-day-label">{t.workingHours.days[day]}</div>

                        <div className="working-hours-toggle">
                          <label className="working-hours-switch">
                            <input
                              type="checkbox"
                              checked={dayState.isOpen}
                              onChange={() => toggleDay(schedule.id, day)}
                              disabled={!isOwner}
                            />
                            <span className="working-hours-slider" />
                          </label>
                          <span
                            className={`working-hours-status ${dayState.isOpen ? 'open' : 'closed'}`}
                          >
                            {dayState.isOpen ? t.workingHours.open : t.workingHours.closed}
                          </span>
                        </div>

                        {dayState.isOpen && (
                          <div className="working-hours-slots">
                            {dayState.hours.map((slot, idx) => (
                              <div key={idx} className="working-hours-slot">
                                <input
                                  type="time"
                                  value={slot.startTime}
                                  onChange={(e) =>
                                    updateHour(schedule.id, day, idx, 'startTime', e.target.value)
                                  }
                                  disabled={!isOwner}
                                />
                                <span className="working-hours-sep">–</span>
                                <input
                                  type="time"
                                  value={slot.endTime}
                                  onChange={(e) =>
                                    updateHour(schedule.id, day, idx, 'endTime', e.target.value)
                                  }
                                  disabled={!isOwner}
                                />
                                {isOwner && (
                                  <button
                                    type="button"
                                    className="working-hours-remove"
                                    onClick={() => removeSlot(schedule.id, day, idx)}
                                    aria-label={t.workingHours.removeSlot}
                                  >
                                    ×
                                  </button>
                                )}
                              </div>
                            ))}
                            {slotErr && <p className="wh-slot-error">{slotErr}</p>}
                            {isOwner && (
                              <button
                                type="button"
                                className="working-hours-add-slot"
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
                </div>

                {/* Footer */}
                {isOwner && (
                  <div className="wh-schedule-footer">
                    <div>
                      {!state.confirmDelete ? (
                        <button
                          className="btn btn-danger"
                          onClick={() => updateEdit(schedule.id, { confirmDelete: true })}
                          disabled={state.deleting}
                        >
                          {state.deleting
                            ? t.workingHours.deleting
                            : t.workingHours.deleteSchedule}
                        </button>
                      ) : (
                        <div className="wh-delete-confirm">
                          <span className="wh-delete-confirm-text">
                            {t.workingHours.confirmDelete}
                          </span>
                          <button
                            className="btn btn-danger"
                            onClick={() => handleDelete(schedule.id)}
                            disabled={state.deleting}
                          >
                            {state.deleting
                              ? t.workingHours.deleting
                              : t.workingHours.deleteSchedule}
                          </button>
                          <button
                            className="btn btn-ghost"
                            onClick={() => updateEdit(schedule.id, { confirmDelete: false })}
                          >
                            {t.workingHours.cancel}
                          </button>
                        </div>
                      )}
                    </div>

                    <button
                      className="btn btn-primary"
                      onClick={() => handleSaveDays(schedule.id)}
                      disabled={state.saving || hasErrors}
                    >
                      {state.saving ? t.workingHours.saving : t.workingHours.saveDays}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
