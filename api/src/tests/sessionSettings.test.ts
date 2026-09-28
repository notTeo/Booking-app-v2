import { describe, it, expect } from 'vitest';
import { prisma } from '../utils/prisma';
import { txRunner } from '../utils/serializable';

// The per-attempt time budget is applied with set_config(..., is_local = true),
// i.e. SET LOCAL: it must vanish when the transaction ends. If it were
// session-level it would stick to the pooled connection and silently cap
// every later, unrelated query on it (e.g. a long report) at a few seconds.
type Row = { statement_timeout: string; lock_timeout: string };

const settings = () =>
  // pg_sleep (in FROM, so its void result isn't selected) keeps each
  // connection busy so concurrent calls fan out over the whole pool instead of
  // reusing one idle connection.
  prisma.$queryRaw<
    Row[]
  >`select current_setting('statement_timeout') as statement_timeout,
                                 current_setting('lock_timeout') as lock_timeout
                          from pg_sleep(0.05)`;

describe('transaction time budgets are transaction-scoped (SET LOCAL semantics)', () => {
  it('inside the transaction the budget is applied', async () => {
    const inside = await txRunner.run(
      async (tx) =>
        (
          await tx.$queryRaw<
            Row[]
          >`select current_setting('statement_timeout') as statement_timeout,
                                           current_setting('lock_timeout') as lock_timeout`
        )[0],
      { timeoutMs: 1234, maxWaitMs: 500 },
    );
    expect(inside.statement_timeout).toBe('1234ms');
    expect(inside.lock_timeout).toBe('1s'); // min(budget, 1000 ms), as Postgres prints it
  });

  it('after transactions (commit AND rollback) every pooled connection is back to the defaults', async () => {
    // Touch many pooled connections with committed and rolled-back transactions.
    const budget = { timeoutMs: 777, maxWaitMs: 500 };
    await Promise.all(
      Array.from({ length: 12 }, (_, i) =>
        txRunner
          .run(async (tx) => {
            await tx.$queryRaw`select pg_sleep(0.03)`;
            if (i % 2) throw new Error('force rollback');
          }, budget)
          .catch(() => undefined),
      ),
    );

    // Sample the whole pool with plain (non-transaction) queries.
    const rows = (
      await Promise.all(Array.from({ length: 12 }, settings))
    ).flat();
    expect(rows).toHaveLength(12);
    for (const r of rows) {
      expect(r.statement_timeout).toBe('0'); // Postgres default = no timeout
      expect(r.lock_timeout).toBe('0');
    }
  });
});
