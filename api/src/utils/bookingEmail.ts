import type { BookingEmailParams } from '../services/email.service';
import { emailStrings } from '../services/emailStrings';
import { parseLocale } from './locale';
import { bookingServiceNames, bookingServicesPrice } from './bookingServices';

/** The customer-email fields of a booking loaded with shop, service and staff. */
export const bookingEmailParams = (booking: {
  cancelToken: string | null;
  contactEmail?: string | null;
  locale: string;
  startTime: Date;
  endTime: Date;
  customer: { name: string; email: string | null };
  service: { name: string; price: number };
  services?: { name: string; duration: number; price: number }[];
  staff: { name: string | null };
  products?: { name: string; quantity: number; unitPrice: number }[];
  shop: {
    name: string;
    timezone: string;
    formattedAddress: string | null;
    customerRescheduleEnabled: boolean;
    cancelCutoffHours: number;
    rescheduleCutoffHours: number;
  };
}): BookingEmailParams | null => {
  // The address typed for this booking comes first; the customer's own is the
  // fallback (a booking the shop made, or one from before contactEmail).
  const email = booking.contactEmail || booking.customer.email;
  // No address to write to, or no token to build the links from.
  if (!email || !booking.cancelToken) return null;
  const locale = parseLocale(booking.locale);
  return {
    email,
    customerName: booking.customer.name,
    shopName: booking.shop.name,
    serviceName: bookingServiceNames(booking),
    staffName: booking.staff.name ?? emailStrings[locale].staffFallback,
    startTime: booking.startTime,
    endTime: booking.endTime,
    timezone: booking.shop.timezone,
    formattedAddress: booking.shop.formattedAddress,
    cancelToken: booking.cancelToken,
    canReschedule: booking.shop.customerRescheduleEnabled,
    cancelCutoffHours: booking.shop.cancelCutoffHours,
    rescheduleCutoffHours: booking.shop.rescheduleCutoffHours,
    servicePrice: bookingServicesPrice(booking),
    products: booking.products
      ?.filter((p) => p.quantity > 0)
      .map(({ name, quantity, unitPrice }) => ({ name, quantity, unitPrice })),
    locale,
  };
};
