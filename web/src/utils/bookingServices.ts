interface Named {
  service: { name: string; price?: number };
  services?: { name: string; price?: number }[];
}

/** "Haircut + Beard": every service of a booking, in order. */
export const bookingServiceNames = (b: Named) =>
  b.services && b.services.length > 0 ? b.services.map((s) => s.name).join(' + ') : b.service.name;

/** What a booking's services cost together, in cents. */
export const bookingServicesPrice = (b: { service: { price: number }; services?: { price: number }[] }) =>
  b.services && b.services.length > 0 ? b.services.reduce((sum, s) => sum + s.price, 0) : b.service.price;
