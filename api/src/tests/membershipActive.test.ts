import { describe, it, expect, vi } from 'vitest';
import { serve } from './testRequest';
import { prisma } from '../utils/prisma';
import {
  addSecondOwner,
  addWeeklySchedule,
  ALL_OVERRIDABLE_RULES,
  authHeader,
  createBookingRow,
  createStaffMember,
  createTenant,
  type Tenant,
} from './helpers';
import { loadApp } from './routeRegistry';

vi.mock('../services/email.service');

// One rule everywhere: a caller has access to a shop only through a UserShop
// row for it with active = true. A deactivated member is treated exactly like
// a non-member (404, so the shop's existence isn't revealed); 403 is only for
// an ACTIVE member who isn't an owner on an owner-only action.

const { app, routes } = await loadApp();
const api = await serve(app);

// ── World: everything a shop-scoped route can point at ──────────────────────

async function world() {
  const t = await createTenant('Matrix');
  const member = await createStaffMember(t, 'Target');
  const schedule = await addWeeklySchedule(t, { staffId: member.staff.id });
  const booking = await createBookingRow(t);
  return { t, member, schedule, booking };
}
type World = Awaited<ReturnType<typeof world>>;

const deactivate = (userShopId: string) =>
  prisma.userShop.update({
    where: { id: userShopId },
    data: { active: false },
  });

const params = (w: World): Record<string, string> => ({
  id: w.t.shop.id,
  shopId: w.t.shop.id,
  memberId: w.member.staff.id,
  userShopId: w.member.staff.id,
  serviceId: w.t.service.id,
  bookingId: w.booking.id,
  customerId: w.booking.customerId,
  scheduleId: w.schedule.id,
  day: 'MON',
});

const fill = (path: string, w: World) =>
  path.replace(/:(\w+)/g, (_, name: string) => {
    const v = params(w)[name];
    if (!v) throw new Error(`no fixture for :${name} in ${path}`);
    return v;
  });

// ── Route table ──────────────────────────────────────────────────────────────

interface Fixture {
  // Active staff must get 403 here (owner-only action).
  ownerOnly?: boolean;
  body?: (w: World) => object;
  query?: string;
}

const day = {
  day: 'MON',
  isOpen: true,
  hours: [{ startTime: '09:00', endTime: '12:00' }],
};

