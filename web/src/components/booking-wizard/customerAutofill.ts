/**
 * The owner wizard's phone field looks up existing customers. What the look-up
 * may do to the form is deliberately small: it may FILL an empty field, and it
 * must never clear or overwrite anything the user typed.
 */

/** Keep `current` if the user typed anything; otherwise take the looked-up value. */
export const fillIfEmpty = (current: string, incoming: string | null | undefined): string =>
  current.trim() === '' ? (incoming ?? '') : current;

const digitsOnly = (v: string) => v.replace(/\D/g, '');

/** Same phone number, ignoring spaces, dashes, "+" etc. Empty never matches. */
export const isExactPhoneMatch = (typed: string, candidate: string): boolean => {
  const a = digitsOnly(typed);
  return a !== '' && a === digitsOnly(candidate);
};

/**
 * Whether typing in the phone field should look the customer up. A member who
 * may not see customer details gets no look-up at all: the API returns nothing
 * for them, and a "new customer" hint would be a guess, not a fact.
 */
export const shouldLookUpCustomer = (canViewCustomerDetails: boolean, phone: string): boolean =>
  canViewCustomerDetails && phone.trim().length >= 2;
