import app from '../../../api/src/app';
import { serve } from '../../../api/src/tests/testRequest';
import {
  createTenant,
  authHeader,
  createBookingRow,
} from '../../../api/src/tests/helpers';
import { prisma } from '../../../api/src/utils/prisma';

// service.controller.ts:13-17 / 66-71 hand the whole request body to
// service.service.ts, which spreads it into Prisma:
//   createService: prisma.service.create({ data: { shopId, ...dto } })   (service.service.ts:38-40)
//   updateService: prisma.service.update({ where: { id }, data: dto })   (service.service.ts:92-95)
// The validators only check the fields they know; nothing strips the rest.
// Attacker throughout: the owner of Shop A (anyone can register and create a
// shop). Victim: Shop B. Shop B's id and its members' ids are in the anonymous
// GET /public/:slug response.

const api = await serve(app);

describe('TI-01: POST /api/shops/:shopId/services spreads the body into Prisma', () => {
  it('TI-01a: a body shopId must not create the service in another shop', async () => {
    const a = await createTenant('AttackerA');
    const b = await createTenant('VictimB');

    await api
      .post(`/api/shops/${a.shop.id}/services`)
      .set(authHeader(a.token))
      .send({ name: 'Planted', duration: 30, price: 0, shopId: b.shop.id });

    const planted = await prisma.service.findMany({
      where: { shopId: b.shop.id, name: 'Planted' },
    });
    expect(planted).toEqual([]);

    // And it must not show on the victim's public booking page.
    const pub = await api.get(`/public/${b.shop.slug}`);
    expect(JSON.stringify(pub.body)).not.toContain('Planted');
  });

  it('TI-01b: a nested write must not make the caller a manager of another shop', async () => {
    const a = await createTenant('AttackerA');
    const b = await createTenant('VictimB');
    await prisma.customer.create({
      data: {
        shopId: b.shop.id,
        name: 'Secret Customer',
        phone: '6911111111',
        email: 'secret@example.com',
      },
    });

    await api
      .post(`/api/shops/${a.shop.id}/services`)
      .set(authHeader(a.token))
      .send({
        name: 'Trojan',
        duration: 30,
        price: 0,
        staffServices: {
          create: [
            {
              userShop: {
                create: {
                  userId: a.user.id,
                  shopId: b.shop.id,
                  role: 'manager',
                  name: 'Intruder',
                  canManageManagers: true,
                  canEditShopSettings: true,
                },
              },
            },
          ],
        },
      });

    // The attacker's own token must still be a stranger to Shop B: no customer
    // data, and no membership row.
    const customers = await api
      .get(`/api/shops/${b.shop.id}/customers/export-all`)
      .set(authHeader(a.token));
    expect(JSON.stringify(customers.body)).not.toContain('6911111111');
    expect(customers.status).toBe(404);
    const membership = await prisma.userShop.findFirst({
      where: { userId: a.user.id, shopId: b.shop.id },
    });
    expect(membership).toBeNull();
  });
});

describe('TI-02: PATCH /api/shops/:shopId/services/:serviceId passes the body to Prisma as-is', () => {
  it('TI-02a: a body shopId must not move the service into another shop', async () => {
    const a = await createTenant('AttackerA');
    const b = await createTenant('VictimB');

    await api
      .patch(`/api/shops/${a.shop.id}/services/${a.service.id}`)
      .set(authHeader(a.token))
      .send({ name: 'Moved', shopId: b.shop.id });

    const row = await prisma.service.findUnique({
      where: { id: a.service.id },
    });
    expect(row?.shopId).toBe(a.shop.id);
  });

  it('TI-02b: a nested write must not make the caller a manager of another shop', async () => {
    const a = await createTenant('AttackerA');
    const b = await createTenant('VictimB');

    await api
      .patch(`/api/shops/${a.shop.id}/services/${a.service.id}`)
      .set(authHeader(a.token))
      .send({
        staffServices: {
          create: [
            {
              userShop: {
                create: {
                  userId: a.user.id,
                  shopId: b.shop.id,
                  role: 'manager',
                  name: 'Intruder',
                },
              },
            },
          ],
        },
      });

    const membership = await prisma.userShop.findFirst({
      where: { userId: a.user.id, shopId: b.shop.id },
    });
    expect(membership).toBeNull();

    const bookings = await api
      .get(`/api/shops/${b.shop.id}/bookings`)
      .set(authHeader(a.token));
    expect(bookings.status).toBe(404);
  });

  it("TI-02c: a nested connect must not re-point another shop's booking at the caller's service", async () => {
    const a = await createTenant('AttackerA');
    const b = await createTenant('VictimB');
    const bBooking = await createBookingRow(b);

    await api
      .patch(`/api/shops/${a.shop.id}/services/${a.service.id}`)
      .set(authHeader(a.token))
      .send({ bookings: { connect: [{ id: bBooking.id }] } });

    const after = await prisma.booking.findUnique({
      where: { id: bBooking.id },
    });
    expect(after?.serviceId).toBe(b.service.id);
  });

  it("TI-02d: a nested create must not attach the caller's service to another shop's staff member", async () => {
    const a = await createTenant('AttackerA');
    const b = await createTenant('VictimB');

    await api
      .patch(`/api/shops/${a.shop.id}/services/${a.service.id}`)
      .set(authHeader(a.token))
      .send({
        name: 'Injected text on your page',
        staffServices: { create: [{ userShopId: b.staff.id }] },
      });

    const links = await prisma.staffService.findMany({
      where: { userShopId: b.staff.id, serviceId: a.service.id },
    });
    expect(links).toEqual([]);

    // Shop B's anonymous booking page lists each member's services by name.
    const pub = await api.get(`/public/${b.shop.slug}`);
    expect(JSON.stringify(pub.body)).not.toContain('Injected text');
  });
});
