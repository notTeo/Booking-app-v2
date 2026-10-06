import { useEffect, useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faXmark } from '@fortawesome/free-solid-svg-icons';
import { useLang } from '../context/LanguageContext';
import { createTimeOff, deleteTimeOff, getTimeOff, type TimeOff } from '../api/timeOff.api';
import { apiErrorMessage } from '../utils/apiError';
import { todayStr } from '../utils/scheduleOverlap';
import Switch from './Switch';
import Alert from './Alert';
import ConfirmDialog from './ConfirmDialog';
import '../styles/pages/working-hours.css';

export interface TimeOffPanelProps {
  shopId: string;
  /** The team member whose time off this is; leave out for the whole shop. */
  memberId?: string;
  canManage: boolean;
  /** The shop's calendar page, linked from the "bookings already there" warning. */
  calendarPath: string;
}

const dateOf = (iso: string) => iso.slice(0, 10);

export default function TimeOffPanel({ shopId, memberId, canManage, calendarPath }: TimeOffPanelProps) {
  const uid = useId();
  const { t, language } = useLang();
  const tt = t.timeOff;

  const [entries, setEntries] = useState<TimeOff[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [showPast, setShowPast] = useState(false);

  // Add form
  const [showCreate, setShowCreate] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [allDay, setAllDay] = useState(true);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [createError, setCreateError] = useState('');
  // Bookings that were already inside the entry just saved.
  const [affected, setAffected] = useState<{ count: number; date: string } | null>(null);

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setLoading(true);
    setPageError('');
    getTimeOff(shopId, memberId)
      .then(setEntries)
      .catch(() => setPageError(tt.errorLoad))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId, memberId]);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(language, {
      timeZone: 'UTC',
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

  const lastDay = endDate || startDate;
  const formError =
    startDate && lastDay < startDate
      ? tt.endBeforeStart
      : !allDay && startTime && endTime && startTime >= endTime
        ? tt.timeEndBeforeStart
        : '';
  const canSave = !!startDate && !formError && (allDay || (!!startTime && !!endTime));

  const resetForm = () => {
    setShowCreate(false);
    setStartDate('');
    setEndDate('');
    setAllDay(true);
    setNote('');
    setCreateError('');
  };

  const handleCreate = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    setCreateError('');
    setAffected(null);
    try {
      const { affectedBookings, ...created } = await createTimeOff(shopId, {
        staffId: memberId ?? null,
        startDate,
        endDate: lastDay,
        ...(!allDay && { startTime, endTime }),
        ...(note.trim() && { note: note.trim() }),
      });
      setEntries((prev) =>
        [...prev, created].sort((a, b) => a.startDate.localeCompare(b.startDate)),
      );
      if (affectedBookings > 0) setAffected({ count: affectedBookings, date: startDate });
      resetForm();
    } catch (err: unknown) {
      setCreateError(apiErrorMessage(err, tt.errorSave));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(true);
    setPageError('');
    try {
      await deleteTimeOff(shopId, id);
      setEntries((prev) => prev.filter((e) => e.id !== id));
    } catch (err: unknown) {
      setPageError(apiErrorMessage(err, tt.errorDelete));
    } finally {
      setDeleting(false);
      setConfirmDeleteId(null);
    }
  };

  if (loading) {
    return (
      <div className="working-hours">
        <div className="spinner-wrap">
          <div className="spinner spinner--lg" />
        </div>
      </div>
    );
  }

  const today = todayStr();
  const past = entries.filter((e) => dateOf(e.endDate) < today);
  const visible = showPast ? entries : entries.filter((e) => dateOf(e.endDate) >= today);

  return (
    <section className="working-hours">
      <div className="page-header">
        <h2 className="t-subheading">{memberId ? tt.title : tt.shopTitle}</h2>
        {canManage && (
          <button
            className="btn btn--sm"
            onClick={() => {
              setShowCreate((v) => !v);
              setCreateError('');
            }}
          >
            <FontAwesomeIcon icon={faPlus} aria-hidden="true" />
            {tt.add}
          </button>
        )}
      </div>

      <p className="t-body-sm t-muted">{memberId ? tt.hint : tt.shopHint}</p>

      {pageError && <Alert variant="danger">{pageError}</Alert>}

      {affected && (
        <Alert
          variant="warning"
          actions={
            <Link className="btn btn--secondary btn--sm" to={`${calendarPath}?date=${affected.date}`}>
              {tt.viewCalendar}
            </Link>
          }
        >
          {affected.count === 1
            ? tt.affectedOne
            : tt.affectedMany.replace('{count}', String(affected.count))}
        </Alert>
      )}

      {showCreate && (
        <div className="card">
          <h3 className="card__title">{tt.add}</h3>
          <div className="working-hours__dates">
            <div className="field">
              <label className="field__label" htmlFor={`${uid}-start`}>{tt.firstDay}</label>
              <input
                id={`${uid}-start`}
                className="input"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="field">
              <label className="field__label" htmlFor={`${uid}-end`}>{tt.lastDay}</label>
              <input
                id={`${uid}-end`}
                className="input"
                type="date"
                min={startDate || undefined}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="setting-row">
            <label className="setting-row__title" htmlFor={`${uid}-all-day`}>{tt.allDay}</label>
            <Switch id={`${uid}-all-day`} checked={allDay} onChange={setAllDay} />
          </div>

          {!allDay && (
            <div className="working-hours__slot">
              <input
                className="input"
                type="time"
                aria-label={tt.startTime}
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
              <span className="t-muted" aria-hidden="true">–</span>
              <input
                className="input"
                type="time"
                aria-label={tt.endTime}
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          )}

          <div className="field">
            <label className="field__label" htmlFor={`${uid}-note`}>{tt.note}</label>
            <input
              id={`${uid}-note`}
              className="input"
              type="text"
              maxLength={200}
              placeholder={memberId ? tt.notePlaceholder : tt.shopNotePlaceholder}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          {formError && <p className="field__error">{formError}</p>}
          {createError && <Alert variant="danger">{createError}</Alert>}
          <div className="cluster">
            <button
              className={`btn${saving ? ' is-loading' : ''}`}
              onClick={handleCreate}
              aria-busy={saving}
              disabled={!canSave}
            >
              {tt.save}
            </button>
            <button className="btn btn--ghost" onClick={resetForm}>
              {tt.cancel}
            </button>
          </div>
        </div>
      )}

      {visible.length === 0 && !showCreate && (
        <div className="empty empty--sm">
          <p className="empty__text">{memberId ? tt.empty : tt.shopEmpty}</p>
        </div>
      )}

      {visible.length > 0 && (
        <div className="card">
          <ul className="list">
            {visible.map((entry) => {
              const shopWide = entry.staffId === null;
              const single = dateOf(entry.startDate) === dateOf(entry.endDate);
              return (
                <li key={entry.id} className="list__item">
                  <div className="working-hours__range">
                    <strong>
                      {formatDate(entry.startDate)}
                      {!single && ` – ${formatDate(entry.endDate)}`}
                    </strong>
                    <span className="t-muted">
                      {entry.startTime && entry.endTime
                        ? `${entry.startTime} – ${entry.endTime}`
                        : tt.allDay}
                      {entry.note && ` · ${entry.note}`}
                    </span>
                  </div>
                  <div className="cluster cluster--tight cluster--nowrap">
                    {memberId && shopWide && <span className="badge badge--neutral">{tt.wholeShop}</span>}
                    {/* On a member's page the shop-wide entries are read-only: they are managed in the shop settings. */}
                    {canManage && !(memberId && shopWide) && (
                      <button
                        type="button"
                        className="btn btn--ghost btn--icon btn--sm"
                        aria-label={tt.remove}
                        title={tt.remove}
                        onClick={() => setConfirmDeleteId(entry.id)}
                      >
                        <FontAwesomeIcon icon={faXmark} aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {past.length > 0 && (
        <div className="cluster">
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setShowPast((v) => !v)}>
            {showPast ? tt.hidePast : tt.showPast.replace('{count}', String(past.length))}
          </button>
        </div>
      )}

      {confirmDeleteId && (
        <ConfirmDialog
          title={tt.removeTitle}
          message={tt.removeMessage}
          confirmLabel={tt.remove}
          cancelLabel={tt.cancel}
          tone="danger"
          busy={deleting}
          onConfirm={() => handleDelete(confirmDeleteId)}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}
    </section>
  );
}
