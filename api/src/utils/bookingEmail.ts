import type { BookingEmailParams } from '../services/email.service';
import { emailStrings } from '../services/emailStrings';
import { parseLocale } from './locale';

/** The customer-email fields of a booking loaded with shop, service and staff. */
export const bookingEmailParams = (booking: {
  cancelToken: string | null;
  locale: string;
  startTime: Date;
  endTime: Date;
  customer: { name: string; email: string | null };
  service: { name: string };
  staff: { name: string | null };
  shop: {
    name: string;
    timezone: string;
    formattedAddress: string | null;
    customerRescheduleEnabled: boolean;
    cancelCutoffHours: number;
    rescheduleCutoffHours: number;
  };
}): BookingEmailParams | null => {
  // No address to write to, or no token to build the links from.
  if (!booking.customer.email || !booking.cancelToken) return null;
  const locale = parseLocale(booking.locale);
  return {
    email: booking.customer.email,
    customerName: booking.customer.name,
    shopName: booking.shop.name,
    serviceName: booking.service.name,
    staffName: booking.staff.name ?? emailStrings[locale].staffFallback,
    startTime: booking.startTime,
    endTime: booking.endTime,
    timezone: booking.shop.timezone,
    formattedAddress: booking.shop.formattedAddress,
    cancelToken: booking.cancelToken,
    canReschedule: booking.shop.customerRescheduleEnabled,
    cancelCutoffHours: booking.shop.cancelCutoffHours,
    rescheduleCutoffHours: booking.shop.rescheduleCutoffHours,
    locale,
  };
};
