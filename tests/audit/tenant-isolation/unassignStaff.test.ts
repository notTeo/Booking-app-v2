import app from '../../../api/src/app';
import { serve } from '../../../api/src/tests/testRequest';
import { createTenant, authHeader } from '../../../api/src/tests/helpers';
import { prisma } from '../../../api/src/utils/prisma';

// service.service.ts:160-175 unassignStaffFromService: after the shop-access
// check on the caller's OWN shop, the assignment is looked up by
// { userShopId, serviceId } alone and deleted by id. Neither id is checked
// against :shopId. The existing crossShopIds suite swaps one id at a time
// (which 404s because no such pair exists); with BOTH ids from Shop B the pair
// exists and is deleted.

const api = await serve(app);

describe('TI-03: DELETE /api/shops/:shopId/services/:serviceId/staff/:userShopId', () => {
  it("TI-03: must not delete another shop's staff-service assignment", async () => {
    const a = await createTenant('AttackerA');
    const b = await createTenant('VictimB');

    // Both ids are readable by anyone from the victim's public page.
    const pub = await api.get(`/public/${b.shop.slug}`);
    const member = pub.body.data.members[0];
    const bMemberId: string = member.id;
    const bServiceId: string = member.staffServices[0].service.id;
    expect(bMemberId).toBe(b.staff.id);
    expect(bServiceId).toBe(b.service.id);

    const res = await api
      .delete(
        `/api/shops/${a.shop.id}/services/${bServiceId}/staff/${bMemberId}`,
      )
      .set(authHeader(a.token));

    const remaining = await prisma.staffService.count({
      where: { userShopId: b.staff.id, serviceId: b.service.id },
    });
    expect(remaining).toBe(1);
    expect(res.status).toBe(404);
  });
});
