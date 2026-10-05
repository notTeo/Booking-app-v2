import { describe, it, expect } from 'vitest';
import app from '../app';
import { serve } from './testRequest';
import { prisma } from '../utils/prisma';
import {
  addManager,
  authHeader,
  createBookingRow,
  createStaffMember,
  createTenant,
  type Tenant,
} from './helpers';

const api = await serve(app);

const merge = (t: Tenant, token: string, targetId: string, sourceId: unknown) =>
  api
    .post(`/api/shops/${t.shop.id}/customers/${targetId}/merge`)
    .set(authHeader(token))
    .send({ sourceCustomerId: sourceId });

// Two customer records in one shop: the target has one booking, the source two.
async function setup() {
  const t = await createTenant('Merge');
  const kept = await createBookingRow(t, '2027-07-01T09:00:00.000Z');
  const dupA = await createBookingRow(t, '2027-07-02T09:00:00.000Z');
  const dupB = await prisma.booking.create({
    data: {
      shopId: t.shop.id,
      customerId: dupA.customerId,
      serviceId: t.service.id,
      staffId: t.staff.id,
      startTime: new Date('2027-07-03T09:00:00.000Z'),
      endTime: new Date('2027-07-03T09:30:00.000Z'),
    },
  });
  await prisma.customer.update({
    where: { id: kept.customerId },
    data: { name: 'Maria P', notes: 'prefers Anna' },
  });
  await prisma.customer.update({
    where: { id: dupA.customerId },
    data: { name: 'Maria', email: 'maria@example.com', notes: 'allergic' },
  });
  return {
    t,
    targetId: kept.customerId,
    sourceId: dupA.customerId,
    bookingIds: [kept.id, dupA.id, dupB.id],
  };
}

describe('POST /api/shops/:shopId/customers/:customerId/merge', () => {
  it('moves the bookings to the kept customer and removes the other', async () => {
    const { t, targetId, sourceId, bookingIds } = await setup();
    const target = await prisma.customer.findUniqueOrThrow({
      where: { id: targetId },
    });

    const res = await merge(t, t.token, targetId, sourceId);

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      id: targetId,
      name: 'Maria P',
      phone: target.phone,
      email: 'maria@example.com',
      notes: 'prefers Anna\nallergic',
      movedBookings: 2,
    });
    expect(
      await prisma.customer.findUnique({ where: { id: sourceId } }),
    ).toBeNull();
    const bookings = await prisma.booking.findMany({
      where: { id: { in: bookingIds } },
    });
    expect(bookings).toHaveLength(3);
    expect(bookings.every((b) => b.customerId === targetId)).toBe(true);
  });

  it("keeps the kept customer's own email", async () => {
    const { t, targetId, sourceId } = await setup();
    await prisma.customer.update({
      where: { id: targetId },
      data: { email: 'kept@example.com' },
    });

    const res = await merge(t, t.token, targetId, sourceId);

    expect(res.body.data.email).toBe('kept@example.com');
  });

  it('lets a manager merge, and refuses staff', async () => {
    const { t, targetId, sourceId } = await setup();
    const staff = await createStaffMember(t);
    const manager = await addManager(t);

    const refused = await merge(t, staff.token, targetId, sourceId);
    expect(refused.status).toBe(403);
    expect(
      await prisma.customer.findUnique({ where: { id: sourceId } }),
    ).not.toBeNull();

    const allowed = await merge(t, manager.token, targetId, sourceId);
    expect(allowed.status).toBe(200);
  });

  it("404s for another shop's customer and changes nothing", async () => {
    const { t, targetId } = await setup();
    const other = await createTenant('Other');
    const foreign = await createBookingRow(other);

    const res = await merge(t, t.token, targetId, foreign.customerId);

    expect(res.status).toBe(404);
    const still = await prisma.booking.findUniqueOrThrow({
      where: { id: foreign.id },
    });
    expect(still.customerId).toBe(foreign.customerId);
  });

  it('rejects merging a customer with itself or without a source', async () => {
    const { t, targetId } = await setup();

    expect((await merge(t, t.token, targetId, targetId)).status).toBe(400);
    expect((await merge(t, t.token, targetId, undefined)).status).toBe(400);
    expect(
      await prisma.customer.findUnique({ where: { id: targetId } }),
    ).not.toBeNull();
  });
});
