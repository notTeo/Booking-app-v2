// Reads a string field from an axios error's response body. Errors reach
// `catch` as `unknown`; anything that isn't a string (no response, network
// error, unexpected body) yields undefined so callers fall back to their own
// message.
const readField = (err: unknown, field: string): string | undefined => {
  const value = (
    err as { response?: { data?: Record<string, unknown> } } | null | undefined
  )?.response?.data?.[field];
  return typeof value === 'string' ? value : undefined;
};

/** The API's `message`, or `fallback` when there isn't one. */
export const apiErrorMessage = (err: unknown, fallback: string): string =>
  readField(err, 'message') ?? fallback;

/** Another body field (e.g. `error`), or '' when absent. */
export const apiErrorField = (err: unknown, field: string): string =>
  readField(err, field) ?? '';

/** A 409 CONFLICT_REFERENCED: the row is still referenced by other records (e.g. a member with bookings). */
export const isReferencedConflict = (err: unknown): boolean =>
  (err as { response?: { status?: number } } | null | undefined)?.response?.status === 409 &&
  readField(err, 'code') === 'CONFLICT_REFERENCED';
