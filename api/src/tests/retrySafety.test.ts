import { describe, it, expect, vi, afterEach } from 'vitest';
import request from 'supertest';
import app from '../app';
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
  request(app)
    .post(`/public/${t.shop.slug}/book`)
    .send({
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

  it('owner: membership revoked between attempts -> 404, nothing booked', async () => {
    const t = await shop();
    // revoke the login link (the membership row itself is referenced elsewhere)
    failFirstAttempt(() =>
      prisma.userShop.update({
        where: { id: t.staff.id },
        data: { userId: null },
      }),
    );
    const res = await request(app)
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
    const res = await request(app)
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
    const res = await request(app)
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
    const res = await request(app)
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
    expect(res.status).toBe(409);
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

  it(`is capped at ${SERIALIZABLE_RETRY.maxAttempts} attempts, then a clean 409 SLOT_TAKEN`, async () => {
    const run = vi.fn().mockRejectedValue(conflict());
    await expect(withSerializableRetry(run)).rejects.toMatchObject({
      statusCode: 409,
      code: 'SLOT_TAKEN',
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
    ).rejects.toMatchObject({ statusCode: 409 });
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
