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
 * The database's own overlap backstop (migration booking_no_overlap_constraint,
 * SQLSTATE 23P01 exclusion_violation) fired. The application's overlap check
 * normally answers first; this is what catches anything that slipped past it.
 * Shape with @prisma/adapter-pg: DriverAdapterError { cause.originalCode }.
 */
export const isExclusionViolation = (err: unknown): boolean => {
  const e = err as ErrLike | null;
  return !!e && (e.cause?.originalCode === '23P01' || e.code === '23P01');
};

/**
 * Retry policy. ONLY serialization failures are retried (40001 /
 * TransactionWriteConflict / P2034); domain errors (AppError), unique
 * violations and anything else propagate immediately.
 *
 * A request must NEVER hang, so time is bounded twice:
 *  - the whole operation gets one budget (SERIALIZABLE_RETRY.maxElapsedMs,
 *    3 s) and at most `maxAttempts` attempts, and
 *  - every attempt is handed the REMAINING budget as the transaction's own
 *    `timeout` / `maxWait`, which Prisma enforces by rolling the transaction
 *    back — so a single attempt stuck on a lock or a busy pool cannot outlive
 *    the budget either (racing a promise would not be safe: the transaction
 *    could still commit after we had already answered).
 *
 * When the budget or the attempts run out, the answer is a clean
 * 503 BOOKING_BUSY with Retry-After — never a hang, never a 500, and not a
 * misleading "slot taken" (the slot may well be free).
 *
 * What is retried is the WHOLE transaction function, so it must be free of
 * side effects (emails etc. run in the controllers, after commit) and must
 * read everything it depends on inside the transaction.
 */
export const SERIALIZABLE_RETRY = {
  maxAttempts: 5,
  maxElapsedMs: 3000,
  maxWaitMs: 500,
  minAttemptMs: 250,
};

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

/** What one attempt may spend. */
export interface AttemptBudget {
  timeoutMs: number;
  maxWaitMs: number;
}

// The attempt ran out of its budget: Prisma's own transaction timeout (P2028),
// or Postgres cancelling a statement (57014 statement_timeout) / a lock wait
// (55P03 lock_timeout) — the latter two via set_config in txRunner.run.
const BUDGET_SQLSTATES = ['57014', '55P03'];
const isBudgetExceeded = (err: unknown) => {
  const e = err as {
    code?: string;
    message?: string;
    cause?: { originalCode?: string };
  } | null;
  if (!e) return false;
  return (
    e.code === 'P2028' ||
    BUDGET_SQLSTATES.some(
      (c) =>
        e.cause?.originalCode === c || String(e.message).includes(`\`${c}\``),
    )
  );
};

const busy = () =>
  new AppError(
    503,
    'The booking system is busy right now. Please try again in a moment.',
    'BOOKING_BUSY',
    { 'Retry-After': '1' },
  );

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const withSerializableRetry = async <T>(
  run: (budget: AttemptBudget) => Promise<T>,
  options: RetryOptions = {},
): Promise<T> => {
  const maxAttempts = options.maxAttempts ?? SERIALIZABLE_RETRY.maxAttempts;
  const maxElapsedMs = options.maxElapsedMs ?? SERIALIZABLE_RETRY.maxElapsedMs;
  // performance.now(), not Date.now(): monotonic, and unaffected by clock changes.
  const started = performance.now();

  for (let attempt = 1; ; attempt++) {
    const remaining = maxElapsedMs - (performance.now() - started);
    try {
      const result = await run({
        timeoutMs: Math.max(remaining, SERIALIZABLE_RETRY.minAttemptMs),
        maxWaitMs: Math.max(
          Math.min(SERIALIZABLE_RETRY.maxWaitMs, remaining),
          50,
        ),
      });
      if (attempt > 1) {
        retryStats.succeededAfterRetry++;
        logger.info(
          { attempts: attempt },
          'serializable transaction succeeded after retry',
        );
      }
      return result;
    } catch (err) {
      const elapsedMs = performance.now() - started;

      if (isBudgetExceeded(err)) {
        // The attempt hit its budget and was rolled back. Not retried.
        retryStats.exhausted++;
        logger.warn(
          { attempts: attempt, elapsedMs: Math.round(elapsedMs) },
          'serializable transaction exceeded its time budget',
        );
        throw busy();
      }
      // Same answer the application's own overlap check gives. Not retried:
      // the slot is genuinely occupied.
      if (isExclusionViolation(err)) {
        throw new AppError(409, 'Time slot is already booked', 'SLOT_TAKEN');
      }
      if (!isSerializationFailure(err)) throw err;

      if (attempt >= maxAttempts || elapsedMs >= maxElapsedMs) {
        retryStats.exhausted++;
        logger.warn(
          { attempts: attempt, elapsedMs: Math.round(elapsedMs) },
          'serializable retries exhausted',
        );
        throw busy();
      }

      retryStats.retries++;
      logger.warn(
        { attempt, maxAttempts },
        'serializable transaction conflict, retrying',
      );
      // Jittered back-off so contenders stop colliding in lockstep, never
      // sleeping past the total-time budget.
      await sleep(
        Math.max(
          0,
          Math.min(Math.random() * 15 * attempt, maxElapsedMs - elapsedMs),
        ),
      );
    }
  }
};

