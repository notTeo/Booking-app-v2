import { dateInZone, formatDateTimeInZone, formatTimeInZone, minutesOfDayInZone, shiftDate, todayInZone } from '../utils/shopTime';
import { canManageShop } from '../utils/roles';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark, faChevronLeft, faChevronRight, faClock, faPlus, faSliders, faCalendarDays, faLockOpen } from '@fortawesome/free-solid-svg-icons';
import { useShop } from '../context/ShopContext';
import { useLang } from '../context/LanguageContext';
import {
  listBookings,
  updateBookingStatus,
  getApiError,
  type Booking,
  type BookingStatus,
} from '../api/booking.api';
import { getMembers, type TeamMember } from '../api/team.api';
import { getDaySchedule, type DaySchedule } from '../api/workingHours.api';
import BookingFiltersModal from '../components/BookingFiltersModal';
import Modal from '../components/Modal';
import OwnerBookingWizard from '../components/booking-wizard/OwnerBookingWizard';
import {
  blockGeometry,
  blockLanes,
  computeVisibleRange,
  filterBookings,
  hasActiveFilters,
  offSegments,
  overrideTags,
  type OverrideTag,
} from './calendarModel';
import '../styles/pages/bookings.css';
import Alert from '../components/Alert';
import { BOOKING_STATUS, bookingDisplay } from '../components/bookingStatus';

// ── constants ────────────────────────────────────────────────────────────────

const SLOT_H      = 64;                           // px per hour
const PX_PER_MIN  = SLOT_H / 60;
const MIN_BLOCK_H = 28;                           // minimum block height px
const COMPACT_BLOCK_H = 56;                       // below this, time and name share one row
const OTHER_COLUMN_ID = '__other__';

