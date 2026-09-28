import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import app from '../app';
import { prisma } from '../utils/prisma';
import {
  addWeeklySchedule,
  authHeader,
  createBookingRow,
  createTenant,
  type Tenant,
} from './helpers';

vi.mock('../services/email.service');

// Rule 1 under load: simultaneous requests fighting for one provider's time.
// Exactly ONE may win; every loser is a clean 409; there must never be a 5xx
// (serialization failures from Postgres are retried, then reported as 409).
const ROUNDS = 6;
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
const codes = (rs: { status: number }[]) => rs.map((r) => r.status).sort();
// Shown in failure messages: the bodies of any response that is not a clean win/409.
const odd = (rs: { status: number; body: unknown }[]) =>
  JSON.stringify(
    rs.filter((r) => r.status !== 201 && r.status !== 409).map((r) => r.body),
  );
const publicBook = (t: Tenant, i: number, startTime: string, phone?: string) =>
  request(app)
    .post(`/public/${t.shop.slug}/book`)
    .send({
      name: `C${i}`,
      phone: phone ?? `69000${String(i).padStart(5, '0')}`,
      serviceId: t.service.id,
      staffId: t.staff.id,
      startTime,
    });

describe('concurrent bookings for the same provider', () => {
  it(`${N} simultaneous public bookings, same slot, distinct customers: exactly 1 wins, no 5xx (x${ROUNDS} rounds)`, async () => {
    for (let round = 0; round < ROUNDS; round++) {
      const t = await shop();
      const rs = await Promise.all(
        Array.from({ length: N }, (_, i) => publicBook(t, i, SLOT)),
      );
      expect(codes(rs), `round ${round} ${odd(rs)}`).toEqual([
        201,
        ...Array(N - 1).fill(409),
      ]);
      expect(await activeCount(t)).toBe(1);
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
      expect(codes(rs), `round ${round} ${odd(rs)}`).toEqual([
        201,
        ...Array(N - 1).fill(409),
      ]);
      expect(await activeCount(t)).toBe(1);
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
          request(app)
            .post(`/public/${t.shop.slug}/book`)
            .send({
              name: `C${i}`,
              phone: `67000${String(i).padStart(5, '0')}`,
              serviceId: long.id,
              staffId: t.staff.id,
              startTime: `2026-12-08T${hhmm}:00+02:00`,
            }),
        ),
      );
      expect(codes(rs), `round ${round} ${odd(rs)}`).toEqual([
        201,
        ...Array(starts.length - 1).fill(409),
      ]);
      expect(await activeCount(t)).toBe(1);
    }
  });

  it('owner bookings with override cannot both win either', async () => {
    for (let round = 0; round < 3; round++) {
      const t = await shop();
      const rs = await Promise.all(
        Array.from({ length: N }, (_, i) =>
          request(app)
            .post(`/api/shops/${t.shop.id}/bookings`)
            .set(authHeader(t.token))
            .send({
              name: `C${i}`,
              phone: `68000${String(i).padStart(5, '0')}`,
              serviceId: t.service.id,
              staffId: t.staff.id,
              startTime: SLOT,
              override: true,
            }),
        ),
      );
      expect(codes(rs), `round ${round} ${odd(rs)}`).toEqual([
        201,
        ...Array(N - 1).fill(409),
      ]);
      expect(await activeCount(t)).toBe(1);
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
        request(app)
          .patch(`/api/shops/${t.shop.id}/bookings/${old.id}/status`)
          .set(authHeader(t.token))
          .send({ status: 'CONFIRMED' }),
        publicBook(t, 1, SLOT),
      ]);
      const wins = [reactivate.status === 200, create.status === 201];
      expect(
        wins.filter(Boolean),
        `round ${round} ${odd([reactivate, create])}`,
      ).toHaveLength(1);
      expect([reactivate.status, create.status].some((s) => s >= 500)).toBe(
        false,
      );
      expect(await activeCount(t)).toBe(1);
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
          request(app)
            .patch(`/api/shops/${t.shop.id}/bookings/${x.id}`)
            .set(authHeader(t.token))
            .send({ startTime: target }),
        ),
      );
      expect(codes(rs), `round ${round} ${odd(rs)}`).toEqual([200, 409]);
    }
  });
});