/**
 * Isolation level of every booking transaction: READ COMMITTED, with a
 * per-provider advisory lock (lockProvider) instead of SERIALIZABLE.
 *
 * The "no overlapping bookings for one provider" invariant is enforced by the
 * Booking_no_overlap exclusion constraint, which is correct at any isolation
 * level. Under SERIALIZABLE the constraint's GiST index adds coarse page-level
 * predicate locks, so unrelated bookings falsely conflict: measured on a fresh
 * database, 3 of 10 runs of the 10-way concurrency test failed with
 * BOOKING_BUSY, against 0 of 8 before the constraint. Plain READ COMMITTED is
 * not enough either (racing customer upserts and overlap re-checks then fail
 * with 500s), so contenders for the SAME provider are made to queue on an
 * advisory lock: the second one then simply sees the first one's committed
 * booking and answers 409 through the ordinary overlap check. The constraint
 * stays as the backstop for anything that gets past it.
 */
export const BOOKING_TX_ISOLATION = 'ReadCommitted' as const;

/**
 * Serialises booking writes for one provider (UserShop id) until the
 * transaction ends. Call it FIRST, before reading anything the decision
 * depends on. A transaction takes at most one such lock, so two of them can
 * never deadlock each other. Waiting counts against the transaction's
 * lock_timeout, so a stuck holder becomes a clean BOOKING_BUSY, never a hang.
 */
export const lockProvider = async (
  tx: Prisma.TransactionClient,
  staffId: string,
): Promise<void> => {
  // $executeRaw: the function returns void, which $queryRaw cannot deserialize.
  await tx.$executeRaw`select pg_advisory_xact_lock(hashtextextended(${staffId}::text, 0))`;
};

/** The one place a booking interactive transaction is started. Exposed as
 * an object so tests can make individual attempts fail (the Prisma client is a
 * proxy and cannot be spied on directly). */
export const txRunner = {
  run: <T>(
    fn: (tx: Prisma.TransactionClient) => Promise<T>,
    budget: AttemptBudget = {
      timeoutMs: SERIALIZABLE_RETRY.maxElapsedMs,
      maxWaitMs: SERIALIZABLE_RETRY.maxWaitMs,
    },
  ): Promise<T> =>
    prisma.$transaction(
      async (tx) => {
        // Prisma's `timeout` only fires between statements; a statement stuck
        // on a lock or a slow plan would sail past it. Let Postgres enforce the
        // same budget from inside (transaction-local, undone at commit/rollback).
        await tx.$queryRaw`select
          set_config('statement_timeout', ${String(Math.ceil(budget.timeoutMs))}, true),
          set_config('lock_timeout', ${String(Math.ceil(Math.min(budget.timeoutMs, 1000)))}, true)`;
        return fn(tx);
      },
      {
        isolationLevel: BOOKING_TX_ISOLATION,
        timeout: budget.timeoutMs,
        maxWait: budget.maxWaitMs,
      },
    ),
};

export const serializableTransaction = <T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> => withSerializableRetry((budget) => txRunner.run(fn, budget));
