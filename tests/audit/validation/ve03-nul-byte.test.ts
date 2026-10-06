import app from '../../../api/src/app';
import { serve } from '../../../api/src/tests/testRequest';
import {
  createTenant,
  authHeader,
  addWeeklySchedule,
} from '../../../api/src/tests/helpers';

vi.mock('../../../api/src/services/email.service');

const api = await serve(app);
const NUL = 'a\u0000b';

// PostgreSQL text cannot hold U+0000; no validator rejects it, so the driver
// error surfaces as a 500.
describe('VE-03: a NUL character in a string must be a 400, not a 500', () => {
  it('VE-03: unauthenticated routes', async () => {
    const t = await createTenant('Nu');
    await addWeeklySchedule(t, { open: '09:00', close: '18:00' });
    const book = {
      name: 'Cu',
      phone: '6911111111',
      serviceId: t.service.id,
      staffId: t.staff.id,
      startTime: '2026-12-03T10:00:00.000Z',
    };
    const results = await Promise.all([
      api.post(`/public/${t.shop.slug}/book`).send({ ...book, name: NUL }),
      api.post(`/public/${t.shop.slug}/book`).send({ ...book, notes: NUL }),
      api.get(`/public/${t.shop.slug}/slots`).query({ date: '2026-12-04', serviceId: t.service.id, staffId: NUL }),
      api.get('/auth/verify-email').query({ token: NUL }),
      api.post('/auth/reset-password').send({ token: NUL, password: 'Abcdef1!x' }),
    ]);
    expect(results.map((r) => r.status).filter((c) => c >= 500)).toEqual([]);
  });

  it('VE-03: authenticated routes', async () => {
    const t = await createTenant('Nu');
    const h = authHeader(t.token);
    const s = `/api/shops/${t.shop.id}`;
    const results = await Promise.all([
      api.patch(s).set(h).send({ name: NUL }),
      api.post(`${s}/services`).set(h).send({ name: NUL, duration: 30, price: 1 }),
      api.post(`${s}/team`).set(h).send({ name: NUL, role: 'staff', sendEmail: false }),
      api.post(`${s}/time-off`).set(h).send({ startDate: '2027-03-01', endDate: '2027-03-02', note: NUL }),
      api.post(`${s}/customers/import`).set(h).send({ rows: [{ name: NUL, phone: '6922222222' }] }),
      api.get(`${s}/customers`).set(h).query({ search: NUL }),
    ]);
    expect(results.map((r) => r.status).filter((c) => c >= 500)).toEqual([]);
  });
});
