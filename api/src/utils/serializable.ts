import { AppError } from '../middleware/errorHandler';
import { Prisma } from '../../dist/generated/prisma';
import { prisma } from './prisma';
import { logger } from './logger';

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

/**
 * Retry policy. ONLY serialization failures are retried (40001 /
 * TransactionWriteConflict / P2034); domain errors (AppError), unique
 * violations and anything else propagate immediately. Retrying is capped by
 * attempt count AND total elapsed time, every retry is logged with its attempt
 * number, and what still fails becomes a clean 409.
 *
 * What is retried is the WHOLE transaction function, so it must be free of side
 * effects (emails etc. run in the controllers, after commit) and must read
 * everything it depends on inside the transaction, so a retry sees fresh data.
 */
export const SERIALIZABLE_RETRY = { maxAttempts: 5, maxElapsedMs: 3000 };

// In-process counters: for tests and quick diagnosis; not a metrics system.
export const retryStats = { retries: 0, succeededAfterRetry: 0, exhausted: 0 };
export const resetRetryStats = () => {
  retryStats.retries = 0;
  retryStats.succeededAfterRetry = 0;
  retryStats.exhausted = 0;
};

export interface RetryOptions {
  maxAttempts?: number;
  maxElapsedMs?: number;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const withSerializableRetry = async <T>(
  run: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> => {
  const maxAttempts = options.maxAttempts ?? SERIALIZABLE_RETRY.maxAttempts;
  const maxElapsedMs = options.maxElapsedMs ?? SERIALIZABLE_RETRY.maxElapsedMs;
  // performance.now(), not Date.now(): monotonic, and unaffected by clock changes.
  const started = performance.now();

  for (let attempt = 1; ; attempt++) {
    try {
      const result = await run();
      if (attempt > 1) {
        retryStats.succeededAfterRetry++;
        logger.info(
          { attempts: attempt },
          'serializable transaction succeeded after retry',
        );
      }
      return result;
    } catch (err) {
      if (!isSerializationFailure(err)) throw err;

      const elapsedMs = performance.now() - started;
      if (attempt >= maxAttempts || elapsedMs >= maxElapsedMs) {
        retryStats.exhausted++;
        logger.warn(
          { attempts: attempt, elapsedMs: Math.round(elapsedMs) },
          'serializable retries exhausted',
        );
        throw new AppError(
          409,
          'That time was just taken by another booking. Please try again.',
          'SLOT_TAKEN',
        );
      }

      retryStats.retries++;
      logger.warn(
        { attempt, maxAttempts },
        'serializable transaction conflict, retrying',
      );
      // Jittered back-off so contenders stop colliding in lockstep, never
      // sleeping past the total-time budget.
      await sleep(
        Math.min(Math.random() * 15 * attempt, maxElapsedMs - elapsedMs),
      );
    }
  }
};

/** The one place a serializable interactive transaction is started. Exposed as
 * an object so tests can make individual attempts fail (the Prisma client is a
 * proxy and cannot be spied on directly). */
export const txRunner = {
  run: <T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> =>
    prisma.$transaction(fn, { isolationLevel: 'Serializable' }),
};

export const serializableTransaction = <T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> => withSerializableRetry(() => txRunner.run(fn));
