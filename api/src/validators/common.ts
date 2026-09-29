// Shared across validators so every field with the same shape (a customer's
// name, phone, or free-text notes) enforces the same limit, in one place.

export const NAME_MAX_LENGTH = 100;
export const NOTES_MAX_LENGTH = 1000;

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
