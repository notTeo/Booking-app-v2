import { useEffect, useState } from 'react';
import { useShop } from '../context/ShopContext';
import {
  listBookings,
  updateBookingStatus,
  deleteBooking,
  type Booking,
  type BookingStatus,
} from '../api/booking.api';
import { getMembers, type TeamMember } from '../api/team.api';
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

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const formatDuration = (mins: number) => {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
};

// ── component ────────────────────────────────────────────────────────────────

export default function ShopBookingsPage() {
  const { shop, isLoading: shopLoading } = useShop();
  const isOwner = shop?.role === 'owner';

  const [bookings, setBookings]               = useState<Booking[]>([]);
  const [members, setMembers]                 = useState<TeamMember[]>([]);
  const [loading, setLoading]                 = useState(true);
  const [error, setError]                     = useState('');
  const [date, setDate]                       = useState(todayISO);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [updatingId, setUpdatingId]           = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting]               = useState(false);

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
      .catch(() => setError('Failed to load bookings.'))
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

  // ── derived ──────────────────────────────────────────────────────────────

const columns = members.map(m => ({ id: m.id, label: m.user.name }));

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
        <h1>Bookings</h1>
        <input
          type="date"
          className="bookings-date-picker"
          value={date}
          onChange={e => setDate(e.target.value)}
        />
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* ── Detail panel ── */}
      {selectedBooking && (
        <div className="cal-detail-panel">
          <div className="cal-detail-header">
            <div className="cal-detail-title">{selectedBooking.customer.name}</div>
            <button
              className="cal-detail-close"
              onClick={() => { setSelectedBooking(null); setConfirmDeleteId(null); }}
              aria-label="Close"
            >
              ×
            </button>
          </div>

          <div className="cal-detail-meta">
            <span>{selectedBooking.service.name}</span>
            <span className="cal-detail-sep">·</span>
            <span>{formatTime(selectedBooking.startTime)}</span>
            <span className="cal-detail-sep">·</span>
            <span>{formatDuration(selectedBooking.service.duration)}</span>
          </div>

          <div className="cal-detail-phone">{selectedBooking.customer.phone}</div>
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
                    {deleting ? 'Deleting…' : 'Delete?'}
                  </button>
                  <button
                    className="btn btn-ghost service-action-btn"
                    onClick={() => setConfirmDeleteId(null)}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  className="btn btn-ghost service-action-btn booking-delete-btn"
                  onClick={() => setConfirmDeleteId(selectedBooking.id)}
                >
                  Delete
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
                  className="cal-col"
                  style={{ height: HOURS.length * SLOT_H }}
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
                        onClick={() => {
                          setSelectedBooking(isSelected ? null : b);
                          setConfirmDeleteId(null);
                        }}
                      >
                        <div className="cal-block-time">{formatTime(b.startTime)}</div>
                        <div className="cal-block-name">{b.customer.name}</div>
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
