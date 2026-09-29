import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app';
import { authHeader, createStaffMember, createTenant } from './helpers';

// These five routes had NO validation chain at all before group 7 (every
// input they read is the inherited :shopId/:memberId path param). Adding
// shopIdParamValidation is mostly defense-in-depth/consistency with the rest
// of the API rather than closing an exploitable hole (requireMembership
// already scopes every one of these to the caller's own shop) -- but none of
// them had HTTP-level test coverage before this either, so this is also
// this suite's first coverage of the routes themselves (business logic was
// only covered via direct service-function calls elsewhere).
describe('previously-unvalidated shop-scoped list routes (group 7, part 3)', () => {
  it('GET /api/shops/:shopId/bookings/stats', async () => {
    const t = await createTenant('Stats');
    const res = await request(app)
      .get(`/api/shops/${t.shop.id}/bookings/stats`)
      .set(authHeader(t.token));
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ todayCount: 0, upcomingCount: 0 });
  });

  it('GET /api/shops/:shopId/team', async () => {
    const t = await createTenant('TeamList');
    const res = await request(app)
      .get(`/api/shops/${t.shop.id}/team`)
      .set(authHeader(t.token));
    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
  });

  it('GET /api/shops/:shopId/services', async () => {
    const t = await createTenant('ServiceList');
    const res = await request(app)
      .get(`/api/shops/${t.shop.id}/services`)
      .set(authHeader(t.token));
    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
  });

  it('GET /api/shops/:shopId/schedules', async () => {
    const t = await createTenant('ScheduleList');
    const res = await request(app)
      .get(`/api/shops/${t.shop.id}/schedules`)
      .set(authHeader(t.token));
    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
  });

  it('GET /api/shops/:shopId/team/:memberId/schedules', async () => {
    const t = await createTenant('StaffScheduleList');
    const staff = await createStaffMember(t);
    const res = await request(app)
      .get(`/api/shops/${t.shop.id}/team/${staff.staff.id}/schedules`)
      .set(authHeader(t.token));
    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
  });
});
