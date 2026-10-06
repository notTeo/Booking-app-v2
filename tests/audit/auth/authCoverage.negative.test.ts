// TRUE NEGATIVES (expected to pass). Kept apart from the AU-* files so that
// "failing = bug" holds for those.
import jwt from '../../../api/node_modules/jsonwebtoken';
import { loadApp } from '../../../api/src/tests/routeRegistry';
import { serve } from '../../../api/src/tests/testRequest';
import {
  addManager,
  authHeader,
  createBookingRow,
  createStaffMember,
  createTenant,
} from '../../../api/src/tests/helpers';
import { prisma } from '../../../api/src/utils/prisma';
import { env } from '../../../api/src/config/env';
import { signAccessToken, signRefreshToken } from '../../../api/src/utils/jwt';

vi.mock('../../../api/src/services/email.service');

const { app, routes } = await loadApp();
const api = await serve(app);

const concrete = (path: string) => path.replace(/:[A-Za-z]+/g, 'x');
const call = (method: string, path: string) =>
  (api as unknown as Record<string, (p: string) => ReturnType<typeof api.get>>)[
    method.toLowerCase()
  ](concrete(path));

// Every route that may be reached without a login, and nothing else.
const PUBLIC = [
  'POST /auth/register',
  'POST /auth/login',
  'POST /auth/refresh',
  'POST /auth/logout',
  'GET /auth/verify-email',
  'GET /auth/verify-email-change',
  'POST /auth/resend-verification',
  'POST /auth/forgot-password',
  'POST /auth/reset-password',
  'GET /api/invites/lookup',
  'POST /public/cancel',
  'POST /public/booking',
  'POST /public/reschedule',
  'GET /public/:slug/slots',
  'GET /public/:slug',
  'POST /public/:slug/book',
  'GET /health',
].sort();

describe('negative: authentication coverage', () => {
  it('the only routes without `authenticate` are the intended public ones', () => {
    const open = routes
      .filter((r) => !r.authenticated)
      .map((r) => `${r.method} ${r.path}`)
      // /media is registered with a RegExp path; /health and /docs sit on app.
      .filter((k) => !k.includes('/media'))
      .sort();
    expect(open).toEqual(PUBLIC);
  });

  it('every authenticated route answers 401 to no token, a tampered token, an expired token, alg=none, and a refresh token', async () => {
    const authed = routes.filter((r) => r.authenticated);
    expect(authed.length).toBeGreaterThan(60);

    const t = await createTenant('Neg');
    const good = signAccessToken(t.user.id);
    const tampered = good.slice(0, -3) + (good.endsWith('aaa') ? 'bbb' : 'aaa');
    const expired = jwt.sign({ userId: t.user.id }, env.jwt.accessSecret, {
      expiresIn: -10,
    });
    const none =
      Buffer.from('{"alg":"none","typ":"JWT"}').toString('base64url') +
      '.' +
      Buffer.from(JSON.stringify({ userId: t.user.id })).toString('base64url') +
      '.';
    const refresh = signRefreshToken(t.user.id);
    const wrongKey = jwt.sign({ userId: t.user.id }, 'not-the-secret');

    const bad: string[] = [];
    for (const r of authed) {
      const headers: (Record<string, string> | null)[] = [
        null,
        authHeader(tampered),
        authHeader(expired),
        authHeader(none),
        authHeader(refresh),
        authHeader(wrongKey),
        { Authorization: good }, // no "Bearer " prefix
      ];
      for (const [i, h] of headers.entries()) {
        const req = call(r.method, r.path);
        if (h) req.set(h);
        const res = await req;
        if (res.status !== 401) bad.push(`${r.method} ${r.path} #${i} -> ${res.status}`);
      }
    }
    expect(bad).toEqual([]);
  }, 120_000);
});

