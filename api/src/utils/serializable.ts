import { AppError } from '../middleware/errorHandler';

/**
 * Serializable transactions are how a booking claims a provider's time: the
 * overlap check and the write must be atomic. Under contention Postgres
 * aborts one side with a serialization failure (SQLSTATE 40001) — that is
 * expected behaviour, not an error to surface. It can also abort transactions
 * that do not logically conflict, so it is RETRIED; whatever still fails after
 * the retries is reported as a clean 409, never a 500.
 *
 * With @prisma/adapter-pg the failure does not arrive as Prisma's P2034; it is
 * a DriverAdapterError { kind: 'TransactionWriteConflict', cause.originalCode
 * '40001' } — so all known shapes are recognised here.
 */
type ErrLike = {
  code?: string;
  name?: string;
  message?: string;
  cause?: { kind?: string; originalCode?: string };
};

export const isSerializationFailure = (err: unknown): boolean => {
  const e = err as ErrLike | null;
  if (!e) return false;
  return (
    e.code === 'P2034' ||
    e.cause?.originalCode === '40001' ||
    e.cause?.kind === 'TransactionWriteConflict' ||
    (e.name === 'DriverAdapterError' &&
      e.message === 'TransactionWriteConflict')
  );
};

// Two concurrent first bookings by the same phone number race on the
// (shopId, phone) customer upsert. Retrying makes the loser find the row.
export const isUniqueViolation = (err: unknown): boolean => {
  const e = err as ErrLike | null;
  if (!e) return false;
  return (
    e.code === 'P2002' ||
    e.cause?.originalCode === '23505' ||
    e.cause?.kind === 'UniqueConstraintViolation'
  );
};

const isRetryable = (err: unknown) =>
  isSerializationFailure(err) || isUniqueViolation(err);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const withSerializableRetry = async <T>(
  run: () => Promise<T>,
  attempts = 6,
): Promise<T> => {
  for (let attempt = 1; ; attempt++) {
    try {
      return await run();
    } catch (err) {
      if (!isRetryable(err)) throw err;
      if (attempt >= attempts) {
        throw new AppError(
          409,
          'That time was just taken by another booking. Please try again.',
          'SLOT_TAKEN',
        );
      }
      // Small jittered back-off so the contenders stop colliding in lockstep.
      await sleep(Math.random() * 15 * attempt);
    }
  }
};
