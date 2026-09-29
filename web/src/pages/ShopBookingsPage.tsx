import { formatTimeInZone, minutesOfDayInZone, shiftDate, todayInZone } from '../utils/shopTime';
import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark, faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { useShop } from '../context/ShopContext';
import { useLang } from '../context/LanguageContext';
import {
  listBookings,
  updateBookingStatus,
  deleteBooking,
  type Booking,
  type BookingStatus,
} from '../api/booking.api';
import { getMembers, type TeamMember } from '../api/team.api';
import { getDaySchedule, type DaySchedule } from '../api/workingHours.api';
import OwnerBookingWizard from '../components/booking-wizard/OwnerBookingWizard';
import { blockGeometry, computeVisibleRange, offSegments, overrideTags, type OverrideTag } from './calendarModel';
import '../styles/pages/bookings.css';

// ── constants ────────────────────────────────────────────────────────────────

const SLOT_H      = 64;                           // px per hour
const PX_PER_MIN  = SLOT_H / 60;
const MIN_BLOCK_H = 28;                           // minimum block height px
const OTHER_COLUMN_ID = '__other__';

const ALL_STATUSES: BookingStatus[] = ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELED', 'NO_SHOW'];

// ── helpers ──────────────────────────────────────────────────────────────────

const formatDuration = (mins: number) => {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
};

