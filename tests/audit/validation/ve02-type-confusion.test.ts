import app from '../../../api/src/app';
import { serve } from '../../../api/src/tests/testRequest';
import {
  createTenant,
  authHeader,
  addWeeklySchedule,
  unique,
} from '../../../api/src/tests/helpers';
import { prisma } from '../../../api/src/utils/prisma';

vi.mock('../../../api/src/services/email.service');

const api = await serve(app);
const PW = 'Abcdef1!x';

// express-validator runs string validators per element of an array and
// stringifies other values, so `["a@b.com"]`, `"true"` or `"30"` pass
// isEmail / isBoolean / isInt unchanged and reach bcrypt or Prisma.
describe('VE-02: wrong JSON types must be a 400, not a 500', () => {
  it('VE-02: POST /auth/login password as an array (no auth)', async () => {
    const t = await createTenant('Tc');
    await prisma.user.update({
      where: { id: t.user.id },
      data: { passwordHash: '$2b$04$' + 'a'.repeat(53) },
    });
    const res = await api
      .post('/auth/login')
      .send({ email: t.user.email, password: [PW] });
    expect(res.status).toBe(400);
  });

  it('VE-02: POST /auth/login email as an array (no auth)', async () => {
    const res = await api
      .post('/auth/login')
      .send({ email: ['someone@example.com'], password: PW });
    expect(res.status).toBe(400);
  });

  it('VE-02: POST /auth/register name / email as arrays (no auth)', async () => {
    const a = await api.post('/auth/register').send({
      email: `r${unique()}@example.com`,
      name: ['N'],
      password: PW,
      acceptTerms: true,
    });
    const b = await api.post('/auth/register').send({
      email: [`r${unique()}@example.com`],
      name: 'N',
      password: PW,
      acceptTerms: true,
    });
    expect([a.status, b.status]).toEqual([400, 400]);
  });

  it('VE-02: POST /auth/forgot-password email as an array (no auth)', async () => {
    const res = await api
      .post('/auth/forgot-password')
      .send({ email: ['someone@example.com'] });
    expect(res.status).toBe(400);
  });

  it('VE-02: POST /public/:slug/book name / email as arrays (no auth)', async () => {
    const t = await createTenant('Tc');
    await addWeeklySchedule(t, { open: '09:00', close: '18:00' });
    const base = {
      phone: '6911111111',
      serviceId: t.service.id,
      staffId: t.staff.id,
      startTime: '2026-12-03T10:00:00.000Z',
    };
    const a = await api
      .post(`/public/${t.shop.slug}/book`)
      .send({ ...base, name: ['Cu'] });
    const b = await api
      .post(`/public/${t.shop.slug}/book`)
      .send({ ...base, name: 'Cu', email: ['cu@example.com'] });
    expect([a.status, b.status]).toEqual([400, 400]);
  });

  it('VE-02: GET /public/:slug/slots with a repeated staffId / rescheduleToken (no auth)', async () => {
    const t = await createTenant('Tc');
    const q = `date=2026-12-04&serviceId=${t.service.id}`;
    const a = await api.get(
      `/public/${t.shop.slug}/slots?${q}&staffId=${t.staff.id}&staffId=${t.staff.id}`,
    );
    const tok = '3f0c5d0e-6a55-4a9a-9d0e-0a8f1f6f2b11';
    const b = await api.get(
      `/public/${t.shop.slug}/slots?${q}&rescheduleToken=${tok}&rescheduleToken=${tok}`,
    );
    expect([a.status, b.status]).toEqual([400, 400]);
  });

  it('VE-02: booleans sent as strings pass isBoolean() and reach Prisma', async () => {
    const t = await createTenant('Tc');
    const h = authHeader(t.token);
    const s = `/api/shops/${t.shop.id}`;
    const results = await Promise.all([
      api.patch(s).set(h).send({ isActive: 'true' }),
      api.patch(`${s}/services/${t.service.id}`).set(h).send({ isActive: 'false' }),
      api.post(`${s}/services`).set(h).send({ name: 'S', duration: 30, price: 1, showOnPublicPage: 'true' }),
      api.patch(`${s}/team/${t.staff.id}`).set(h).send({ role: 'owner', canViewCustomerDetails: 'true' }),
    ]);
    // Either coerced and accepted, or rejected as a 400: never a 500.
    expect(results.map((r) => r.status).filter((c) => c >= 500)).toEqual([]);
  });

  it('VE-02: integers sent as strings pass isInt() and reach Prisma', async () => {
    const t = await createTenant('Tc');
    const h = authHeader(t.token);
    const s = `/api/shops/${t.shop.id}`;
    const results = await Promise.all([
      api.post(`${s}/services`).set(h).send({ name: 'S', duration: '30', price: '100' }),
      api.patch(`${s}/services/${t.service.id}`).set(h).send({ price: '100' }),
      api.post(`${s}/products`).set(h).send({ name: 'P', price: '100', stock: '1' }),
    ]);
    expect(results.map((r) => r.status).filter((c) => c >= 500)).toEqual([]);
  });

  it('VE-02: fields with only notEmpty() accept objects / numbers', async () => {
    const t = await createTenant('Tc');
    const h = authHeader(t.token);
    const s = `/api/shops/${t.shop.id}`;
    const results = await Promise.all([
      api.patch('/user/me').set(h).send({ name: 12345 }),
      api.post(`${s}/services/${t.service.id}/staff`).set(h).send({ userShopId: { a: 1 } }),
      api.post(`${s}/team`).set(h).send({ name: ['M'], role: 'staff', sendEmail: false }),
      api.post(s.replace(`/${t.shop.id}`, '')).set(h).send({ name: ['Shop'], slug: `s-${unique()}` }),
      api.get(`${s}/bookings?staffId=a&staffId=b`).set(h),
      api.get(`${s}/customers?search=a&search=b`).set(h),
    ]);
    expect(results.map((r) => r.status)).toEqual([400, 400, 400, 400, 400, 400]);
  });
});
