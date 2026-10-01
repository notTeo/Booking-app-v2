import { describe, it, expect, vi, afterEach } from 'vitest';
import app from '../app';
import { serve } from './testRequest';
import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';
import {
  addWeeklySchedule,
  authHeader,
  createBookingRow,
  createTenant,
  type Tenant,
} from './helpers';
import * as email from '../services/email.service';
import {
  SERIALIZABLE_RETRY,
  retryStats,
  resetRetryStats,
  txRunner,
  withSerializableRetry,
} from '../utils/serializable';

const api = await serve(app);

vi.mock('../services/email.service', () => ({
  sendBookingConfirmationEmail: vi.fn().mockResolvedValue(undefined),
  sendNewBookingNotificationEmail: vi.fn().mockResolvedValue(undefined),
  sendCancellationConfirmationEmail: vi.fn().mockResolvedValue(undefined),
}));

const SLOT = '2026-12-08T10:00:00+02:00';

const conflict = () =>
  Object.assign(new Error('TransactionWriteConflict'), {
    name: 'DriverAdapterError',
    cause: { kind: 'TransactionWriteConflict', originalCode: '40001' },
  });

async function shop() {
  const t = await createTenant('Retry');
  await addWeeklySchedule(t);
  return t;
}

/**
 * Makes the FIRST serializable transaction fail with a serialization error
 * AFTER `whileFailing` has changed the database — i.e. the world moves on
 * between attempts. Later attempts run for real. Anything the booking depends
 * on that was read before the transaction and reused would now be stale.
 */
function failFirstAttempt(whileFailing: () => Promise<unknown>) {
  const real = txRunner.run.bind(txRunner) as (...a: unknown[]) => unknown;
  let calls = 0;
  const spy = vi.spyOn(txRunner, 'run').mockImplementation(((
    ...args: unknown[]
  ) => {
    calls++;
    if (calls === 1) {
      return (async () => {
        await whileFailing();
        throw conflict();
      })();
    }
    return real(...args);
  }) as never);
  return { calls: () => calls, spy };
}

const pub = (t: Tenant, extra: object = {}) =>
  api.post(`/public/${t.shop.slug}/book`).send({
    name: 'Cust',
    phone: '6911111111',
    email: 'cust@example.com',
    serviceId: t.service.id,
    staffId: t.staff.id,
    startTime: SLOT,
    ...extra,
  });

afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
  resetRetryStats();
});

