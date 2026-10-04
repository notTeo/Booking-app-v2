/**
 * The public booking page can remember a customer's contact details in this
 * browser, and only when they tick "remember my details". Nothing here is
 * sent to the server; unticking the box removes the entry.
 */

const STORAGE_KEY = 'booking-details';
// Kept for a year after the last booking, then dropped on the next read.
const MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000;
const NAME_MAX_LENGTH = 100;
const PHONE_MAX_LENGTH = 30;
const EMAIL_MAX_LENGTH = 254;

export interface SavedCustomer {
  name: string;
  phone: string;
  email: string;
}

/** What is stored may be stale, hand-edited or written by an older build: anything unexpected reads as "nothing saved". */
export function parseSavedCustomer(raw: string | null, now: number): SavedCustomer | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== 'object' || value === null) return null;
    const { name, phone, email, savedAt } = value as Record<string, unknown>;
    if (typeof name !== 'string' || typeof phone !== 'string' || typeof email !== 'string') return null;
    if (typeof savedAt !== 'number' || !Number.isFinite(savedAt) || now - savedAt > MAX_AGE_MS) return null;
    return {
      name: name.slice(0, NAME_MAX_LENGTH),
      phone: phone.slice(0, PHONE_MAX_LENGTH),
      email: email.slice(0, EMAIL_MAX_LENGTH),
    };
  } catch {
    return null;
  }
}

export function readSavedCustomer(): SavedCustomer | null {
  try {
    return parseSavedCustomer(localStorage.getItem(STORAGE_KEY), Date.now());
  } catch {
    return null;
  }
}

export function saveCustomer(details: SavedCustomer) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...details, savedAt: Date.now() }));
  } catch {
    // Private mode or blocked storage: the details just won't be remembered.
  }
}

export function clearSavedCustomer() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing was stored, so there is nothing to remove.
  }
}
