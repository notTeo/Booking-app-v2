import { describe, it, expect, vi } from 'vitest';
import app from '../app';
import { prisma } from '../utils/prisma';
import {
  addWeeklySchedule,
  authHeader,
  createBookingRow,
  createTenant,
  type Tenant,
  ALL_OVERRIDABLE_RULES,
} from './helpers';
import { serve } from './testRequest';

vi.mock('../services/email.service');

const api = await serve(app);

// Rule 1 under load: simultaneous requests fighting for one provider's time.
// Exactly ONE may win, and the database must hold exactly one booking for the
// contended time. Every loser is a clean 409, or, under extreme CPU contention,
// a 503 BOOKING_BUSY with Retry-After (see expectCleanLoser). Never any other 5xx.
const ROUNDS = 6;
// No single request may take anywhere near a proxy/client timeout.
const MAX_REQUEST_MS = 4000;
vi.setConfig({ testTimeout: 30_000 });
const N = 10;
const SLOT = '2026-12-08T10:00:00+02:00';

async function shop() {
  const t = await createTenant('Race');
  await addWeeklySchedule(t);
  return t;
}
const activeCount = (t: Tenant) =>
  prisma.booking.count({
    where: { staffId: t.staff.id, status: { notIn: ['CANCELED', 'NO_SHOW'] } },
  });
type Timed = { status: number; elapsedMs?: number };
// Statuses of a burst, sorted. Also fails if any request was slow: a request
// must never hang, whatever the contention.
const codes = (rs: Timed[]) => {
  const slow = rs.filter((r) => (r.elapsedMs ?? 0) > MAX_REQUEST_MS);
  if (slow.length > 0) {
    throw new Error(
      `${slow.length} request(s) took longer than ${MAX_REQUEST_MS} ms (slowest ${Math.round(Math.max(...slow.map((r) => r.elapsedMs ?? 0)))} ms)`,
    );
  }
  return rs.map((r) => r.status).sort();
};
const timed = async <T extends object>(p: PromiseLike<T>) => {
  const t0 = performance.now();
  const r = await p;
  return Object.assign(r, { elapsedMs: performance.now() - t0 });
};
// Shown in failure messages: the bodies of any response that is not a clean win/409.
const odd = (rs: { status: number; body: unknown }[]) =>
  JSON.stringify(
    rs.filter((r) => r.status !== 201 && r.status !== 409).map((r) => r.body),
  );
type Res = {
  status: number;
  body: { code?: string };
  headers: Record<string, string>;
};
// A loser is a 409 (the winner's booking is already there). On a starved
// machine it may instead run out of withSerializableRetry's capped budget
// (5 attempts / 3 s) and get a 503 BOOKING_BUSY with Retry-After. That is an
// accepted outcome, not a failure: the answer is explicit, the client is told
// to retry, and nothing was committed (the DB assertions next to every call
// prove that). Any other status, or a 503 without that code and header, fails.
const expectCleanLoser = (r: Res, ctx: string) => {
  if (r.status === 409) return;
  expect(r.status, `${ctx} ${JSON.stringify(r.body)}`).toBe(503);
  expect(r.body.code, ctx).toBe('BOOKING_BUSY');
  expect(r.headers['retry-after'], ctx).toBeDefined();
};
// Exactly one response is a win; every other one is a clean loser. Also
// enforces the per-request latency limit (codes), unchanged.
const expectOneWinner = (rs: (Res & Timed)[], wins: number[], ctx: string) => {
  codes(rs);
  expect(
    rs.filter((r) => wins.includes(r.status)),
    `${ctx} ${odd(rs)}`,
  ).toHaveLength(1);
  for (const r of rs) if (!wins.includes(r.status)) expectCleanLoser(r, ctx);
};
const publicBook = (t: Tenant, i: number, startTime: string, phone?: string) =>
  timed(
    api.post(`/public/${t.shop.slug}/book`).send({
      name: `C${i}`,
      phone: phone ?? `69000${String(i).padStart(5, '0')}`,
      serviceId: t.service.id,
      staffId: t.staff.id,
      startTime,
    }),
  );

