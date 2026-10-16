/**
 * The public pages used to keep a customer's contact details in this browser
 * ("remember my details"). The shop's API now knows a returning browser by a
 * cookie and sends the details it has, so nothing is stored here any more:
 * what an earlier visit left behind is removed.
 */
const STALE_KEYS = (key: string) => key === 'booking-details' || key.startsWith('customer-photo-added:');

export function forgetSavedCustomer() {
  try {
    Object.keys(localStorage).filter(STALE_KEYS).forEach((key) => localStorage.removeItem(key));
  } catch {
    // Blocked storage: there was nothing to keep, so there is nothing to remove.
  }
}