// Every route whose path is under /api/shops/:id or /api/shops/:shopId/... is
// shop-scoped and must have an entry here.
const SHOP_SCOPED: Record<string, Fixture> = {
  'GET /api/shops/:id': {},
  'PATCH /api/shops/:id': {
    ownerOnly: true,
    body: () => ({ name: 'Renamed' }),
  },
  'DELETE /api/shops/:id': { ownerOnly: true },
  'GET /api/shops/:shopId/schedules/day': { query: 'date=2027-01-04' },
  'GET /api/shops/:shopId/overview': { query: 'range=week' },

  'GET /api/shops/:shopId/team': {},
  'POST /api/shops/:shopId/team': {
    ownerOnly: true,
    body: () => ({ name: 'New', role: 'staff', sendEmail: false }),
  },
  'GET /api/shops/:shopId/team/:memberId': {},
  'PATCH /api/shops/:shopId/team/:memberId': {
    ownerOnly: true,
    body: () => ({ role: 'staff', canViewCustomerDetails: false }),
  },
  'DELETE /api/shops/:shopId/team/:memberId': { ownerOnly: true },
  'POST /api/shops/:shopId/team/:memberId/invite': { ownerOnly: true },
  'DELETE /api/shops/:shopId/team/:memberId/invite': { ownerOnly: true },
  'GET /api/shops/:shopId/team/:memberId/services': {},

  'POST /api/shops/:shopId/team/:memberId/schedules': {
    ownerOnly: true,
    body: () => ({ startDate: '2030-01-01', isActive: false }),
  },
  'GET /api/shops/:shopId/team/:memberId/schedules': {},
  'GET /api/shops/:shopId/team/:memberId/schedules/:scheduleId': {},
  'PATCH /api/shops/:shopId/team/:memberId/schedules/:scheduleId': {
    ownerOnly: true,
    body: () => ({ isActive: false }),
  },
  'DELETE /api/shops/:shopId/team/:memberId/schedules/:scheduleId': {
    ownerOnly: true,
  },
  'PUT /api/shops/:shopId/team/:memberId/schedules/:scheduleId/days': {
    ownerOnly: true,
    body: () => ({ days: [day] }),
  },
  'PATCH /api/shops/:shopId/team/:memberId/schedules/:scheduleId/days/:day': {
    ownerOnly: true,
    body: () => ({
      isOpen: true,
      hours: [{ startTime: '09:00', endTime: '12:00' }],
    }),
  },

  'POST /api/shops/:shopId/services': {
    ownerOnly: true,
    body: () => ({ name: 'Color', duration: 45, price: 5000 }),
  },
  'GET /api/shops/:shopId/services': {},
  'GET /api/shops/:shopId/services/:serviceId': {},
  'PATCH /api/shops/:shopId/services/:serviceId': {
    ownerOnly: true,
    body: () => ({ name: 'Cut v2' }),
  },
  'DELETE /api/shops/:shopId/services/:serviceId': { ownerOnly: true },
  'POST /api/shops/:shopId/services/:serviceId/staff': {
    ownerOnly: true,
    body: (w) => ({ userShopId: w.member.staff.id }),
  },
  'DELETE /api/shops/:shopId/services/:serviceId/staff/:userShopId': {
    ownerOnly: true,
  },

  'POST /api/shops/:shopId/bookings': {
    body: (w) => ({
      name: 'Walk In',
      phone: '6900000042',
      serviceId: w.t.service.id,
      staffId: w.t.staff.id,
      startTime: '2026-12-08T10:00:00.000Z',
      overrideRules: ['OUTSIDE_OPENING_HOURS', 'SHOP_CLOSED'],
    }),
  },
  'GET /api/shops/:shopId/bookings': {},
  'GET /api/shops/:shopId/bookings/stats': {},
  'GET /api/shops/:shopId/bookings/slots': {
    query: 'date=2027-01-04&serviceId=SERVICE',
  },
  'GET /api/shops/:shopId/bookings/:bookingId': {},
  'PATCH /api/shops/:shopId/bookings/:bookingId': {
    body: () => ({ notes: 'edited' }),
  },
  'PATCH /api/shops/:shopId/bookings/:bookingId/status': {
    body: () => ({ status: 'CONFIRMED' }),
  },

  'GET /api/shops/:shopId/customers': {},
  'GET /api/shops/:shopId/customers/:customerId': {},
  'PATCH /api/shops/:shopId/customers/:customerId': {
    body: () => ({ name: 'Renamed Customer' }),
  },
  'GET /api/shops/:shopId/customers/:customerId/export': { ownerOnly: true },
  'DELETE /api/shops/:shopId/customers/:customerId': { ownerOnly: true },
};

// Authenticated routes that are NOT gated by shop membership, each with why.
const EXEMPT_AUTHENTICATED: Record<string, string> = {
  'GET /auth/sessions': "the caller's own login sessions",
  'DELETE /auth/sessions': "the caller's own login sessions",
  'GET /user/me': "the caller's own account",
  'PATCH /user/me': "the caller's own account",
  'DELETE /user/me': "the caller's own account",
  'POST /api/shops': 'creates a new shop; the caller becomes its owner',
  'GET /api/shops': "lists the caller's ACTIVE memberships (tested below)",
  'GET /api/shops/overview':
    "sums the caller's ACTIVE memberships (tested below)",
  'GET /api/shops/upcoming':
    "lists the caller's ACTIVE memberships (tested below)",
  'GET /api/invites': "invites addressed to the caller's own email",
  'POST /api/invites/:inviteId/accept':
    'addressed to the invitee by email, not shop access',
  'POST /api/invites/:inviteId/decline':
    'addressed to the invitee by email, not shop access',
};

// Routes with no login at all.
const isPublic = (key: string) =>
  /^\w+ \/(auth|public)\//.test(key) ||
  key === 'GET /api/invites/lookup' ||
  key === 'GET /health';

const key = (r: { method: string; path: string }) => `${r.method} ${r.path}`;
const isShopScoped = (path: string) =>
  /^\/api\/shops\/:(id|shopId)\//.test(path) || path === '/api/shops/:id';

