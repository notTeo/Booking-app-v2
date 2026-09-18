import { useEffect, useState } from 'react';
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
import OwnerBookingWizard from '../components/booking-wizard/OwnerBookingWizard';
import '../styles/pages/bookings.css';

// ── constants ────────────────────────────────────────────────────────────────

const GRID_START  = 7;                            // 07:00
const GRID_END    = 23;                           // 23:00
const SLOT_H      = 64;                           // px per hour
const PX_PER_MIN  = SLOT_H / 60;
const MIN_BLOCK_H = 28;                           // minimum block height px
const HOURS = Array.from({ length: GRID_END - GRID_START }, (_, i) => GRID_START + i);

const ALL_STATUSES: BookingStatus[] = ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELED', 'NO_SHOW'];

// ── helpers ──────────────────────────────────────────────────────────────────

const todayISO = () => new Date().toISOString().split('T')[0];

const shiftDateStr = (date: string, delta: number) => {
  const d = new Date(date + 'T00:00:00'); // force local-time parsing
  d.setDate(d.getDate() + delta);
  // Build the string from local getters, not toISOString() — that converts
  // to UTC first, which can roll the date back a day depending on the
  // local UTC offset (most visible right at local midnight, exactly what
  // this produces).
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

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
  const [loading, setLoading]                 = useState(true);
  const [error, setError]                     = useState('');
  const [date, setDate]                       = useState(() => searchParams.get('date') || todayISO());
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [creatingSlot, setCreatingSlot]       = useState<CreatingSlot | null>(null);
  const [updatingId, setUpdatingId]           = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting]               = useState(false);

  const refetchBookings = () => {
    if (!shop) return;
    setLoading(true);
    setError('');
    listBookings(shop.id, { date })
      .then(setBookings)
      .catch(() => setError(t.bookings.errorLoad))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!shop) return;
    setLoading(true);
    setError('');
    const membersPromise = members.length > 0
      ? Promise.resolve(members)
      : getMembers(shop.id);
    Promise.all([listBookings(shop.id, { date }), membersPromise])
      .then(([bkgs, mems]) => {
        setBookings(bkgs);
        if (members.length === 0) setMembers(mems);
      })
      .catch(() => setError(t.bookings.errorLoad))
      .finally(() => setLoading(false));
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

  const openCreateSlot = (staffId: string, timeHint: string) => {
    setCreatingSlot({ staffId, timeHint });
    setSelectedBooking(null);
    setConfirmDeleteId(null);
  };

  // ── derived ──────────────────────────────────────────────────────────────

const columns = members.map(m => ({ id: m.id, label: m.name }));

  const bookingsByStaff = bookings.reduce<Record<string, Booking[]>>((acc, b) => {
    const key = members.some(m => m.id === b.staffId) ? b.staffId : 'unassigned';
    acc[key] = [...(acc[key] ?? []), b];
    return acc;
  }, {});

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
            onClick={() => setDate(d => shiftDateStr(d, -1))}
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
            onChange={e => setDate(e.target.value)}
          />
          <button
            type="button"
            className="bookings-date-nav-btn"
            onClick={() => setDate(d => shiftDateStr(d, 1))}
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
            <span>{formatTime(selectedBooking.startTime)}</span>
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
              {columns.map(col => (
                <div
                  key={col.id}
                  className={`cal-col${isOwner ? ' cal-col--creatable' : ''}`}
                  style={{ height: HOURS.length * SLOT_H }}
                  onClick={isOwner ? (e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const y = e.clientY - rect.top;
                    const rawMinutes = GRID_START * 60 + y / PX_PER_MIN;
                    const rounded = Math.max(GRID_START * 60, Math.round(rawMinutes / 30) * 30);
                    openCreateSlot(col.id, toHHMM(rounded));
                  } : undefined}
                >
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
                    const dt = new Date(b.startTime);
                    const mins = dt.getHours() * 60 + dt.getMinutes();
                    const top = (mins - GRID_START * 60) * PX_PER_MIN;
                    const height = Math.max(b.service.duration * PX_PER_MIN, MIN_BLOCK_H);
                    const isSelected = selectedBooking?.id === b.id;

                    return (
                      <div
                        key={b.id}
                        className={[
                          'cal-block',
                          `cal-block--${b.status.toLowerCase()}`,
                          isSelected ? 'cal-block--selected' : '',
                        ].join(' ').trim()}
                        style={{ top, height }}
                        onClick={(e) => {
                          e.stopPropagation();
                          openBookingDetail(b, isSelected);
                        }}
                      >
                        <div className="cal-block-time">{formatTime(b.startTime)}</div>
                        <div className="cal-block-name">
                          {b.customer.contactHidden ? t.customers.hiddenLabel : b.customer.name}
                        </div>
                        <div className="cal-block-service">{b.service.name}</div>
                      </div>
                    );
                  })}
                </div>
              ))}

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
