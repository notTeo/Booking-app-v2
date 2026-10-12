// Mirrors isPlausiblePhone in api/src/validators/common.ts: digits with the
// usual separators and an optional leading '+', 7 to 15 digits in all.
const PHONE_CHARS = /^\+?[\d\s().-]+$/;

export const isPlausiblePhone = (value: string): boolean => {
  const phone = value.trim();
  if (!PHONE_CHARS.test(phone)) return false;
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15;
};

// A number typed without a country code is taken to be one of this country's.
export const DEFAULT_CALLING_CODE = '30';

// The country codes offered beside a phone field, Greece first. No code is the
// start of another, so a stored number has at most one of them in front.
export const CALLING_CODES: readonly { iso: string; code: string }[] = [
  { iso: 'GR', code: '30' },
  { iso: 'CY', code: '357' },
  { iso: 'AL', code: '355' },
  { iso: 'AT', code: '43' },
  { iso: 'AU', code: '61' },
  { iso: 'BE', code: '32' },
  { iso: 'BG', code: '359' },
  { iso: 'CH', code: '41' },
  { iso: 'CZ', code: '420' },
  { iso: 'DE', code: '49' },
  { iso: 'DK', code: '45' },
  { iso: 'EE', code: '372' },
  { iso: 'EG', code: '20' },
  { iso: 'ES', code: '34' },
  { iso: 'FI', code: '358' },
  { iso: 'FR', code: '33' },
  { iso: 'GB', code: '44' },
  { iso: 'GE', code: '995' },
  { iso: 'HR', code: '385' },
  { iso: 'HU', code: '36' },
  { iso: 'IE', code: '353' },
  { iso: 'IL', code: '972' },
  { iso: 'IN', code: '91' },
  { iso: 'IT', code: '39' },
  { iso: 'LT', code: '370' },
  { iso: 'LU', code: '352' },
  { iso: 'LV', code: '371' },
  { iso: 'MK', code: '389' },
  { iso: 'MT', code: '356' },
  { iso: 'NL', code: '31' },
  { iso: 'NO', code: '47' },
  { iso: 'PL', code: '48' },
  { iso: 'PT', code: '351' },
  { iso: 'RO', code: '40' },
  { iso: 'RS', code: '381' },
  { iso: 'RU', code: '7' },
  { iso: 'SE', code: '46' },
  { iso: 'SI', code: '386' },
  { iso: 'SK', code: '421' },
  { iso: 'TR', code: '90' },
  { iso: 'UA', code: '380' },
  { iso: 'US', code: '1' },
];

// Mirrors normalizePhone in api/src/validators/common.ts: the one stored form
// of a phone number, + and the country code, then digits.
export const normalizePhone = (value: string): string => {
  const digits = value.replace(/\D/g, '');
  if (value.trim().startsWith('+')) return `+${digits}`;
  if (digits.startsWith('00')) return `+${digits.slice(2)}`;
  if (digits.length === 12 && digits.startsWith(DEFAULT_CALLING_CODE)) return `+${digits}`;
  return `+${DEFAULT_CALLING_CODE}${digits}`;
};

/** A number's country code and the rest. `code` is '' for a code not in the list: `national` is then every digit. */
export const splitPhone = (value: string): { code: string; national: string } => {
  const digits = normalizePhone(value).slice(1);
  const known = CALLING_CODES.find((c) => digits.startsWith(c.code));
  return known ? { code: known.code, national: digits.slice(known.code.length) } : { code: '', national: digits };
};

/** "6941234567" → "694 123 4567": threes, with a lone last digit joining the group before it. */
export const groupDigits = (digits: string): string => {
  const groups = digits.match(/\d{1,3}/g) ?? [];
  if (groups.length > 1 && groups[groups.length - 1].length === 1) {
    const last = groups.pop()!;
    groups[groups.length - 1] += last;
  }
  return groups.join(' ');
};

/** A stored phone number as it is shown: "+30 694 123 4567". Anything else (an old or empty value) is shown as it is. */
export const formatPhone = (value: string | null | undefined): string => {
  if (!value || !/^\+\d+$/.test(value)) return value ?? '';
  const { code, national } = splitPhone(value);
  if (!code) return value;
  return national ? `+${code} ${groupDigits(national)}` : `+${code}`;
};
