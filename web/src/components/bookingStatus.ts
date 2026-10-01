import { faBan, faCalendarCheck, faCircleCheck, faClock, faXmark, type IconDefinition } from '@fortawesome/free-solid-svg-icons';
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
