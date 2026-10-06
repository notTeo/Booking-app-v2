import { useState } from 'react';
import { Link } from 'react-router-dom';
import { DateTime } from 'luxon';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBan,
  faCalendarDays,
  faClock,
  faLockOpen,
  faNoteSticky,
  faPen,
  faPhone,
  faScissors,
  faXmark,
} from '@fortawesome/free-solid-svg-icons';
import type { Booking, BookingProductChange, BookingStatus } from '../api/booking.api';
import { useLang } from '../context/LanguageContext';
import { formatTimeInZone } from '../utils/shopTime';
import { bookingDisplay } from './bookingStatus';
import { formatDuration, formatPrice } from './booking-wizard/wizardUtils';
import Alert from './Alert';
import BookingProducts from './BookingProducts';
import ConfirmDialog from './ConfirmDialog';
import Modal from './Modal';

const BADGE: Record<BookingStatus, string> = {
  PENDING: 'badge--warning',
  CONFIRMED: 'badge--success',
  COMPLETED: 'badge--info',
  CANCELED: 'badge--canceled',
  NO_SHOW: 'badge--danger',
};

// The two choices that get a full-width button; a pending booking also gets
// its own, so it can be confirmed.
const MAIN_STATUSES: BookingStatus[] = ['CONFIRMED', 'COMPLETED'];

/**
 * A booking's details, from a click on it in the calendar: who and when, the
 * service and its price, the status to set, and the products reserved with it
 * (editable from here) with the total.
 */
