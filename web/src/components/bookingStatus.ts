import { faBan, faCalendarCheck, faCalendarDays, faCircleCheck, faClock, faLock, faXmark, type IconDefinition } from '@fortawesome/free-solid-svg-icons';
import type { BookingStatus } from '../api/booking.api';

// Single place that maps a DB booking status to its design-system modifier
// (`badge--*`, `chip--*`) and icon. The DB value `NO_SHOW` becomes `no-show`.
export const BOOKING_STATUS: Record<BookingStatus, { cls: string; icon: IconDefinition }> = {
  PENDING: { cls: 'pending', icon: faClock },
  CONFIRMED: { cls: 'confirmed', icon: faCalendarCheck },
  COMPLETED: { cls: 'completed', icon: faCircleCheck },
  CANCELED: { cls: 'canceled', icon: faXmark },
  NO_SHOW: { cls: 'no-show', icon: faBan },
};

/**
 * How a booking is drawn. The old half of a reschedule is CANCELED in the
 * database (it frees its slot the same way) but reads as "rescheduled", so it
 * keeps the canceled look with the reschedule icon. A blocked slot (a booking
 * on the shop's "Blocked" placeholder) has its own look while it holds the
 * time; once unblocked it reads as canceled.
 */
export const bookingDisplay = (b: {
  status: BookingStatus;
  rescheduledTo?: unknown;
  customer?: { isSystem?: boolean };
}) =>
  b.rescheduledTo
    ? { cls: BOOKING_STATUS.CANCELED.cls, icon: faCalendarDays }
    : b.customer?.isSystem && b.status !== 'CANCELED'
      ? { cls: 'blocked', icon: faLock }
      : BOOKING_STATUS[b.status];