describe('route inventory', () => {
  it('finds the routes (guards the walker itself)', () => {
    expect(routes.length).toBeGreaterThan(50);
  });

  it('every authenticated route is in the fixture table or the exempt list', () => {
    const unlisted = routes
      .filter((r) => r.authenticated)
      .map(key)
      .filter((k) => !(k in SHOP_SCOPED) && !(k in EXEMPT_AUTHENTICATED));
    expect(
      unlisted,
      'New authenticated route(s): add to SHOP_SCOPED (shop access is enforced and tested) or to EXEMPT_AUTHENTICATED with a reason',
    ).toEqual([]);
  });

  it('every route without authentication is a known public route', () => {
    const open = routes
      .filter((r) => !r.authenticated)
      .map(key)
      .filter((k) => !isPublic(k));
    expect(open, 'route(s) missing `authenticate`').toEqual([]);
  });

  it('shop-scoped routes are never exempted, and tables have no stale entries', () => {
    const live = new Set(routes.map(key));
    for (const k of Object.keys(SHOP_SCOPED)) expect(live, k).toContain(k);
    for (const k of Object.keys(EXEMPT_AUTHENTICATED))
      expect(live, k).toContain(k);
    for (const k of Object.keys(EXEMPT_AUTHENTICATED))
      expect(isShopScoped(k.split(' ')[1]), k).toBe(false);
    for (const k of Object.keys(SHOP_SCOPED))
      expect(isShopScoped(k.split(' ')[1]), k).toBe(true);
  });
});

// ── The matrix ───────────────────────────────────────────────────────────────

const call = (
  method: string,
  fx: Fixture,
  path: string,
  w: World,
  token: string,
) => {
  const query = fx.query?.replace('SERVICE', w.t.service.id);
  const req = (
    api as unknown as Record<string, (url: string) => import('supertest').Test>
  )
    [method.toLowerCase()](`${fill(path, w)}${query ? `?${query}` : ''}`)
    .set(authHeader(token));
  return fx.body ? req.send(fx.body(w)) : req;
};

const shape = (res: { status: number; body: unknown }) => ({
  status: res.status,
  body: res.body,
});

describe.each(Object.entries(SHOP_SCOPED))('%s', (routeKey, fx) => {
  const [method, path] = routeKey.split(' ');

  it('an inactive member is denied exactly like a non-member (404, owner or staff)', async () => {
    const w = await world();
    const outsider = await createTenant('Outsider');
    const inactiveOwner = await addSecondOwner(w.t, 'GoneOwner');
    await deactivate(inactiveOwner.staff.id);
    const inactiveStaff = await createStaffMember(w.t, 'GoneStaff');
    await deactivate(inactiveStaff.staff.id);

    const nonMember = await call(method, fx, path, w, outsider.token);
    expect(nonMember.status, JSON.stringify(nonMember.body)).toBe(404);
    expect(nonMember.body.message).toBe('Shop not found');

    for (const [label, token] of [
      ['inactive owner', inactiveOwner.token],
      ['inactive staff', inactiveStaff.token],
    ] as const) {
      const res = await call(method, fx, path, w, token);
      expect(shape(res), label).toEqual(shape(nonMember));
    }

    // …and the shop is untouched by any of those attempts.
    expect(
      await prisma.shop.findUnique({ where: { id: w.t.shop.id } }),
    ).not.toBeNull();
  });

  it(
    fx.ownerOnly
      ? 'an active staff member gets 403, the owner is let in'
      : 'an active member and the owner are let in',
    async () => {
      const w = await world();
      const staff = await createStaffMember(w.t, 'ActiveStaff');
      if (fx.ownerOnly) {
        const res = await call(method, fx, path, w, staff.token);
        expect(res.status, JSON.stringify(res.body)).toBe(403);
      } else {
        const res = await call(method, fx, path, w, staff.token);
        expect(res.body.message).not.toBe('Shop not found');
      }
      const owner = await call(method, fx, path, w, w.t.token);
      expect(owner.status, JSON.stringify(owner.body)).not.toBe(403);
      // Letting the owner in must never surface as a server error (e.g. a
      // service that still has bookings is a 409, not an FK-violation 500).
      expect(owner.status, JSON.stringify(owner.body)).toBeLessThan(500);
      expect(owner.body.message).not.toBe('Shop not found');
    },
  );
});

// ── Specifics ────────────────────────────────────────────────────────────────

