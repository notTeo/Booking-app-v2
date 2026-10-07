import app from '../../../api/src/app';
import { serve } from '../../../api/src/tests/testRequest';
import { createTenant, authHeader, unique } from '../../../api/src/tests/helpers';

vi.mock('../../../api/src/services/email.service');

const api = await serve(app);
const LONG = 'A'.repeat(20000);

// These strings are stored, shown on the public booking page and put in
// email subjects/bodies, but have no isLength() rule (compare product name
// 120, customer name 100, user name 50).
describe('VE-04: stored strings need a length cap', () => {
  it('VE-04: shop name / description / phone / formattedAddress', async () => {
    const t = await createTenant('Ln');
    const h = authHeader(t.token);
    const statuses: number[] = [];
    for (const field of ['name', 'description', 'phone', 'formattedAddress']) {
      const res = await api.patch(`/api/shops/${t.shop.id}`).set(h).send({ [field]: LONG });
      statuses.push(res.status);
    }
    const created = await api.post('/api/shops').set(h).send({ name: LONG, slug: `s-${unique()}` });
    expect([...statuses, created.status]).toEqual([400, 400, 400, 400, 400]);
  });

  it('VE-04: service name / description', async () => {
    const t = await createTenant('Ln');
    const h = authHeader(t.token);
    const s = `/api/shops/${t.shop.id}/services`;
    const results = [
      await api.post(s).set(h).send({ name: LONG, duration: 30, price: 1 }),
      await api.post(s).set(h).send({ name: 'S', description: LONG, duration: 30, price: 1 }),
      await api.patch(`${s}/${t.service.id}`).set(h).send({ name: LONG }),
    ];
    expect(results.map((r) => r.status)).toEqual([400, 400, 400]);
  });

  it('VE-04: team member name', async () => {
    const t = await createTenant('Ln');
    const res = await api
      .post(`/api/shops/${t.shop.id}/team`)
      .set(authHeader(t.token))
      .send({ name: LONG, role: 'staff', sendEmail: false });
    expect(res.status).toBe(400);
  });

  it('VE-04: service price has no upper bound (Int column overflows to a 500)', async () => {
    const t = await createTenant('Ln');
    const res = await api
      .post(`/api/shops/${t.shop.id}/services`)
      .set(authHeader(t.token))
      .send({ name: 'S', duration: 30, price: 99999999999 });
    expect(res.status).toBe(400);
  });
});
