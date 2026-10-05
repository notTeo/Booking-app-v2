// Mirrors isPlausiblePhone in api/src/validators/common.ts: digits with the
// usual separators and an optional leading '+', 7 to 15 digits in all.
const PHONE_CHARS = /^\+?[\d\s().-]+$/;

export const isPlausiblePhone = (value: string): boolean => {
  const phone = value.trim();
  if (!PHONE_CHARS.test(phone)) return false;
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15;
};