describe('an inactive OWNER (only reachable by editing the DB)', () => {
  it('is denied every owner-only action, same as a non-member', async () => {
    const w = await world();
    const owner2 = await addSecondOwner(w.t);
    await deactivate(owner2.staff.id);
    for (const [k, fx] of Object.entries(SHOP_SCOPED).filter(
      ([, f]) => f.ownerOnly,
    )) {
      const [method, path] = k.split(' ');
      const res = await call(method, fx, path, w, owner2.token);
      expect(res.status, k).toBe(404);
    }
  });

  it('the tenant owner row itself can be made inactive and loses access', async () => {
    const t = await createTenant('SoleOwner');
    await deactivate(t.staff.id);
    const res = await api
      .get(`/api/shops/${t.shop.id}`)
      .set(authHeader(t.token));
    expect(res.status).toBe(404);
  });
});

describe('reactivation', () => {
  it('a member regains access when an owner sets active back to true', async () => {
    const t = await createTenant('React');
    const staff = await createStaffMember(t, 'Comeback');
    const url = `/api/shops/${t.shop.id}/bookings/stats`;
    expect((await api.get(url).set(authHeader(staff.token))).status).toBe(200);

    const off = await api
      .patch(`/api/shops/${t.shop.id}/team/${staff.staff.id}`)
      .set(authHeader(t.token))
      .send({ role: 'staff', active: false });
    expect(off.status).toBe(200);
    expect((await api.get(url).set(authHeader(staff.token))).status).toBe(404);

    const on = await api
      .patch(`/api/shops/${t.shop.id}/team/${staff.staff.id}`)
      .set(authHeader(t.token))
      .send({ role: 'staff', active: true });
    expect(on.status).toBe(200);
    expect((await api.get(url).set(authHeader(staff.token))).status).toBe(200);
  });

  it('deactivating clears both bookable flags; reactivating restores both to true', async () => {
    const t = await createTenant('Flags');
    const staff = await createStaffMember(t, 'Toggler');
    const url = `/api/shops/${t.shop.id}/team/${staff.staff.id}`;
    const flags = () =>
      prisma.userShop.findUniqueOrThrow({
        where: { id: staff.staff.id },
        select: { bookableByCustomers: true, bookableInternally: true },
      });

    const off = await api
      .patch(url)
      .set(authHeader(t.token))
      .send({ role: 'staff', active: false });
    expect(off.status).toBe(200);
    expect(await flags()).toEqual({
      bookableByCustomers: false,
      bookableInternally: false,
    });

    // The member page form sends every field on each save, so the stale
    // `false` flags arrive alongside active: true. They must not win.
    const on = await api.patch(url).set(authHeader(t.token)).send({
      role: 'staff',
      active: true,
      bookableByCustomers: false,
      bookableInternally: false,
    });
    expect(on.status).toBe(200);
    expect(on.body.data.bookableByCustomers).toBe(true);
    expect(on.body.data.bookableInternally).toBe(true);
    expect(await flags()).toEqual({
      bookableByCustomers: true,
      bookableInternally: true,
    });
  });

  it('saving an already-active member keeps the flags the owner chose', async () => {
    const t = await createTenant('Keep');
    const staff = await createStaffMember(t, 'Keeper');
    const res = await api
      .patch(`/api/shops/${t.shop.id}/team/${staff.staff.id}`)
      .set(authHeader(t.token))
      .send({ role: 'staff', active: true, bookableByCustomers: false });
    expect(res.status).toBe(200);
    expect(res.body.data.bookableByCustomers).toBe(false);
    expect(res.body.data.bookableInternally).toBe(true);
  });

  it('an inactive member is still manageable by the owner (listed, editable, removable)', async () => {
    const t = await createTenant('Manage');
    const staff = await createStaffMember(t, 'Parked');
    await deactivate(staff.staff.id);
    const list = await api
      .get(`/api/shops/${t.shop.id}/team`)
      .set(authHeader(t.token));
    expect(list.body.data.map((m: { id: string }) => m.id)).toContain(
      staff.staff.id,
    );
    const one = await api
      .get(`/api/shops/${t.shop.id}/team/${staff.staff.id}`)
      .set(authHeader(t.token));
    expect(one.status).toBe(200);
  });
});

