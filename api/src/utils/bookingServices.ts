// A booking's services are its BookingService lines (the first is also
// Booking.serviceId). These read them, falling back to the primary service for
// a booking loaded without them.
interface Line {
  name: string;
  duration: number;
  price: number;
}

interface WithServices {
  service: { name: string; price: number };
  services?: Line[];
}

export const MAX_SERVICES_PER_BOOKING = 5;

/** "Haircut + Beard": every service of a booking, in order. */
export const bookingServiceNames = (b: WithServices) =>
  b.services && b.services.length > 0
    ? b.services.map((s) => s.name).join(' + ')
    : b.service.name;

/** What the services cost together, in cents. */
export const bookingServicesPrice = (b: WithServices) =>
  b.services && b.services.length > 0
    ? b.services.reduce((sum, s) => sum + s.price, 0)
    : b.service.price;

/** The `serviceIds` query parameter ("a,b,c"), or undefined when there is none. */
export const parseServiceIds = (raw: unknown): string[] | undefined => {
  if (typeof raw !== 'string' || raw.trim() === '') return undefined;
  const ids = raw
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
  return ids.length > 0 ? ids : undefined;
};