const toHHMM = (mins: number) => {
  const h = Math.floor(mins / 60).toString().padStart(2, '0');
  const m = (mins % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
};

interface CreatingSlot {
  staffId: string;
  timeHint: string;
  showOutside: boolean;
}

// ── component ────────────────────────────────────────────────────────────────

export default function ShopBookingsPage() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const { shop, isLoading: shopLoading } = useShop();
  const { t } = useLang();
  const isOwner = shop?.role === 'owner';

  const [bookings, setBookings]               = useState<Booking[]>([]);
  const [members, setMembers]                 = useState<TeamMember[]>([]);
  const [daySchedule, setDaySchedule]         = useState<DaySchedule | null>(null);
  const [loading, setLoading]                 = useState(true);
  const [error, setError]                     = useState('');
  // The calendar day is a shop-local date. Until the user picks one it follows
  // "today" in the SHOP's timezone (not the browser's).
  const zone = shop?.timezone ?? 'UTC';
  const [dateOverride, setDateOverride]       = useState<string | null>(searchParams.get('date'));
  const date = dateOverride ?? todayInZone(zone);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [creatingSlot, setCreatingSlot]       = useState<CreatingSlot | null>(null);
  const [updatingId, setUpdatingId]           = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting]               = useState(false);

  // Latest-request-wins: a slow response for a day the user has already left
  // (or the duplicate effect run in StrictMode) must never replace the bookings
  // of the day now on screen.
  const requestSeq = useRef(0);

  const refetchBookings = () => {
    if (!shop) return;
    const seq = ++requestSeq.current;
    setLoading(true);
    setError('');
    listBookings(shop.id, { date })
      .then((bkgs) => { if (seq === requestSeq.current) setBookings(bkgs); })
      .catch(() => { if (seq === requestSeq.current) setError(t.bookings.errorLoad); })
      .finally(() => { if (seq === requestSeq.current) setLoading(false); });
  };

  useEffect(() => {
    if (!shop) return;
    const seq = ++requestSeq.current;
    setLoading(true);
    setError('');
    const membersPromise = members.length > 0
      ? Promise.resolve(members)
      : getMembers(shop.id);
    Promise.all([listBookings(shop.id, { date }), membersPromise, getDaySchedule(shop.id, date)])
      .then(([bkgs, mems, schedule]) => {
        if (seq !== requestSeq.current) return;
        setBookings(bkgs);
        if (members.length === 0) setMembers(mems);
        setDaySchedule(schedule);
      })
      .catch(() => { if (seq === requestSeq.current) setError(t.bookings.errorLoad); })
      .finally(() => { if (seq === requestSeq.current) setLoading(false); });
  }, [shop?.id, date]);

  // keep selected booking in sync after status updates
  useEffect(() => {
    if (!selectedBooking) return;
    const updated = bookings.find(b => b.id === selectedBooking.id);
    if (updated) setSelectedBooking(updated);
  }, [bookings]);

  const handleStatusUpdate = async (bookingId: string, status: BookingStatus) => {
    if (!shop) return;
    setUpdatingId(bookingId);
    try {
      const updated = await updateBookingStatus(shop.id, bookingId, status);
      setBookings(prev => prev.map(b => b.id === bookingId ? updated : b));
    } catch {
      // leave state unchanged on error
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (bookingId: string) => {
    if (!shop) return;
    setDeleting(true);
    try {
      await deleteBooking(shop.id, bookingId);
      setBookings(prev => prev.filter(b => b.id !== bookingId));
      if (selectedBooking?.id === bookingId) setSelectedBooking(null);
      setConfirmDeleteId(null);
    } catch {
      setConfirmDeleteId(null);
    } finally {
      setDeleting(false);
    }
  };

  const openBookingDetail = (b: Booking, isSelected: boolean) => {
    setSelectedBooking(isSelected ? null : b);
    setConfirmDeleteId(null);
    setCreatingSlot(null);
  };

  const openCreateSlot = (staffId: string, timeHint: string, showOutside: boolean) => {
    setCreatingSlot({ staffId, timeHint, showOutside });
    setSelectedBooking(null);
    setConfirmDeleteId(null);
  };

  // ── derived ──────────────────────────────────────────────────────────────

  const memberIds = new Set(members.map(m => m.id));
  const hasOtherBookings = bookings.some(b => !memberIds.has(b.staffId));

  const columns = [
    ...members.map(m => ({ id: m.id, label: m.name, isOther: false })),
    ...(hasOtherBookings ? [{ id: OTHER_COLUMN_ID, label: t.bookings.calendar.otherColumn, isOther: true }] : []),
  ];

  const bookingsByStaff = bookings.reduce<Record<string, Booking[]>>((acc, b) => {
    const key = memberIds.has(b.staffId) ? b.staffId : OTHER_COLUMN_ID;
    acc[key] = [...(acc[key] ?? []), b];
    return acc;
  }, {});

  // Every booking's position in shop-local minutes, keyed by id — computed
  // once so the visible range, the blocks and the "outside range" banner all
  // agree on the same numbers.
  const bookingMinutes = new Map(
    bookings.map(b => {
      const startMin = minutesOfDayInZone(b.startTime, zone);
      const durationMin = (new Date(b.endTime).getTime() - new Date(b.startTime).getTime()) / 60_000;
      return [b.id, { startMin, durationMin }] as const;
    }),
  );

  const range = computeVisibleRange(
    daySchedule,
    [...bookingMinutes.values()].map(({ startMin, durationMin }) => ({ startMin, endMin: startMin + durationMin })),
  );
  const HOURS = Array.from({ length: (range.end - range.start) / 60 }, (_, i) => range.start / 60 + i);

  const geometryOf = (b: Booking) => {
    const { startMin, durationMin } = bookingMinutes.get(b.id)!;
    return blockGeometry(startMin, durationMin, range, PX_PER_MIN, MIN_BLOCK_H);
  };

  const outsideRangeCount = bookings.filter(b => geometryOf(b).outsideView).length;

  const tagLabel = (tag: OverrideTag) => t.bookings.calendar.tags[tag];

  // ── loading ───────────────────────────────────────────────────────────────

  if (shopLoading) {
    return (
      <div className="bookings-page">
        <div className="shops-spinner-wrap"><div className="spinner" /></div>
      </div>
    );
  }

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div className="bookings-page bookings-page--wide">

      {/* ── Header ── */}
      <div className="bookings-header">
        <h1>{t.bookings.title}</h1>
        <div className="bookings-date-nav">
          <button
            type="button"
            className="bookings-date-nav-btn"
            onClick={() => setDateOverride(shiftDate(date, -1))}
            aria-label="Previous day"
          >
            <FontAwesomeIcon icon={faChevronLeft} />
          </button>
          <label htmlFor="bookings-date" className="visually-hidden">
            {t.bookings.viewDateLabel}
          </label>
          <input
            id="bookings-date"
            type="date"
            className="bookings-date-picker"
            value={date}
            onChange={e => setDateOverride(e.target.value)}
          />
          <button
            type="button"
            className="bookings-date-nav-btn"
            onClick={() => setDateOverride(shiftDate(date, 1))}
            aria-label="Next day"
          >
            <FontAwesomeIcon icon={faChevronRight} />
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* ── Detail panel ── */}
      {creatingSlot ? (
        <div className="cal-detail-panel">
          <div className="cal-detail-header">
            <div className="cal-detail-title">{t.bookings.newBookingTitle}</div>
            <button
              className="cal-detail-close"
              onClick={() => setCreatingSlot(null)}
              aria-label={t.bookings.close}
            >
              <FontAwesomeIcon icon={faXmark} />
            </button>
          </div>
          {shop && slug && (
            <OwnerBookingWizard
              shopId={shop.id}
              slug={slug}
              initialMemberId={creatingSlot.staffId}
              initialDate={date}
              timeHint={creatingSlot.timeHint}
              defaultShowOutside={creatingSlot.showOutside}
              hideTitle
              onDone={() => { setCreatingSlot(null); refetchBookings(); }}
            />
          )}
        </div>
      ) : selectedBooking && (
        <div className="cal-detail-panel">
          <div className="cal-detail-header">
            <div className="cal-detail-title">
              {selectedBooking.customer.contactHidden ? t.customers.hiddenLabel : selectedBooking.customer.name}
            </div>
            <button
              className="cal-detail-close"
              onClick={() => { setSelectedBooking(null); setConfirmDeleteId(null); }}
              aria-label={t.bookings.close}
            >
              <FontAwesomeIcon icon={faXmark} />
            </button>
          </div>

          <div className="cal-detail-meta">
            <span>{selectedBooking.service.name}</span>
            <span className="cal-detail-sep">·</span>
            <span>{formatTimeInZone(selectedBooking.startTime, zone)}</span>
            <span className="cal-detail-sep">·</span>
            <span>{formatDuration(selectedBooking.service.duration)}</span>
          </div>

          {!selectedBooking.customer.contactHidden && (
            <div className="cal-detail-phone">{selectedBooking.customer.phone}</div>
          )}
          {selectedBooking.notes && (
            <div className="cal-detail-notes">{selectedBooking.notes}</div>
          )}

          <div className="cal-detail-statuses">
            {ALL_STATUSES.map(s => (
              <button
                key={s}
                className={[
                  'cal-status-btn',
                  `cal-status-btn--${s.toLowerCase()}`,
                  selectedBooking.status === s ? 'cal-status-btn--active' : '',
                ].join(' ').trim()}
                onClick={() => handleStatusUpdate(selectedBooking.id, s)}
                disabled={updatingId === selectedBooking.id}
              >
                {s.replace('_', ' ')}
              </button>
            ))}
          </div>

          {isOwner && (
            <div className="cal-detail-footer">
              {confirmDeleteId === selectedBooking.id ? (
                <>
                  <button
                    className="btn btn-danger service-action-btn"
                    onClick={() => handleDelete(selectedBooking.id)}
                    disabled={deleting}
                  >
                    {deleting ? t.bookings.deleting : t.bookings.confirmDelete}
                  </button>
                  <button
                    className="btn btn-ghost service-action-btn"
                    onClick={() => setConfirmDeleteId(null)}
                  >
                    {t.bookings.cancel}
                  </button>
                </>
              ) : (
                <button
                  className="btn btn-ghost service-action-btn booking-delete-btn"
                  onClick={() => setConfirmDeleteId(selectedBooking.id)}
                >
                  {t.bookings.delete}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Calendar grid ── */}
      {loading ? (
        <div className="shops-spinner-wrap"><div className="spinner" /></div>
      ) : (
        <>
          {outsideRangeCount > 0 && (
            <div className="cal-outside-banner">
              {t.bookings.calendar.outsideBanner.replace('{count}', String(outsideRangeCount))}
            </div>
          )}
          <div className="cal-scroll">
            <div className="cal-grid">

              {/* Column headers */}
              <div className="cal-header-row">
                <div className="cal-gutter-cell" />
                {columns.map(col => (
                  <div key={col.id} className="cal-col-header">{col.label}</div>
                ))}
              </div>

              {/* Body */}
              <div className="cal-body">

                {/* Time gutter */}
                <div className="cal-gutter">
                  {HOURS.map(h => (
                    <div key={h} className="cal-hour-label">
                      {h.toString().padStart(2, '0')}:00
                    </div>
                  ))}
                </div>

                {/* Staff columns */}
                {columns.map(col => {
                  const offs = col.isOther ? [] : offSegments(daySchedule?.[col.id] ?? null, range.start, range.end);
                  const creatable = isOwner && !col.isOther;

                  return (
                    <div
                      key={col.id}
                      className={`cal-col${creatable ? ' cal-col--creatable' : ''}`}
                      style={{ height: HOURS.length * SLOT_H }}
                      onClick={creatable ? (e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const y = e.clientY - rect.top;
                        const rawMinutes = range.start + y / PX_PER_MIN;
                        const rounded = Math.max(range.start, Math.round(rawMinutes / 30) * 30);
                        const showOutside = offs.some(s => rounded >= s.from && rounded < s.to);
                        openCreateSlot(col.id, toHHMM(rounded), showOutside);
                      } : undefined}
                    >
                      {/* Off-hours hatching (never colour alone: labelled) */}
                      {offs.map((seg, i) => (
                        <div
                          key={i}
                          className="cal-off-segment"
                          style={{ top: (seg.from - range.start) * PX_PER_MIN, height: (seg.to - seg.from) * PX_PER_MIN }}
                        >
                          <span className="cal-off-label">{seg.closed ? t.bookings.calendar.closed : t.bookings.calendar.off}</span>
                        </div>
                      ))}

                      {/* Hour lines */}
                      {HOURS.map((h, i) => (
                        <div
                          key={h}
                          className="cal-hour-line"
                          style={{ top: i * SLOT_H }}
                        />
                      ))}

                      {/* Booking blocks */}
                      {(bookingsByStaff[col.id] ?? []).map(b => {
                        const geom = geometryOf(b);
                        const tags = overrideTags(b.overriddenRules ?? []);
                        const isSelected = selectedBooking?.id === b.id;

                        return (
                          <div
                            key={b.id}
                            className={[
                              'cal-block',
                              `cal-block--${b.status.toLowerCase()}`,
                              tags.length > 0 ? 'cal-block--override' : '',
                              isSelected ? 'cal-block--selected' : '',
                            ].join(' ').trim()}
                            style={{ top: geom.top, height: geom.height }}
                            onClick={(e) => {
                              e.stopPropagation();
                              openBookingDetail(b, isSelected);
                            }}
                          >
                            <div className="cal-block-time">
                              {tags.length > 0 && <span aria-hidden="true">☾ </span>}
                              {formatTimeInZone(b.startTime, zone)}
                            </div>
                            <div className="cal-block-name">
                              {b.customer.contactHidden ? t.customers.hiddenLabel : b.customer.name}
                            </div>
                            <div className="cal-block-service">{b.service.name}</div>
                            {tags.length > 0 && (
                              <div className="cal-block-tag">{tags.map(tagLabel).join(' · ')}</div>
                            )}
                            {geom.crossesNextDay && (
                              <div className="cal-block-next-day">{t.bookings.calendar.nextDay}</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}

              </div>
            </div>
          </div>
        </>
      )}

    </div>
  );
}