describe('concurrent bookings for the same provider', () => {
  it(`${N} simultaneous public bookings, same slot, distinct customers: exactly 1 wins, no 5xx (x${ROUNDS} rounds)`, async () => {
    for (let round = 0; round < ROUNDS; round++) {
      const t = await shop();
      const rs = await Promise.all(
        Array.from({ length: N }, (_, i) => publicBook(t, i, SLOT)),
      );
      // DB first: a double commit must always be reported as one.
      expect(await activeCount(t), `round ${round}`).toBe(1);
      expectOneWinner(rs, [201], `round ${round}`);
    }
  });

  it(`${N} simultaneous bookings, same slot, SAME customer phone: exactly 1 wins, no 5xx (x${ROUNDS} rounds)`, async () => {
    for (let round = 0; round < ROUNDS; round++) {
      const t = await shop();
      const rs = await Promise.all(
        Array.from({ length: N }, (_, i) =>
          publicBook(t, i, SLOT, '6999999999'),
        ),
      );
      // DB first: a double commit must always be reported as one.
      expect(await activeCount(t), `round ${round}`).toBe(1);
      expectOneWinner(rs, [201], `round ${round}`);
    }
  });

  it(`simultaneous OVERLAPPING (but not identical) bookings: exactly 1 wins, no 5xx (x${ROUNDS} rounds)`, async () => {
    // A 2-hour service starting 09:00 / 09:30 / 10:00 / 10:30: every pair
    // overlaps, and every start is on the slot grid so the public rules pass.
    const starts = [
      '09:00',
      '09:30',
      '10:00',
      '10:30',
      '09:00',
      '09:30',
      '10:00',
      '10:30',
    ];
    for (let round = 0; round < ROUNDS; round++) {
      const t = await shop();
      const long = await prisma.service.create({
        data: { shopId: t.shop.id, name: 'Long', duration: 120, price: 1 },
      });
      const rs = await Promise.all(
        starts.map((hhmm, i) =>
          api.post(`/public/${t.shop.slug}/book`).send({
            name: `C${i}`,
            phone: `67000${String(i).padStart(5, '0')}`,
            serviceId: long.id,
            staffId: t.staff.id,
            startTime: `2026-12-08T${hhmm}:00+02:00`,
          }),
        ),
      );
      // DB first: a double commit must always be reported as one.
      expect(await activeCount(t), `round ${round}`).toBe(1);
      expectOneWinner(rs, [201], `round ${round}`);
    }
  });

  it('owner bookings with override cannot both win either', async () => {
    for (let round = 0; round < 3; round++) {
      const t = await shop();
      const rs = await Promise.all(
        Array.from({ length: N }, (_, i) =>
          api
            .post(`/api/shops/${t.shop.id}/bookings`)
            .set(authHeader(t.token))
            .send({
              name: `C${i}`,
              phone: `68000${String(i).padStart(5, '0')}`,
              serviceId: t.service.id,
              staffId: t.staff.id,
              startTime: SLOT,
              overrideRules: ALL_OVERRIDABLE_RULES,
            }),
        ),
      );
      // DB first: a double commit must always be reported as one.
      expect(await activeCount(t), `round ${round}`).toBe(1);
      expectOneWinner(rs, [201], `round ${round}`);
    }
  });

  it('non-conflicting bookings for different providers/slots all succeed (no spurious conflicts)', async () => {
    const t = await shop();
    const base = new Date(SLOT).getTime();
    const rs = await Promise.all(
      Array.from({ length: 6 }, (_, i) =>
        publicBook(t, i, new Date(base + i * 30 * 60_000).toISOString()),
      ),
    );
    expect(codes(rs)).toEqual(Array(6).fill(201));
  });
});

describe('races between different write paths', () => {
  it('re-activating a CANCELED booking vs. creating one in its slot: exactly one wins', async () => {
    for (let round = 0; round < ROUNDS; round++) {
      const t = await shop();
      const old = await createBookingRow(
        t,
        new Date(SLOT).toISOString(),
        'CANCELED',
      );
      const [reactivate, create] = await Promise.all([
        api
          .patch(`/api/shops/${t.shop.id}/bookings/${old.id}/status`)
          .set(authHeader(t.token))
          .send({ status: 'CONFIRMED' }),
        publicBook(t, 1, SLOT),
      ]);
      // DB first: a double commit must always be reported as one.
      expect(await activeCount(t), `round ${round}`).toBe(1);
      expectOneWinner([reactivate, create], [200, 201], `round ${round}`);
    }
  });

  it('two reschedules onto the same free slot: exactly one wins', async () => {
    for (let round = 0; round < ROUNDS; round++) {
      const t = await shop();
      const a = await createBookingRow(t, '2026-12-08T09:00:00+02:00');
      const b = await createBookingRow(t, '2026-12-08T11:00:00+02:00');
      const target = '2026-12-08T12:00:00+02:00';
      const rs = await Promise.all(
        [a, b].map((x) =>
          api
            .patch(`/api/shops/${t.shop.id}/bookings/${x.id}`)
            .set(authHeader(t.token))
            .send({ startTime: target }),
        ),
      );
      // DB first: exactly one active booking at the contended time.
      expect(
        await prisma.booking.count({
          where: {
            staffId: t.staff.id,
            startTime: new Date(target),
            status: { notIn: ['CANCELED', 'NO_SHOW'] },
          },
        }),
        `round ${round}`,
      ).toBe(1);
      expectOneWinner(rs, [200], `round ${round}`);
    }
  });
});