describe('a retried booking re-reads everything it depends on (nothing stale)', () => {
  it('public: staff deactivated between attempts -> not booked (400)', async () => {
    const t = await shop();
    failFirstAttempt(() =>
      prisma.userShop.update({
        where: { id: t.staff.id },
        data: { active: false },
      }),
    );
    const res = await pub(t);
    expect(res.status).toBe(400);
    expect(await prisma.booking.count()).toBe(0);
  });

  it('public: service duration changed between attempts -> booking uses the NEW duration', async () => {
    const t = await shop();
    failFirstAttempt(() =>
      prisma.service.update({
        where: { id: t.service.id },
        data: { duration: 60 },
      }),
    );
    const res = await pub(t);
    expect(res.status).toBe(201);
    expect(
      new Date(res.body.data.endTime).getTime() - new Date(SLOT).getTime(),
    ).toBe(60 * 60_000);
  });

  it('public: shop closed that day between attempts -> 422 SHOP_CLOSED', async () => {
    const t = await shop();
    failFirstAttempt(() =>
      prisma.shopWorkingSchedule.deleteMany({ where: { shopId: t.shop.id } }),
    );
    const res = await pub(t);
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('SHOP_CLOSED');
  });

  it('public: shop deactivated between attempts -> 404', async () => {
    const t = await shop();
    failFirstAttempt(() =>
      prisma.shop.update({
        where: { id: t.shop.id },
        data: { isActive: false },
      }),
    );
    expect((await pub(t)).status).toBe(404);
    expect(await prisma.booking.count()).toBe(0);
  });

  it('public: an INACTIVE shop cannot be booked at all (404), like its slots and info', async () => {
    const t = await shop();
    await prisma.shop.update({
      where: { id: t.shop.id },
      data: { isActive: false },
    });
    expect((await pub(t)).status).toBe(404);
  });

  it('owner: membership revoked between attempts -> 404, nothing booked', async () => {
    const t = await shop();
    // revoke the login link (the membership row itself is referenced elsewhere)
    failFirstAttempt(() =>
      prisma.userShop.update({
        where: { id: t.staff.id },
        data: { userId: null },
      }),
    );
    const res = await api
      .post(`/api/shops/${t.shop.id}/bookings`)
      .set(authHeader(t.token))
      .send({
        name: 'C',
        phone: '6922222222',
        serviceId: t.service.id,
        staffId: t.staff.id,
        startTime: SLOT,
      });
    expect(res.status).toBe(404);
    expect(await prisma.booking.count({ where: { shopId: t.shop.id } })).toBe(
      0,
    );
  });

  it('PATCH: booking moved by someone else between attempts -> recomputed from the FRESH row', async () => {
    const t = await shop();
    const long = await prisma.service.create({
      data: { shopId: t.shop.id, name: 'L', duration: 60, price: 1 },
    });
    const b = await createBookingRow(t, new Date(SLOT).toISOString());
    const moved = new Date('2026-12-08T11:00:00+02:00');
    failFirstAttempt(() =>
      prisma.booking.update({
        where: { id: b.id },
        data: {
          startTime: moved,
          endTime: new Date(moved.getTime() + 30 * 60_000),
        },
      }),
    );
    const res = await api
      .patch(`/api/shops/${t.shop.id}/bookings/${b.id}`)
      .set(authHeader(t.token))
      .send({ serviceId: long.id });
    expect(res.status).toBe(200);
    expect(res.body.data.startTime).toBe(moved.toISOString());
    expect(res.body.data.endTime).toBe(
      new Date(moved.getTime() + 60 * 60_000).toISOString(),
    );
  });

  it('PATCH: booking deleted between attempts -> 404', async () => {
    const t = await shop();
    const long = await prisma.service.create({
      data: { shopId: t.shop.id, name: 'L', duration: 60, price: 1 },
    });
    const b = await createBookingRow(t, new Date(SLOT).toISOString());
    failFirstAttempt(() => prisma.booking.delete({ where: { id: b.id } }));
    const res = await api
      .patch(`/api/shops/${t.shop.id}/bookings/${b.id}`)
      .set(authHeader(t.token))
      .send({ serviceId: long.id });
    expect(res.status).toBe(404);
  });

  it('status re-activation: booking deleted between attempts -> 404', async () => {
    const t = await shop();
    const b = await createBookingRow(
      t,
      new Date(SLOT).toISOString(),
      'CANCELED',
    );
    failFirstAttempt(() => prisma.booking.delete({ where: { id: b.id } }));
    const res = await api
      .patch(`/api/shops/${t.shop.id}/bookings/${b.id}/status`)
      .set(authHeader(t.token))
      .send({ status: 'CONFIRMED' });
    expect(res.status).toBe(404);
  });
});

describe('side effects only happen after a successful commit', () => {
  it('a booking that needed a retry sends each email exactly once', async () => {
    const t = await shop();
    await prisma.userShop.update({
      where: { id: t.staff.id },
      data: { email: 'owner@example.com' },
    });
    const f = failFirstAttempt(async () => undefined);
    const res = await pub(t);
    expect(res.status).toBe(201);
    expect(f.calls()).toBe(2);
    await vi.waitFor(() => {
      expect(email.sendBookingConfirmationEmail).toHaveBeenCalledTimes(1);
      expect(email.sendNewBookingNotificationEmail).toHaveBeenCalledTimes(1);
    });
  });

  it('a booking that ultimately fails (409/422/400) sends no email at all', async () => {
    const t = await shop();
    expect((await pub(t)).status).toBe(201);
    vi.clearAllMocks();
    expect((await pub(t, { phone: '6933333333' })).status).toBe(409); // slot taken
    expect(
      (await pub(t, { startTime: '2026-11-30T10:00:00+02:00' })).status,
    ).toBe(422);
    expect((await pub(t, { staffId: 'nope' })).status).toBe(400);
    await new Promise((r) => setTimeout(r, 50));
    expect(email.sendBookingConfirmationEmail).not.toHaveBeenCalled();
    expect(email.sendNewBookingNotificationEmail).not.toHaveBeenCalled();
  });

  it('exhausted retries send no email and write nothing', async () => {
    const t = await shop();
    vi.spyOn(txRunner, 'run').mockImplementation((() =>
      Promise.reject(conflict())) as never);
    const res = await pub(t);
    expect(res.status).toBe(503);
    expect(res.body.code).toBe('BOOKING_BUSY');
    await new Promise((r) => setTimeout(r, 50));
    expect(email.sendBookingConfirmationEmail).not.toHaveBeenCalled();
  });
});

