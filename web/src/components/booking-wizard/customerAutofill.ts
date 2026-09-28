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