describe("the caller's own shop lists skip inactive memberships", () => {
  it('GET /api/shops, /overview and /upcoming', async () => {
    const t = await createTenant('Lists');
    const staff = await createStaffMember(t, 'Listed');
    const get = (p: string) => api.get(p).set(authHeader(staff.token));

    expect(JSON.stringify((await get('/api/shops')).body)).toContain(t.shop.id);
    await deactivate(staff.staff.id);
    for (const p of [
      '/api/shops',
      '/api/shops/overview?range=week',
      '/api/shops/upcoming',
    ]) {
      const res = await get(p);
      expect(res.status, p).toBe(200);
      expect(JSON.stringify(res.body), p).not.toContain(t.shop.id);
    }
  });
});

describe('status codes: 404 for non-members, 403 only for active non-owners', () => {
  it('services (formerly 403 for non-members) now 404s like everything else', async () => {
    const t = await createTenant('Svc');
    const outsider = await createTenant('Out');
    const res = await api
      .get(`/api/shops/${t.shop.id}/services`)
      .set(authHeader(outsider.token));
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Shop not found');
  });

  it('an active staff member on an owner-only action still gets 403', async () => {
    const t = await createTenant('Forbid');
    const staff = await createStaffMember(t);
    const res = await api
      .post(`/api/shops/${t.shop.id}/services`)
      .set(authHeader(staff.token))
      .send({ name: 'X', duration: 30, price: 100 });
    expect(res.status).toBe(403);
  });
});

describe('login invites', () => {
  const member = async (t: Tenant) =>
    prisma.userShop.create({
      data: {
        shopId: t.shop.id,
        name: 'No Login',
        email: `nologin-${Date.now()}@example.com`,
        role: 'staff',
      },
    });

  it('are rejected with 400 MEMBER_INACTIVE for an inactive member', async () => {
    const t = await createTenant('Invite');
    const m = await member(t);
    await deactivate(m.id);
    const res = await api
      .post(`/api/shops/${t.shop.id}/team/${m.id}/invite`)
      .set(authHeader(t.token));
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('MEMBER_INACTIVE');
    expect(res.body.message).toBe(
      'Activate this member before sending an invite.',
    );
    expect(await prisma.shopInvite.count({ where: { userShopId: m.id } })).toBe(
      0,
    );
  });

  it('still work for an active member, and after reactivation', async () => {
    const t = await createTenant('Invite2');
    const m = await member(t);
    const url = `/api/shops/${t.shop.id}/team/${m.id}/invite`;
    expect((await api.post(url).set(authHeader(t.token))).status).toBe(200);
    await deactivate(m.id);
    expect((await api.post(url).set(authHeader(t.token))).status).toBe(400);
    await prisma.userShop.update({
      where: { id: m.id },
      data: { active: true },
    });
    expect((await api.post(url).set(authHeader(t.token))).status).toBe(200);
  });
});

describe('moving a booking to another staff member', () => {
  const setup = async () => {
    const t = await createTenant('Move');
    const other = await createStaffMember(t, 'Other');
    await prisma.staffService.create({
      data: { userShopId: other.staff.id, serviceId: t.service.id },
    });
    const booking = await createBookingRow(t, '2026-12-08T10:00:00.000Z');
    const patch = (body: object) =>
      api
        .patch(`/api/shops/${t.shop.id}/bookings/${booking.id}`)
        .set(authHeader(t.token))
        .send(body);
    return { t, other, booking, patch };
  };

  it('rejects an inactive target when the staff actually changes', async () => {
    const { other, patch } = await setup();
    await deactivate(other.staff.id);
    const res = await patch({
      staffId: other.staff.id,
      overrideRules: ALL_OVERRIDABLE_RULES,
    });
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Staff member not found');
  });

  it('allows an active target', async () => {
    const { other, patch } = await setup();
    const res = await patch({
      staffId: other.staff.id,
      overrideRules: ALL_OVERRIDABLE_RULES,
    });
    expect(res.status, JSON.stringify(res.body)).toBe(200);
  });

  it('allows resending an unchanged staffId whose member was deactivated since', async () => {
    const { t, booking, patch } = await setup();
    const holder = await prisma.userShop.create({
      data: { shopId: t.shop.id, name: 'Holder', role: 'staff' },
    });
    await prisma.booking.update({
      where: { id: booking.id },
      data: { staffId: holder.id },
    });
    await deactivate(holder.id);
    const res = await patch({ staffId: holder.id, notes: 'still editable' });
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect(res.body.data.notes).toBe('still editable');
  });
});