const ALL_STATUSES: BookingStatus[] = ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELED', 'NO_SHOW'];
// Only bookings that still hold their slot can be moved.
const RESCHEDULABLE: ReadonlySet<BookingStatus> = new Set(['PENDING', 'CONFIRMED']);

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
  const canManage = canManageShop(shop?.role);
  const slotStep = shop?.slotIntervalMinutes ?? 30;

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
  const [statusError, setStatusError]         = useState('');

  // Filter bar. Status/service hide blocks, staff hides columns. The service is
  // stored with its name so it stays selectable after moving to a day where no
  // booking has that service.
  const [statusFilter, setStatusFilter]       = useState<Set<BookingStatus>>(new Set());
  const [staffFilter, setStaffFilter]         = useState<string | null>(null);
  const [serviceFilter, setServiceFilter]     = useState<{ id: string; name: string } | null>(null);
  const [showFilters, setShowFilters]         = useState(false);

  // Latest-request-wins: a slow response for a day the user has already left
  // (or the duplicate effect run in StrictMode) must never replace the bookings
  // of the day now on screen.
  const requestSeq = useRef(0);

  // Phone layout only: which provider's column is scrolled into view, so its
  // chip can be highlighted (the chip row and the scroll-snap columns are
  // themselves CSS-only — this is just for the active-chip indicator).
  const [activeColId, setActiveColId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const colRefs = useRef(new Map<string, HTMLDivElement>());

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
    setStatusError('');
    try {
      const updated = await updateBookingStatus(shop.id, bookingId, status);
      setBookings(prev => prev.map(b => b.id === bookingId ? updated : b));
      return true;
    } catch (err) {
      // State stays as it was; tell the user why. A 409 is the slot being
      // taken meanwhile (e.g. re-opening a canceled booking).
      setStatusError(getApiError(err).status === 409 ? t.bookings.statusConflict : t.bookings.statusError);
      return false;
    } finally {
      setUpdatingId(null);
    }
  };

  const statusLabel = (b: Booking) =>
    b.rescheduledTo ? t.bookings.reschedule.rescheduledLabel : t.bookings.filters.status[b.status];

  // Who a booking is for, as shown: a blocked slot reads "Blocked" in the
  // user's language, never the placeholder's stored name.
  const customerLabel = (b: Booking) =>
    b.customer.isSystem
      ? t.bookings.block.name
      : b.customer.contactHidden
        ? t.customers.hiddenLabel
        : b.customer.name;

  const openBookingDetail = (b: Booking, isSelected: boolean) => {
    setSelectedBooking(isSelected ? null : b);
    setCreatingSlot(null);
    setStatusError('');
  };

  const openCreateSlot = (staffId: string, timeHint: string, showOutside: boolean) => {
    setCreatingSlot({ staffId, timeHint, showOutside });
    setSelectedBooking(null);
  };

  // ── derived ──────────────────────────────────────────────────────────────

  const memberIds = new Set(members.map(m => m.id));
  const hasOtherBookings = bookings.some(b => !memberIds.has(b.staffId));

  const allColumns = [
    ...members.map(m => ({ id: m.id, label: m.name, isOther: false })),
    ...(hasOtherBookings ? [{ id: OTHER_COLUMN_ID, label: t.bookings.calendar.otherColumn, isOther: true }] : []),
  ];
  const columns = staffFilter ? allColumns.filter(c => c.id === staffFilter) : allColumns;

  const filters = { statuses: statusFilter, staffId: staffFilter, serviceId: serviceFilter?.id ?? null };
  const filtersActive = hasActiveFilters(filters);
  const activeFilterCount = statusFilter.size + (staffFilter ? 1 : 0) + (serviceFilter ? 1 : 0);
  const clearFilters = () => {
    setStatusFilter(new Set());
    setStaffFilter(null);
    setServiceFilter(null);
  };
  // Only blocks are filtered: the visible hour range and the "outside range"
  // banner below still use every booking, so the grid does not jump around.
  const shownBookings = filterBookings(bookings, filters);

  const serviceOptions = new Map<string, string>();
  for (const b of bookings) serviceOptions.set(b.serviceId, b.service.name);
  if (serviceFilter && !serviceOptions.has(serviceFilter.id)) serviceOptions.set(serviceFilter.id, serviceFilter.name);

  const bookingsByStaff = shownBookings.reduce<Record<string, Booking[]>>((acc, b) => {
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

  // Blocks sharing time in a column (a canceled or rescheduled booking whose
  // slot was booked again) sit side by side instead of on top of each other.
  const lanesByCol = Object.fromEntries(
    Object.entries(bookingsByStaff).map(([colId, list]) => [
      colId,
      blockLanes(
        list.map((b) => {
          const { startMin, durationMin } = bookingMinutes.get(b.id)!;
          return { id: b.id, startMin, endMin: startMin + durationMin };
        }),
      ),
    ]),
  );

  const outsideRangeCount = bookings.filter(b => geometryOf(b).outsideView).length;

  const tagLabel = (tag: OverrideTag) => t.bookings.calendar.tags[tag];

  // Out-of-hours booking count per column, for the phone chip row's badge.
  const overrideCountByCol = Object.fromEntries(
    columns.map(col => [
      col.id,
      (bookingsByStaff[col.id] ?? []).filter(b => overrideTags(b.overriddenRules ?? []).length > 0).length,
    ]),
  );

  const shownCount = columns.reduce((n, c) => n + (bookingsByStaff[c.id]?.length ?? 0), 0);

  const columnIds = columns.map(c => c.id).join(',');

  // A filter can hide the booking whose detail panel is open — close it.
  useEffect(() => {
    if (!selectedBooking) return;
    const visible = columns.some(c => (bookingsByStaff[c.id] ?? []).some(b => b.id === selectedBooking.id));
    if (!visible) setSelectedBooking(null);
  }, [statusFilter, staffFilter, serviceFilter]);

  // Phone layout: highlight whichever provider's column the scroll-snap has
  // brought into view, so its chip lights up (the scroll-snapping itself is
  // pure CSS — this only drives the chip row's active state).
  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;
    const nodes = [...colRefs.current.entries()].filter(([id]) => columns.some(c => c.id === id));
    if (nodes.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter(e => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible.length > 0) setActiveColId(visible[0].target.getAttribute('data-col-id'));
      },
      { root, threshold: [0.5, 0.75, 1] },
    );
    for (const [, node] of nodes) observer.observe(node);
    return () => observer.disconnect();
  // `columns` is a fresh array every render; `columnIds` is its stable key so
  // the observer is only rebuilt when membership actually changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columnIds, loading]);

  const scrollToCol = (id: string) => {
    // scrollLeft only — scrollIntoView also nudges the page's vertical scroll
    // when the (very tall) column isn't fully in view.
    const el = colRefs.current.get(id);
    if (el && scrollRef.current) scrollRef.current.scrollTo({ left: el.offsetLeft, behavior: 'smooth' });
  };

  // ── loading ───────────────────────────────────────────────────────────────

  if (shopLoading) {
    return (
      <div className="bookings-page">
        <div className="spinner-wrap"><div className="spinner spinner--lg" /></div>
      </div>
    );
  }

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div className="bookings-page">

      {/* ── Header ── */}
      <div className="page-header">
        <h1 className="t-title">{t.bookings.title}</h1>
        {canManage && shop && (
          <Link className="btn btn--sm" to={`/shops/${shop.slug}/bookings/new`}>
            <FontAwesomeIcon icon={faPlus} aria-hidden="true" />
            {t.sidebar.bookAppointment}
          </Link>
        )}
      </div>

      {/* ── Toolbar: date, filters (controls live in BookingFiltersModal) ── */}
      <div className="cluster">
        <div className="bookings-date-nav">
          <button
            type="button"
            className="btn btn--secondary btn--sunken btn--icon btn--sm"
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
            className="input input--sm"
            value={date}
            onChange={e => setDateOverride(e.target.value)}
          />
          <button
            type="button"
            className="btn btn--secondary btn--sunken btn--icon btn--sm"
            onClick={() => setDateOverride(shiftDate(date, 1))}
            aria-label="Next day"
          >
            <FontAwesomeIcon icon={faChevronRight} />
          </button>
        </div>
        <button type="button" className="btn btn--secondary btn--sm" onClick={() => setShowFilters(true)}>
          <FontAwesomeIcon icon={faSliders} aria-hidden="true" />
          {t.bookings.filters.button}
          {activeFilterCount > 0 && <span className="badge badge--accent">{activeFilterCount}</span>}
        </button>
        {filtersActive && (
          <>
            <span className="t-body-sm t-muted">
              {t.bookings.filters.showing.replace('{shown}', String(shownCount)).replace('{total}', String(bookings.length))}
            </span>
            <button type="button" className="btn btn--ghost btn--sm" onClick={clearFilters}>
              {t.bookings.filters.clear}
            </button>
          </>
        )}
      </div>

      {error && <Alert variant="danger">{error}</Alert>}

      {/* ── Detail panel ── */}
      {/* ── Calendar grid ── */}
      {loading ? (
        <div className="spinner-wrap"><div className="spinner spinner--lg" /></div>
      ) : (
        <>
          {outsideRangeCount > 0 && (
            <Alert variant="warning">
              {t.bookings.calendar.outsideBanner.replace('{count}', String(outsideRangeCount))}
            </Alert>
          )}

          {/* Phone layout only (CSS-hidden ≥640px): jump to a provider's page. */}
          {columns.length > 1 && (
            <div className="cal-chips">
              {columns.map(col => (
                <button
                  key={col.id}
                  type="button"
                  aria-pressed={activeColId === col.id}
                  className="chip chip--lg"
                  onClick={() => scrollToCol(col.id)}
                >
                  <span className="chip__label">{col.label}</span>
                  {overrideCountByCol[col.id] > 0 && (
                    <span className="cal-chips__count"><FontAwesomeIcon icon={faClock} /> {overrideCountByCol[col.id]}</span>
                  )}
                </button>
              ))}
            </div>
          )}

          <div className="cal" style={{ '--cal-hour-h': `${SLOT_H}px` } as CSSProperties} ref={scrollRef}>
            <div className="cal__grid">

              {/* Column headers */}
              <div className="cal__head">
                <div className="cal__corner" />
                {columns.map(col => (
                  <div key={col.id} className="cal__col-head t-caption label-caps">{col.label}</div>
                ))}
              </div>

              {/* Body */}
              <div className="cal__body">

                {/* Time gutter */}
                <div className="cal__gutter">
                  {HOURS.map(h => (
                    <div key={h} className="cal__hour">
                      {h.toString().padStart(2, '0')}:00
                    </div>
                  ))}
                </div>

                {/* Staff columns */}
                {columns.map(col => {
                  const offs = col.isOther ? [] : offSegments(daySchedule?.[col.id] ?? null, range.start, range.end);
                  const creatable = canManage && !col.isOther;

                  return (
                    <div
                      key={col.id}
                      data-col-id={col.id}
                      ref={(el) => {
                        if (el) colRefs.current.set(col.id, el);
                        else colRefs.current.delete(col.id);
                      }}
                      className={`cal__col${creatable ? ' cal__col--creatable' : ''}`}
                      style={{ height: HOURS.length * SLOT_H }}
                      onClick={creatable ? (e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const y = e.clientY - rect.top;
                        const rawMinutes = range.start + y / PX_PER_MIN;
                        const rounded = Math.max(range.start, Math.round(rawMinutes / slotStep) * slotStep);
                        const showOutside = offs.some(s => rounded >= s.from && rounded < s.to);
                        openCreateSlot(col.id, toHHMM(rounded), showOutside);
                      } : undefined}
                    >
                      {/* Off-hours hatching (never colour alone: labelled) */}
                      {offs.map((seg, i) => (
                        <div
                          key={i}
                          className="cal__off"
                          style={{ top: (seg.from - range.start) * PX_PER_MIN, height: (seg.to - seg.from) * PX_PER_MIN }}
                        >
                          <span className="badge badge--neutral cal__off-label">{seg.closed ? t.bookings.calendar.closed : t.bookings.calendar.off}</span>
                        </div>
                      ))}

                      {/* Hour lines */}
                      {HOURS.map((h, i) => (
                        <div
                          key={h}
                          className="cal__line"
                          style={{ top: i * SLOT_H }}
                        />
                      ))}

                      {/* Booking blocks */}
                      {(bookingsByStaff[col.id] ?? []).map(b => {
                        const geom = geometryOf(b);
                        const lane = lanesByCol[col.id]?.get(b.id);
                        const tags = overrideTags(b.overriddenRules ?? []);
                        const isSelected = selectedBooking?.id === b.id;

                        return (
                          <button
                            key={b.id}
                            type="button"
                            className={[
                              'cal-block',
                              `cal-block--${bookingDisplay(b).cls}`,
                              tags.length > 0 ? 'cal-block--override' : '',
                              isSelected ? 'cal-block--selected' : '',
                              geom.height < COMPACT_BLOCK_H ? 'cal-block--compact' : '',
                            ].join(' ').trim()}
                            style={{
                              top: geom.top,
                              height: geom.height,
                              ...(lane && lane.lanes > 1 && { '--lane': lane.lane, '--lanes': lane.lanes }),
                            } as CSSProperties}
                            onClick={(e) => {
                              e.stopPropagation();
                              openBookingDetail(b, isSelected);
                            }}
                          >
                            <span className="cal-block__time">
                              <FontAwesomeIcon icon={bookingDisplay(b).icon} aria-hidden="true" />
                              {tags.length > 0 && <FontAwesomeIcon icon={faClock} aria-hidden="true" />}
                              {formatTimeInZone(b.startTime, zone)}
                              <span className="visually-hidden">{statusLabel(b)}</span>
                            </span>
                            <span className="cal-block__name">
                              {customerLabel(b)}
                            </span>
                            <span className="cal-block__service">
                              {b.rescheduledTo
                                ? t.bookings.reschedule.rescheduledLabel
                                : (b.customer.isSystem && b.notes) || b.service.name}
                            </span>
                            {tags.length > 0 && (
                              <span className="cal-block__tag label-caps">{tags.map(tagLabel).join(' · ')}</span>
                            )}
                            {geom.crossesNextDay && (
                              <span className="cal-block__next-day">{t.bookings.calendar.nextDay}</span>
                            )}
                          </button>
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

      {/* Booking details, from a click on a booking */}
      {selectedBooking && (
        <Modal onClose={() => setSelectedBooking(null)} labelledBy="booking-detail-title">
          <div className="modal__header">
            <h2 id="booking-detail-title" className="modal__title">
              {/* The name opens the customer's page; a blocked slot has no customer to open. */}
              {slug && !selectedBooking.customer.isSystem ? (
                <Link to={`/shops/${slug}/customers/${selectedBooking.customerId}`}>
                  {customerLabel(selectedBooking)}
                </Link>
              ) : (
                customerLabel(selectedBooking)
              )}
            </h2>
            <button
              type="button"
              className="btn btn--ghost btn--icon btn--sm"
              onClick={() => { setSelectedBooking(null); }}
              aria-label={t.bookings.close}
            >
              <FontAwesomeIcon icon={faXmark} aria-hidden="true" />
            </button>
          </div>
          <div className="modal__body">
            <div className="cluster cluster--tight t-body-sm">
              <span>{selectedBooking.service.name}</span>
              <span aria-hidden="true">·</span>
              <span>{formatTimeInZone(selectedBooking.startTime, zone)}</span>
              <span aria-hidden="true">·</span>
              {/* The booking's own length: a customer may have a custom duration for the service. */}
              <span>
                {formatDuration(
                  (new Date(selectedBooking.endTime).getTime() - new Date(selectedBooking.startTime).getTime()) / 60_000,
                )}
              </span>
            </div>

            {!selectedBooking.customer.contactHidden && !selectedBooking.customer.isSystem && (
              <div className="t-body-sm">{selectedBooking.customer.phone}</div>
            )}
            {selectedBooking.notes && (
              <div className="t-body-sm"><em>{selectedBooking.notes}</em></div>
            )}

            {selectedBooking.rescheduledFrom && (
              <Alert variant="info">
                {t.bookings.reschedule.rescheduledFrom.replace(
                  '{when}',
                  formatDateTimeInZone(selectedBooking.rescheduledFrom.startTime, zone),
                )}
              </Alert>
            )}

            {selectedBooking.rescheduledTo ? (
              // The old half of a reschedule is only a reference: its status
              // can't change, so it gets a note and a way to the new booking.
              <>
                <Alert variant="info" title={t.bookings.reschedule.rescheduledLabel}>
                  {t.bookings.reschedule.rescheduledTo.replace(
                    '{when}',
                    formatDateTimeInZone(selectedBooking.rescheduledTo.startTime, zone),
                  )}
                </Alert>
                <div className="cluster">
                  <button
                    type="button"
                    className="btn btn--secondary btn--sm"
                    onClick={() => {
                      const to = selectedBooking.rescheduledTo!;
                      setSelectedBooking(null);
                      setDateOverride(dateInZone(to.startTime, zone));
                    }}
                  >
                    <FontAwesomeIcon icon={faCalendarDays} aria-hidden="true" />
                    {t.bookings.reschedule.viewNew}
                  </button>
                </div>
              </>
            ) : selectedBooking.customer.isSystem ? (
              // A blocked slot has no customer and no status to track: it is
              // either holding the time or unblocked.
              selectedBooking.status === 'CANCELED' ? (
                <Alert variant="info">{t.bookings.block.unblocked}</Alert>
              ) : (
                <div className="cluster">
                  <button
                    type="button"
                    className={`btn btn--secondary btn--sm${updatingId === selectedBooking.id ? ' is-loading' : ''}`}
                    aria-busy={updatingId === selectedBooking.id}
                    onClick={async () => {
                      if (await handleStatusUpdate(selectedBooking.id, 'CANCELED')) setSelectedBooking(null);
                    }}
                  >
                    <FontAwesomeIcon icon={faLockOpen} aria-hidden="true" />
                    {t.bookings.block.unblock}
                  </button>
                </div>
              )
            ) : (
              <div className="cluster cluster--tight" role="group" aria-label={t.bookings.filters.statusLabel}>
                {ALL_STATUSES.map(s => (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={selectedBooking.status === s}
                    className={`chip chip--${BOOKING_STATUS[s].cls}`}
                    onClick={() => handleStatusUpdate(selectedBooking.id, s)}
                    disabled={updatingId === selectedBooking.id}
                  >
                    <FontAwesomeIcon icon={BOOKING_STATUS[s].icon} aria-hidden="true" />
                    <span className="chip__label">{t.bookings.filters.status[s]}</span>
                  </button>
                ))}
              </div>
            )}
            {statusError && <Alert variant="danger">{statusError}</Alert>}

            {canManage && slug && !selectedBooking.customer.isSystem && RESCHEDULABLE.has(selectedBooking.status) && (
              <div className="cluster">
                <Link
                  className="btn btn--secondary btn--sm"
                  to={`/shops/${slug}/bookings/${selectedBooking.id}/reschedule`}
                >
                  <FontAwesomeIcon icon={faCalendarDays} aria-hidden="true" />
                  {t.bookings.reschedule.button}
                </Link>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Quick booking from a click on the calendar */}
      {creatingSlot && shop && slug && (
        <Modal onClose={() => setCreatingSlot(null)} labelledBy="quick-booking-title">
          <div className="modal__header">
            <h2 id="quick-booking-title" className="modal__title">{t.bookings.newBookingTitle}</h2>
            <button
              type="button"
              className="btn btn--ghost btn--icon btn--sm"
              onClick={() => setCreatingSlot(null)}
              aria-label={t.bookings.close}
            >
              <FontAwesomeIcon icon={faXmark} aria-hidden="true" />
            </button>
          </div>
          <div className="modal__body">
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
          </div>
        </Modal>
      )}

      {showFilters && (
        <BookingFiltersModal
          statuses={ALL_STATUSES}
          statusFilter={statusFilter}
          onToggleStatus={(status) =>
            setStatusFilter(prev => {
              const next = new Set(prev);
              if (next.has(status)) next.delete(status); else next.add(status);
              return next;
            })
          }
          staffOptions={allColumns}
          staffFilter={staffFilter}
          onStaffChange={setStaffFilter}
          serviceOptions={serviceOptions}
          serviceFilter={serviceFilter?.id ?? null}
          onServiceChange={(id) => setServiceFilter(id ? { id, name: serviceOptions.get(id) ?? '' } : null)}
          filtersActive={filtersActive}
          onClear={clearFilters}
          onClose={() => setShowFilters(false)}
        />
      )}

    </div>
  );
}
