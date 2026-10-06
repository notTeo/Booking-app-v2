// Shared across validators so every field with the same shape (a customer's
// name, phone, or free-text notes) enforces the same limit, in one place.

export const NAME_MAX_LENGTH = 100;
export const NOTES_MAX_LENGTH = 1000;
export const DESCRIPTION_MAX_LENGTH = 2000;
export const ADDRESS_MAX_LENGTH = 300;
// Far above any real password, well below what is worth hashing.
export const PASSWORD_MAX_LENGTH = 128;
// Highest price a service or product may have, in cents.
export const PRICE_MAX_CENTS = 10_000_000;

// Lenient by design: this only needs to catch obvious garbage (empty
// separators, letters, an essay pasted into the field), never reject a real
// phone number over a formatting quirk. Strips common separators (spaces,
// dashes, dots, parens) and an optional leading '+', then requires what's
// left to be 7-15 digits — covers realistic phone numbers worldwide (E.164
// caps at 15) without asserting a specific country's format.
const PHONE_CHARS = /^\+?[\d\s().-]+$/;

export const isPlausiblePhone = (value: unknown): boolean => {
  if (typeof value !== 'string' || !PHONE_CHARS.test(value)) return false;
  const digits = value.replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15;
};

// A full timestamp with an explicit offset or Z, that Date can parse.
// isISO8601() alone also lets through week dates, ordinal dates, the basic
// format and times with no offset, which are then read in the server's zone
// or not at all.
const INSTANT =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/;

export const isInstant = (value: unknown): boolean =>
  typeof value === 'string' &&
  INSTANT.test(value) &&
  !Number.isNaN(new Date(value).getTime());