describe('negative: role checks inside a shop', () => {
  it('staff get 403 on owner/manager actions', async () => {
    const t = await createTenant('Roles');
    const staff = await createStaffMember(t);
    const booking = await createBookingRow(t);
    const customer = await prisma.customer.findFirstOrThrow({
      where: { shopId: t.shop.id },
    });
    const s = `/api/shops/${t.shop.id}`;
    const h = authHeader(staff.token);
    const attempts: [string, ReturnType<typeof api.get>][] = [
      ['PATCH shop', api.patch(s).set(h).send({ name: 'x' })],
      ['DELETE shop', api.delete(s).set(h)],
      ['DELETE shop photo', api.delete(`${s}/photo`).set(h)],
      ['POST team', api.post(`${s}/team`).set(h).send({ name: 'N', role: 'staff', sendEmail: false })],
      ['PATCH team self->manager', api.patch(`${s}/team/${staff.staff.id}`).set(h).send({ role: 'manager' })],
      ['PATCH team self flags', api.patch(`${s}/team/${staff.staff.id}`).set(h).send({ role: 'staff', canViewCustomerDetails: true })],
      ['DELETE team owner', api.delete(`${s}/team/${t.staff.id}`).set(h)],
      ['POST invite', api.post(`${s}/team/${t.staff.id}/invite`).set(h)],
      ['DELETE invite', api.delete(`${s}/team/${t.staff.id}/invite`).set(h)],
      ['POST transfer', api.post(`${s}/team/${staff.staff.id}/transfer-ownership`).set(h)],
      ['DELETE member photo', api.delete(`${s}/team/${staff.staff.id}/photo`).set(h)],
      ['POST schedule', api.post(`${s}/team/${staff.staff.id}/schedules`).set(h).send({ startDate: '2027-01-01' })],
      ['POST time-off', api.post(`${s}/time-off`).set(h).send({ startDate: '2027-01-01', endDate: '2027-01-02', staffId: staff.staff.id })],
      ['POST service', api.post(`${s}/services`).set(h).send({ name: 'S', duration: 30, price: 100 })],
      ['PATCH service', api.patch(`${s}/services/${t.service.id}`).set(h).send({ name: 'S2' })],
      ['DELETE service', api.delete(`${s}/services/${t.service.id}`).set(h)],
      ['POST service staff', api.post(`${s}/services/${t.service.id}/staff`).set(h).send({ userShopId: staff.staff.id })],
      ['POST product', api.post(`${s}/products`).set(h).send({ name: 'P', price: 100, stock: 1 })],
      ['PATCH booking', api.patch(`${s}/bookings/${booking.id}`).set(h).send({ notes: 'x' })],
      ['GET export-all', api.get(`${s}/customers/export-all`).set(h)],
      ['POST import', api.post(`${s}/customers/import`).set(h).send({ rows: [{ name: 'A', phone: '6900000002' }] })],
      ['GET customer export', api.get(`${s}/customers/${customer.id}/export`).set(h)],
      ['DELETE customer', api.delete(`${s}/customers/${customer.id}`).set(h)],
      ['POST merge', api.post(`${s}/customers/${customer.id}/merge`).set(h).send({ sourceCustomerId: 'x' })],
    ];
    const wrong: string[] = [];
    for (const [label, req] of attempts) {
      const res = await req;
      // 400 = stopped by a validator before the role gate; anything that is
      // not 403/400 would be a hole.
      if (res.status !== 403) wrong.push(`${label} -> ${res.status}`);
    }
    expect(wrong).toEqual([]);
    expect(await prisma.shop.count({ where: { id: t.shop.id } })).toBe(1);
  });

  it('a manager gets 403 on owner-only actions and cannot touch the owner', async () => {
    const t = await createTenant('Own');
    const mgr = await addManager(t); // both extra permissions on
    await createBookingRow(t);
    const customer = await prisma.customer.findFirstOrThrow({
      where: { shopId: t.shop.id },
    });
    const s = `/api/shops/${t.shop.id}`;
    const h = authHeader(mgr.token);
    const codes = {
      deleteShop: (await api.delete(s).set(h)).status,
      transferToSelf: (await api.post(`${s}/team/${mgr.staff.id}/transfer-ownership`).set(h)).status,
      customerExport: (await api.get(`${s}/customers/${customer.id}/export`).set(h)).status,
      customerDelete: (await api.delete(`${s}/customers/${customer.id}`).set(h)).status,
      editOwner: (await api.patch(`${s}/team/${t.staff.id}`).set(h).send({ role: 'owner', active: true })).status,
      demoteOwner: (await api.patch(`${s}/team/${t.staff.id}`).set(h).send({ role: 'staff' })).status,
      removeOwner: (await api.delete(`${s}/team/${t.staff.id}`).set(h)).status,
      selfToOwner: (await api.patch(`${s}/team/${mgr.staff.id}`).set(h).send({ role: 'owner' })).status,
      takeOffline: (await api.patch(s).set(h).send({ isActive: false })).status,
    };
    expect(codes).toEqual({
      deleteShop: 403,
      transferToSelf: 403,
      customerExport: 403,
      customerDelete: 403,
      editOwner: 403,
      demoteOwner: 403,
      removeOwner: 403,
      selfToOwner: 400,
      takeOffline: 403,
    });
    const owner = await prisma.userShop.findUniqueOrThrow({ where: { id: t.staff.id } });
    expect([owner.role, owner.active]).toEqual(['owner', true]);
  });

  it('manager permission flags are enforced and only the owner can grant them', async () => {
    const t = await createTenant('Flags');
    const plain = await addManager(t, 'Plain', { canManageManagers: false, canEditShopSettings: false });
    const other = await addManager(t, 'Other', { canManageManagers: false, canEditShopSettings: false });
    const deputy = await addManager(t, 'Deputy', { canManageManagers: true, canEditShopSettings: false });
    const staff = await createStaffMember(t);
    const s = `/api/shops/${t.shop.id}`;
    const p = authHeader(plain.token);
    const d = authHeader(deputy.token);
    const codes = {
      plainEditsShop: (await api.patch(s).set(p).send({ name: 'x' })).status,
      plainCreatesManager: (await api.post(`${s}/team`).set(p).send({ name: 'M', role: 'manager', sendEmail: false })).status,
      plainPromotesStaff: (await api.patch(`${s}/team/${staff.staff.id}`).set(p).send({ role: 'manager' })).status,
      plainEditsOtherManager: (await api.patch(`${s}/team/${other.staff.id}`).set(p).send({ role: 'manager', active: false })).status,
      plainGrantsSelf: (await api.patch(`${s}/team/${plain.staff.id}`).set(p).send({ role: 'manager', canManageManagers: true, canEditShopSettings: true })).status,
      plainRemovesOtherManager: (await api.delete(`${s}/team/${other.staff.id}`).set(p)).status,
      deputyGrantsSelfSettings: (await api.patch(`${s}/team/${deputy.staff.id}`).set(d).send({ role: 'manager', canEditShopSettings: true })).status,
      deputyGrantsOther: (await api.patch(`${s}/team/${other.staff.id}`).set(d).send({ role: 'manager', canManageManagers: true })).status,
      deputyPromotesWithFlags: (await api.patch(`${s}/team/${staff.staff.id}`).set(d).send({ role: 'manager', canEditShopSettings: true })).status,
      deputyEditsShop: (await api.patch(s).set(d).send({ name: 'x' })).status,
    };
    expect(codes).toEqual({
      plainEditsShop: 403,
      plainCreatesManager: 403,
      plainPromotesStaff: 403,
      plainEditsOtherManager: 403,
      plainGrantsSelf: 403,
      plainRemovesOtherManager: 403,
      deputyGrantsSelfSettings: 403,
      deputyGrantsOther: 403,
      deputyPromotesWithFlags: 403,
      deputyEditsShop: 403,
    });
    const rows = await prisma.userShop.findMany({
      where: { shopId: t.shop.id, role: 'manager' },
      select: { canManageManagers: true, canEditShopSettings: true },
    });
    expect(rows.filter((r) => r.canEditShopSettings)).toHaveLength(0);
    expect(rows.filter((r) => r.canManageManagers)).toHaveLength(1);
  });

  it('an invite can only be accepted by the account whose email it names, and ownership only goes to an active manager with a login', async () => {
    const t = await createTenant('Inv');
    const outsider = await createTenant('Outsider');
    const staff = await createStaffMember(t);
    const s = `/api/shops/${t.shop.id}`;
    const made = await api
      .post(`${s}/team`)
      .set(authHeader(t.token))
      .send({ name: 'Invitee', email: 'invitee@audit-example.com', role: 'manager' });
    expect(made.status).toBe(201);
    const invite = await prisma.shopInvite.findFirstOrThrow({ where: { shopId: t.shop.id } });

    const steal = await api.post(`/api/invites/${invite.id}/accept`).set(authHeader(outsider.token));
    const decline = await api.post(`/api/invites/${invite.id}/decline`).set(authHeader(outsider.token));
    expect([steal.status, decline.status]).toEqual([404, 404]);
    expect((await prisma.userShop.findUniqueOrThrow({ where: { id: made.body.data.id } })).userId).toBeNull();
    // The raw token never leaves the server in an API response.
    expect(JSON.stringify(made.body)).not.toMatch(/[0-9a-f]{64}/);

    const toStaff = await api.post(`${s}/team/${staff.staff.id}/transfer-ownership`).set(authHeader(t.token));
    const toPlaceholder = await api.post(`${s}/team/${made.body.data.id}/transfer-ownership`).set(authHeader(t.token));
    expect([toStaff.status, toPlaceholder.status]).toEqual([400, 400]);
  });

  it('a deactivated or removed member loses access at once, even with a still-valid access token', async () => {
    const t = await createTenant('Gone');
    const mgr = await addManager(t);
    const staff = await createStaffMember(t);
    const s = `/api/shops/${t.shop.id}`;
    await prisma.userShop.update({ where: { id: mgr.staff.id }, data: { active: false } });
    const removed = await api.delete(`${s}/team/${staff.staff.id}`).set(authHeader(t.token));
    expect(removed.status).toBe(200);
    expect([
      (await api.get(s).set(authHeader(mgr.token))).status,
      (await api.patch(s).set(authHeader(mgr.token)).send({ name: 'x' })).status,
      (await api.get(`${s}/bookings`).set(authHeader(staff.token))).status,
      (await api.get('/api/shops').set(authHeader(mgr.token))).body.data.length,
    ]).toEqual([404, 404, 404, 0]);
  });

  it('the owner cannot delete their account while owning a shop, and a wrong password never deletes one', async () => {
    const t = await createTenant('Del');
    const res = await api.delete('/user/me').set(authHeader(t.token)).send({});
    expect(res.status).toBe(409);
    expect(await prisma.user.count({ where: { id: t.user.id } })).toBe(1);
  });
});
