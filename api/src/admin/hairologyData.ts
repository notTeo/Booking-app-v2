// What the Hairology seed creates. These values are PLACEHOLDERS: they end up
// on the shop's public booking page, so the seed refuses to run until the
// owner has replaced them with the real team, services, prices and opening
// hours and flipped CONFIRMED to true.
export const HAIROLOGY_DATA_CONFIRMED = false;

export const HAIROLOGY = {
  slug: 'hairology',
  shopName: 'Hairology',
  timezone: 'Europe/Athens',

  // Extra bookable team members besides the owner (who is always added).
  // They have no login; the owner can invite them from the Team page.
  staff: [] as { name: string }[],

  // price is in cents; duration in minutes.
  services: [{ name: 'Haircut', duration: 30, price: 2000 }] as {
    name: string;
    duration: number;
    price: number;
  }[],

  // Weekly opening hours, 24h "HH:mm". A day missing or `null` = closed.
  hours: {
    MON: [{ startTime: '10:00', endTime: '20:00' }],
    TUE: [{ startTime: '10:00', endTime: '20:00' }],
    WED: [{ startTime: '10:00', endTime: '20:00' }],
    THU: [{ startTime: '10:00', endTime: '20:00' }],
    FRI: [{ startTime: '10:00', endTime: '20:00' }],
    SAT: [{ startTime: '10:00', endTime: '16:00' }],
    SUN: null,
  } as Record<
    'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN',
    { startTime: string; endTime: string }[] | null
  >,
};