describe('withSerializableRetry: what is retried, and the caps', () => {
  it('retries ONLY serialization failures (40001 / TransactionWriteConflict / P2034)', async () => {
    for (const err of [
      conflict(),
      Object.assign(new Error('x'), { code: 'P2034' }),
      Object.assign(new Error('x'), { cause: { originalCode: '40001' } }),
    ]) {
      const run = vi.fn().mockRejectedValueOnce(err).mockResolvedValue('ok');
      expect(await withSerializableRetry(run)).toBe('ok');
      expect(run).toHaveBeenCalledTimes(2);
    }
  });

  it.each([
    [
      'unique violation P2002',
      Object.assign(new Error('u'), { code: 'P2002' }),
    ],
    [
      'unique violation 23505',
      Object.assign(new Error('u'), { cause: { originalCode: '23505' } }),
    ],
    ['a generic Error', new Error('boom')],
  ])('does NOT retry %s (one attempt, error propagates)', async (_n, err) => {
    const run = vi.fn().mockRejectedValue(err);
    await expect(withSerializableRetry(run)).rejects.toBe(err);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('a domain AppError (e.g. 409 overlap) is not retried', async () => {
    const { AppError } = await import('../middleware/errorHandler');
    const err = new AppError(409, 'taken', 'SLOT_TAKEN');
    const run = vi.fn().mockRejectedValue(err);
    await expect(withSerializableRetry(run)).rejects.toBe(err);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it(`is capped at ${SERIALIZABLE_RETRY.maxAttempts} attempts, then a clean 503 BOOKING_BUSY`, async () => {
    const run = vi.fn().mockRejectedValue(conflict());
    await expect(withSerializableRetry(run)).rejects.toMatchObject({
      statusCode: 503,
      code: 'BOOKING_BUSY',
    });
    expect(run).toHaveBeenCalledTimes(SERIALIZABLE_RETRY.maxAttempts);
    expect(retryStats.exhausted).toBe(1);
  });

  it('is also capped by TOTAL elapsed time', async () => {
    const run = vi.fn(async () => {
      await new Promise((r) => setTimeout(r, 40));
      throw conflict();
    });
    const t0 = performance.now();
    await expect(
      withSerializableRetry(run, { maxAttempts: 100, maxElapsedMs: 100 }),
    ).rejects.toMatchObject({ statusCode: 503 });
    expect(performance.now() - t0).toBeLessThan(400);
    expect(run.mock.calls.length).toBeGreaterThan(1);
    expect(run.mock.calls.length).toBeLessThan(10);
  });

  it('logs every retry with its attempt number, and the exhaustion', async () => {
    const warn = vi
      .spyOn(logger, 'warn')
      .mockImplementation((() => undefined) as never);
    const run = vi.fn().mockRejectedValue(conflict());
    await expect(
      withSerializableRetry(run, { maxAttempts: 3 }),
    ).rejects.toBeDefined();
    const logged = warn.mock.calls.map(
      (c) => c[0] as { attempt?: number; attempts?: number },
    );
    expect(logged.filter((l) => l.attempt).map((l) => l.attempt)).toEqual([
      1, 2,
    ]);
    expect(logged.some((l) => l.attempts === 3)).toBe(true);
    expect(retryStats.retries).toBe(2);
  });

  it('counts a success that needed retries', async () => {
    const run = vi
      .fn()
      .mockRejectedValueOnce(conflict())
      .mockRejectedValueOnce(conflict())
      .mockResolvedValue('ok');
    await withSerializableRetry(run);
    expect(retryStats).toMatchObject({
      retries: 2,
      succeededAfterRetry: 1,
      exhausted: 0,
    });
  });
});

describe('a request can never hang: hard total time cap', () => {
  it('continuous serialization failures with slow attempts stop at ~3s with 503, not later', async () => {
    // Each attempt takes up to 700 ms but honours the budget it is given (as
    // Prisma\'s transaction timeout does), then fails with a conflict.
    const run = vi.fn(async (b?: { timeoutMs: number }) => {
      await new Promise((r) =>
        setTimeout(r, Math.min(700, b?.timeoutMs ?? 700)),
      );
      throw conflict();
    });
    const t0 = performance.now();
    await expect(
      withSerializableRetry(run, { maxAttempts: 100 }),
    ).rejects.toMatchObject({
      statusCode: 503,
      code: 'BOOKING_BUSY',
    });
    const elapsed = performance.now() - t0;
    expect(elapsed).toBeGreaterThan(SERIALIZABLE_RETRY.maxElapsedMs - 200);
    expect(elapsed).toBeLessThan(SERIALIZABLE_RETRY.maxElapsedMs + 400);
  }, 10_000);

  it('each attempt is handed the REMAINING time budget (it shrinks)', async () => {
    const budgets: number[] = [];
    const run = vi.fn(async (b?: { timeoutMs: number }) => {
      budgets.push(b!.timeoutMs);
      await new Promise((r) => setTimeout(r, 300));
      throw conflict();
    });
    await expect(
      withSerializableRetry(run, { maxAttempts: 100, maxElapsedMs: 1000 }),
    ).rejects.toBeDefined();
    expect(budgets.length).toBeGreaterThan(1);
    expect(budgets[0]).toBeLessThanOrEqual(1000);
    for (let i = 1; i < budgets.length; i++)
      expect(budgets[i]).toBeLessThan(budgets[i - 1]);
  });

  it('HTTP: continuous conflicts return 503 + Retry-After within the cap; nothing written, no email', async () => {
    const t = await shop();
    vi.spyOn(txRunner, 'run').mockImplementation((async (
      _fn: unknown,
      b?: { timeoutMs: number },
    ) => {
      await new Promise((r) =>
        setTimeout(r, Math.min(600, b?.timeoutMs ?? 600)),
      );
      throw conflict();
    }) as never);
    const t0 = performance.now();
    const res = await pub(t);
    const elapsed = performance.now() - t0;
    expect(res.status).toBe(503);
    expect(res.body.code).toBe('BOOKING_BUSY');
    expect(res.headers['retry-after']).toBe('1');
    expect(elapsed).toBeLessThan(SERIALIZABLE_RETRY.maxElapsedMs + 500);
    expect(await prisma.booking.count()).toBe(0);
    await new Promise((r) => setTimeout(r, 50));
    expect(email.sendBookingConfirmationEmail).not.toHaveBeenCalled();
  }, 10_000);

  it('REAL DB: an attempt stuck in a slow query is cancelled at its budget -> 503, quickly', async () => {
    const t0 = performance.now();
    await expect(
      withSerializableRetry(
        (budget) =>
          txRunner.run(async (tx) => {
            await tx.$queryRaw`select pg_sleep(2)`;
          }, budget),
        { maxElapsedMs: 400 },
      ),
    ).rejects.toMatchObject({ statusCode: 503, code: 'BOOKING_BUSY' });
    expect(performance.now() - t0).toBeLessThan(1200);
  });

  for (const kind of ['raw SQL', 'ORM call'] as const) {
    it(`REAL DB: an attempt waiting on a lock held by another transaction gives up at its budget -> 503 (${kind})`, async () => {
      const t = await createTenant('Lock');
      let release!: () => void;
      const held = new Promise<void>((r) => (release = r));
      const holder = prisma.$transaction(async (tx) => {
        await tx.$queryRaw`select id from "Shop" where id = ${t.shop.id} for update`;
        await held;
      });
      await new Promise((r) => setTimeout(r, 200)); // let the holder take the lock
      const t0 = performance.now();
      try {
        await expect(
          withSerializableRetry(
            (budget) =>
              txRunner.run(async (tx) => {
                if (kind === 'raw SQL') {
                  await tx.$queryRaw`update "Shop" set name = 'blocked' where id = ${t.shop.id}`;
                } else {
                  await tx.shop.update({
                    where: { id: t.shop.id },
                    data: { name: 'blocked' },
                  });
                }
              }, budget),
            { maxElapsedMs: 500 },
          ),
        ).rejects.toMatchObject({ statusCode: 503, code: 'BOOKING_BUSY' });
        expect(performance.now() - t0).toBeLessThan(1500);
      } finally {
        release();
        await holder;
      }
    });
  }

  it('a transaction timeout (P2028) surfaces as 503 BOOKING_BUSY, not a 500', async () => {
    const timeout = Object.assign(new Error('Transaction API error'), {
      code: 'P2028',
    });
    const run = vi.fn().mockRejectedValue(timeout);
    await expect(withSerializableRetry(run)).rejects.toMatchObject({
      statusCode: 503,
      code: 'BOOKING_BUSY',
    });
    expect(run).toHaveBeenCalledTimes(1); // a timeout is not retried
  });
});