export default function BookingDetailsModal({
  booking,
  zone,
  slug,
  shopId,
  canReschedule,
  updating,
  statusError,
  onStatus,
  onProductsChange,
  onViewRescheduled,
  onClose,
}: {
  booking: Booking;
  zone: string;
  slug?: string;
  shopId: string;
  /** Owner and managers can move a booking. */
  canReschedule: boolean;
  updating: boolean;
  statusError: string;
  /** Resolves true when the status was changed. */
  onStatus: (status: BookingStatus) => Promise<boolean | undefined>;
  onProductsChange: (change: BookingProductChange) => void;
  /** The booking this one was rescheduled to: go to its day. */
  onViewRescheduled: (startTime: string) => void;
  onClose: () => void;
}) {
  const { t, language } = useLang();
  const [editingProducts, setEditingProducts] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const isBlock = booking.customer.isSystem;
  const display = bookingDisplay(booking);
  const statusText = booking.rescheduledTo
    ? t.bookings.reschedule.rescheduledLabel
    : t.bookings.filters.status[booking.status];
  const name = isBlock
    ? t.bookings.block.name
    : booking.customer.contactHidden
      ? t.customers.hiddenLabel
      : booking.customer.name;

  const minutes =
    (new Date(booking.endTime).getTime() - new Date(booking.startTime).getTime()) / 60_000;
  const length = minutes < 60 ? t.bookings.detail.minutes.replace('{n}', String(minutes)) : formatDuration(minutes);
  const day = DateTime.fromISO(booking.startTime, { zone })
    .setLocale(language)
    .toLocaleString({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const products = booking.products ?? [];
  const productsTotal = products.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0);
  const canMove = canReschedule && !isBlock && (booking.status === 'PENDING' || booking.status === 'CONFIRMED');

  const mainStatuses: BookingStatus[] =
    booking.status === 'PENDING' ? ['PENDING', ...MAIN_STATUSES] : MAIN_STATUSES;

  return (
    <Modal onClose={onClose} labelledBy="booking-detail-title" paused={confirmCancel}>
      <div className="modal__header">
        <div className="booking-detail__head">
          {!isBlock && (
            <span className={`badge ${booking.rescheduledTo ? 'badge--canceled' : BADGE[booking.status]}`}>
              <FontAwesomeIcon icon={display.icon} aria-hidden="true" />
              {statusText}
            </span>
          )}
          <h2 id="booking-detail-title" className="modal__title">
            {/* The name opens the customer's page; a blocked slot has no customer to open. */}
            {slug && !isBlock ? (
              <Link to={`/shops/${slug}/customers/${booking.customerId}`}>{name}</Link>
            ) : (
              name
            )}
          </h2>
        </div>
        <button type="button" className="btn btn--ghost btn--icon btn--sm" onClick={onClose} aria-label={t.bookings.close}>
          <FontAwesomeIcon icon={faXmark} aria-hidden="true" />
        </button>
      </div>

      <div className="modal__body">
        <div className="detail-list">
          <div className="detail-row">
            <FontAwesomeIcon icon={faClock} className="detail-row__icon" aria-hidden="true" />
            <div className="detail-row__main">
              <span className="detail-row__title">
                {formatTimeInZone(booking.startTime, zone)} – {formatTimeInZone(booking.endTime, zone)}
              </span>
              <span className="detail-row__sub">{day}</span>
            </div>
            {canMove && slug && (
              <Link className="btn btn--secondary btn--sm detail-row__end" to={`/shops/${slug}/bookings/${booking.id}/reschedule`}>
                <FontAwesomeIcon icon={faCalendarDays} aria-hidden="true" />
                {t.bookings.reschedule.button}
              </Link>
            )}
          </div>
          <div className="detail-row">
            <FontAwesomeIcon icon={faScissors} className="detail-row__icon" aria-hidden="true" />
            <div className="detail-row__main">
              <span>
                <strong>{booking.service.name}</strong> <span className="t-muted">· {length}</span>
              </span>
            </div>
            <span className="detail-row__end">{formatPrice(booking.service.price)}</span>
          </div>
          {!booking.customer.contactHidden && !isBlock && (
            <div className="detail-row">
              <FontAwesomeIcon icon={faPhone} className="detail-row__icon" aria-hidden="true" />
              <div className="detail-row__main">{booking.customer.phone}</div>
            </div>
          )}
          {booking.notes && (
            <div className="detail-row">
              <FontAwesomeIcon icon={faNoteSticky} className="detail-row__icon" aria-hidden="true" />
              <div className="detail-row__main"><em>{booking.notes}</em></div>
            </div>
          )}
        </div>

        {booking.rescheduledFrom && (
          <Alert variant="info">
            {t.bookings.reschedule.rescheduledFrom.replace(
              '{when}',
              DateTime.fromISO(booking.rescheduledFrom.startTime, { zone }).toLocaleString({ dateStyle: 'medium', timeStyle: 'short' }),
            )}
          </Alert>
        )}

        {booking.rescheduledTo ? (
          // The old half of a reschedule is only a reference: its status can't
          // change, so it gets a note and a way to the new booking.
          <>
            <Alert variant="info" title={t.bookings.reschedule.rescheduledLabel}>
              {t.bookings.reschedule.rescheduledTo.replace(
                '{when}',
                DateTime.fromISO(booking.rescheduledTo.startTime, { zone }).toLocaleString({ dateStyle: 'medium', timeStyle: 'short' }),
              )}
            </Alert>
            <div className="cluster">
              <button type="button" className="btn btn--secondary btn--sm" onClick={() => onViewRescheduled(booking.rescheduledTo!.startTime)}>
                <FontAwesomeIcon icon={faCalendarDays} aria-hidden="true" />
                {t.bookings.reschedule.viewNew}
              </button>
            </div>
          </>
        ) : isBlock ? (
          // A blocked slot has no customer and no status to track: it is
          // either holding the time or unblocked.
          booking.status === 'CANCELED' ? (
            <Alert variant="info">{t.bookings.block.unblocked}</Alert>
          ) : (
            <div className="cluster">
              <button
                type="button"
                className={`btn btn--secondary btn--sm${updating ? ' is-loading' : ''}`}
                aria-busy={updating}
                onClick={async () => {
                  if (await onStatus('CANCELED')) onClose();
                }}
              >
                <FontAwesomeIcon icon={faLockOpen} aria-hidden="true" />
                {t.bookings.block.unblock}
              </button>
            </div>
          )
        ) : (
          <>
            <h3 className="t-subheading">{t.bookings.filters.statusLabel}</h3>
            <div className="action-grid" role="group" aria-label={t.bookings.filters.statusLabel}>
              {mainStatuses.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`btn ${booking.status === s ? '' : 'btn--secondary'}`}
                  aria-pressed={booking.status === s}
                  disabled={updating}
                  onClick={() => onStatus(s)}
                >
                  {t.bookings.filters.status[s]}
                </button>
              ))}
            </div>
            <div className="cluster">
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                aria-pressed={booking.status === 'NO_SHOW'}
                disabled={updating}
                onClick={() => onStatus('NO_SHOW')}
              >
                <FontAwesomeIcon icon={faBan} aria-hidden="true" />
                {t.bookings.detail.noShow}
              </button>
              <button
                type="button"
                className="btn btn--danger-ghost btn--sm"
                aria-pressed={booking.status === 'CANCELED'}
                disabled={updating}
                onClick={() => (booking.status === 'CANCELED' ? undefined : setConfirmCancel(true))}
              >
                <FontAwesomeIcon icon={faXmark} aria-hidden="true" />
                {booking.status === 'CANCELED' ? t.bookings.filters.status.CANCELED : t.bookings.detail.cancelBooking}
              </button>
            </div>
          </>
        )}
        {statusError && <Alert variant="danger">{statusError}</Alert>}

        {products.length > 0 && (
          <>
            <div className="page-header">
              <h3 className="t-subheading">{t.products.bookingTitle}</h3>
              <button type="button" className="btn btn--ghost btn--sm" aria-pressed={editingProducts} onClick={() => setEditingProducts((v) => !v)}>
                <FontAwesomeIcon icon={faPen} aria-hidden="true" />
                {editingProducts ? t.bookings.detail.doneEditing : t.bookings.detail.editProducts}
              </button>
            </div>
            <BookingProducts
              shopId={shopId}
              bookingId={booking.id}
              products={products}
              editing={editingProducts}
              onChange={onProductsChange}
            />
            <div className="total-bar">
              <span>{t.products.total}</span>
              <span className="total-bar__amount">{formatPrice(booking.service.price + productsTotal)}</span>
            </div>
            <p className="total-bar__note">
              {t.bookings.detail.totalNote
                .replace('{service}', formatPrice(booking.service.price))
                .replace('{products}', formatPrice(productsTotal))}
            </p>
          </>
        )}
      </div>

      {confirmCancel && (
        <ConfirmDialog
          title={t.bookings.detail.cancelTitle}
          message={t.bookings.detail.cancelMessage}
          confirmLabel={t.bookings.detail.cancelBooking}
          cancelLabel={t.bookings.detail.keepBooking}
          tone="danger"
          busy={updating}
          onConfirm={async () => {
            await onStatus('CANCELED');
            setConfirmCancel(false);
          }}
          onCancel={() => setConfirmCancel(false)}
        />
      )}
    </Modal>
  );
}
