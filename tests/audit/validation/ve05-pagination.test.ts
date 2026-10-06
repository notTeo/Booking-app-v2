import app from '../../../api/src/app';
import { serve } from '../../../api/src/tests/testRequest';
import { createTenant, authHeader } from '../../../api/src/tests/helpers';
import { prisma } from '../../../api/src/utils/prisma';

const api = await serve(app);

// `page` is isInt({ min: 1 }) with no max; the controller turns it into an
// offset that overflows.
describe('VE-05: page has no upper bound', () => {
  it('VE-05: GET customers?page=<huge> is a 400, not a 500', async () => {
    const t = await createTenant('Pg');
    const res = await api
      .get(`/api/shops/${t.shop.id}/customers`)
      .set(authHeader(t.token))
      .query({ page: '99999999999999999999' });
    expect(res.status).toBe(400);
  });

  it('VE-05: GET customers/:id/bookings?page=<huge> is a 400, not a 500', async () => {
    const t = await createTenant('Pg');
    const c = await prisma.customer.create({
      data: { shopId: t.shop.id, name: 'C', phone: '6900000001' },
    });
    const res = await api
      .get(`/api/shops/${t.shop.id}/customers/${c.id}/bookings`)
      .set(authHeader(t.token))
      .query({ page: '99999999999999999999' });
    expect(res.status).toBe(400);
  });
});
