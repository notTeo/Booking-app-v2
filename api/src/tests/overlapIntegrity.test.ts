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
  ALL_OVERRIDABLE_RULES,
} from './helpers';

vi.mock('../services/email.service');

// Rule 1: two ACTIVE bookings for one provider can never overlap, on any path.
// Only CANCELED and NO_SHOW free a slot; COMPLETED time was really used and
// still blocks. Frozen clock 2026-12-01; Tue 2026-12-08 is inside the window.
const SLOT = '2026-12-08T10:00:00+02:00';
const SLOT_ISO = new Date(SLOT).toISOString();

async function shop() {
  const t = await createTenant('Overlap');
  await addWeeklySchedule(t);
  return t;
}
const setStatus = (t: Tenant, id: string, status: string) =>
  request(app)
    .patch(`/api/shops/${t.shop.id}/bookings/${id}/status`)
    .set(authHeader(t.token))
    .send({ status });
const ownerBook = (t: Tenant, extra: object = {}) =>
  request(app)
    .post(`/api/shops/${t.shop.id}/bookings`)
    .set(authHeader(t.token))
    .send({
      name: 'C',
      phone: String(Math.floor(Math.random() * 1e9)),
      serviceId: t.service.id,
      staffId: t.staff.id,
      startTime: SLOT,
      ...extra,
    });
const statusOf = async (id: string) =>
  (await prisma.booking.findUniqueOrThrow({ where: { id } })).status;

describe('status transitions cannot re-create an overlap', () => {
  for (const freed of ['CANCELED', 'NO_SHOW'] as const) {
    for (const back of ['CONFIRMED', 'PENDING', 'COMPLETED'] as const) {
      it(`${freed} -> ${back} onto a slot that was re-booked is 409 and changes nothing`, async () => {
        const t = await shop();
        const old = await createBookingRow(t, SLOT_ISO, freed);
        expect((await ownerBook(t)).status).toBe(201); // re-books the freed slot

        const res = await setStatus(t, old.id, back);

        expect(res.status).toBe(409);
        expect(res.body.code).toBe('SLOT_TAKEN');
        expect(await statusOf(old.id)).toBe(freed);
      });
    }
  }

  it('reactivating is allowed when the slot is still free', async () => {
    const t = await shop();
    const old = await createBookingRow(t, SLOT_ISO, 'CANCELED');
    const res = await setStatus(t, old.id, 'CONFIRMED');
    expect(res.status).toBe(200);
    expect(await statusOf(old.id)).toBe('CONFIRMED');
  });

  it('moving between blocking statuses, or to CANCELED/NO_SHOW, never needs a check', async () => {
    const t = await shop();
    const b = await createBookingRow(t, SLOT_ISO, 'CONFIRMED');
    for (const s of [
      'PENDING',
      'COMPLETED',
      'CONFIRMED',
      'NO_SHOW',
      'CANCELED',
    ]) {
      expect((await setStatus(t, b.id, s)).status).toBe(200);
    }
  });
});

describe('COMPLETED blocks overlap; only CANCELED and NO_SHOW free a slot', () => {
  it('a COMPLETED booking blocks a new booking on every path (even with override)', async () => {
    const t = await shop();
    await createBookingRow(t, SLOT_ISO, 'COMPLETED');

    const owner = await ownerBook(t);
    const overridden = await ownerBook(t, {
      overrideRules: ALL_OVERRIDABLE_RULES,
    });
    const pub = await request(app).post(`/public/${t.shop.slug}/book`).send({
      name: 'C',
      phone: '6911111111',
      serviceId: t.service.id,
      staffId: t.staff.id,
      startTime: SLOT,
    });

    expect(owner.status).toBe(409);
    expect(overridden.status).toBe(409);
    expect(pub.status).toBe(409);
    expect(await prisma.booking.count({ where: { shopId: t.shop.id } })).toBe(
      1,
    );
  });

  it('rescheduling onto a COMPLETED booking is 409', async () => {
    const t = await shop();
    await createBookingRow(t, SLOT_ISO, 'COMPLETED');
    const other = await createBookingRow(
      t,
      new Date('2026-12-08T12:00:00+02:00').toISOString(),
    );
    const res = await request(app)
      .patch(`/api/shops/${t.shop.id}/bookings/${other.id}`)
      .set(authHeader(t.token))
      .send({ startTime: SLOT, overrideRules: ALL_OVERRIDABLE_RULES });
    expect(res.status).toBe(409);
  });

  it('slots show a COMPLETED booking as unavailable (public and owner)', async () => {
    const t = await shop();
    await createBookingRow(t, SLOT_ISO, 'COMPLETED');
    const q = `date=2026-12-08&serviceId=${t.service.id}&staffId=${t.staff.id}`;
    const pub = await request(app).get(`/public/${t.shop.slug}/slots?${q}`);
    const owner = await request(app)
      .get(`/api/shops/${t.shop.id}/bookings/slots?${q}`)
      .set(authHeader(t.token));
    for (const res of [pub, owner]) {
      const ten = res.body.data.slots.find(
        (s: { time: string }) => s.time === '10:00',
      );
      expect(ten.available).toBe(false);
    }
  });

  for (const freed of ['CANCELED', 'NO_SHOW'] as const) {
    it(`${freed} frees the slot: a new booking succeeds and slots show it free`, async () => {
      const t = await shop();
      await createBookingRow(t, SLOT_ISO, freed);
      const q = `date=2026-12-08&serviceId=${t.service.id}&staffId=${t.staff.id}`;
      const slots = await request(app).get(`/public/${t.shop.slug}/slots?${q}`);
      expect(
        slots.body.data.slots.find((s: { time: string }) => s.time === '10:00')
          .available,
      ).toBe(true);
      expect((await ownerBook(t)).status).toBe(201);
    });
  }
});
