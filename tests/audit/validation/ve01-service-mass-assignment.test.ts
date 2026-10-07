import app from '../../../api/src/app';
import { serve } from '../../../api/src/tests/testRequest';
import { createTenant, authHeader } from '../../../api/src/tests/helpers';
import { prisma } from '../../../api/src/utils/prisma';

vi.mock('../../../api/src/services/email.service');

const api = await serve(app);

// service.service.ts:39 (`data: { shopId, ...dto }`) and :94 (`data: dto`)
// hand the whole request body to Prisma. The validators only describe the
// expected fields; nothing strips or rejects the others.
describe('VE-01: service create/update must not pass unlisted body fields to Prisma', () => {
  it('VE-01: PATCH with a foreign shopId leaves the service in its own shop', async () => {
    const a = await createTenant('Aa');
    const b = await createTenant('Bb');
    const res = await api
      .patch(`/api/shops/${a.shop.id}/services/${a.service.id}`)
      .set(authHeader(a.token))
      .send({ name: 'Renamed', shopId: b.shop.id });
    const row = await prisma.service.findUniqueOrThrow({
      where: { id: a.service.id },
    });
    expect(row.shopId).toBe(a.shop.id);
    expect([200, 400]).toContain(res.status);
  });

  it('VE-01: POST with a foreign shopId creates nothing in the other shop', async () => {
    const a = await createTenant('Aa');
    const b = await createTenant('Bb');
    await api
      .post(`/api/shops/${a.shop.id}/services`)
      .set(authHeader(a.token))
      .send({ name: 'Planted', duration: 30, price: 100, shopId: b.shop.id });
    const planted = await prisma.service.count({
      where: { shopId: b.shop.id, name: 'Planted' },
    });
    expect(planted).toBe(0);
  });

  it('VE-01: PATCH cannot reach the parent shop row through a nested relation write', async () => {
    const a = await createTenant('Aa');
    const before = await prisma.shop.findUniqueOrThrow({
      where: { id: a.shop.id },
    });
    await api
      .patch(`/api/shops/${a.shop.id}/services/${a.service.id}`)
      .set(authHeader(a.token))
      .send({ shop: { update: { name: 'changed-through-service' } } });
    const after = await prisma.shop.findUniqueOrThrow({
      where: { id: a.shop.id },
    });
    expect(after.name).toBe(before.name);
  });

  it('VE-01: PATCH cannot overwrite server-managed columns (id, createdAt)', async () => {
    const a = await createTenant('Aa');
    const before = await prisma.service.findUniqueOrThrow({
      where: { id: a.service.id },
    });
    await api
      .patch(`/api/shops/${a.shop.id}/services/${a.service.id}`)
      .set(authHeader(a.token))
      .send({ createdAt: '2001-01-01T00:00:00.000Z' });
    const after = await prisma.service.findUniqueOrThrow({
      where: { id: a.service.id },
    });
    expect(after.createdAt.toISOString()).toBe(before.createdAt.toISOString());
  });
});
