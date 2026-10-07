import app from '../../../api/src/app';
import { serve } from '../../../api/src/tests/testRequest';
import {
  createTenant,
  addService,
  addWeeklySchedule,
} from '../../../api/src/tests/helpers';
import { prisma } from '../../../api/src/utils/prisma';

const api = await serve(app);

// Frozen clock (setup.ts): 2026-12-01. 2026-12-08 is a Tuesday inside the window.
const DATE = '2026-12-08';

describe('TI-04: GET /public/:slug lists more than the public page should', () => {
  // public.service.ts:83-95 filters shop.services by isActive/showOnPublicPage,
  // but members[].staffServices (public.service.ts:107-113) includes every
  // assigned service with no such filter.
  it('TI-04a: an internal-only service must not be named anywhere in the response', async () => {
    const t = await createTenant('Pub');
    const internal = await addService(t, 30, 'InternalOnlyTreatment');
    await prisma.service.update({
      where: { id: internal.id },
      data: { showOnPublicPage: false },
    });

    const res = await api.get(`/public/${t.shop.slug}`);
    expect(res.status).toBe(200);
    expect(JSON.stringify(res.body)).not.toContain('InternalOnlyTreatment');
  });

  it('TI-04b: a deactivated service must not be named anywhere in the response', async () => {
    const t = await createTenant('Pub');
    const retired = await addService(t, 30, 'RetiredSecretService');
    await prisma.service.update({
      where: { id: retired.id },
      data: { isActive: false },
    });

    const res = await api.get(`/public/${t.shop.slug}`);
    expect(JSON.stringify(res.body)).not.toContain('RetiredSecretService');
  });

  // public.service.ts:96-97 selects every active member, whatever their
  // bookableByCustomers flag, with role and createdAt.
  it('TI-04c: a member customers cannot book must not be listed', async () => {
    const t = await createTenant('Pub');
    await prisma.userShop.create({
      data: {
        shopId: t.shop.id,
        name: 'Backoffice Accountant',
        role: 'manager',
        bookableByCustomers: false,
        bookableInternally: false,
      },
    });

    const res = await api.get(`/public/${t.shop.slug}`);
    expect(JSON.stringify(res.body)).not.toContain('Backoffice Accountant');
  });
});

// ACCEPTED BY DESIGN (decision D3, 2026-10-06): a customer who identifies
// themselves in the first step of the wizard is shown their own durations;
// one who skips it gets the defaults. This now documents that behaviour.
describe('TI-05 (accepted): GET /public/:slug/slots follows the identified customer', () => {
  // public.controller.ts:287,316-317 passes the X-Customer-Phone header to
  // getAvailableSlots, which sizes the grid with that customer's own duration
  // (customerDuration.service.ts:21-31). The comment at public.controller.ts:305
  // says whether the phone is known "is never revealed"; the slot list reveals it.
  it('TI-05 (accepted): a known phone gets its own durations; an unknown one gets the default grid', async () => {
    const t = await createTenant('Oracle');
    await addWeeklySchedule(t); // 09:00-13:00 daily
    const customer = await prisma.customer.create({
      data: { shopId: t.shop.id, name: 'Known', phone: '6912345678' },
    });
    await prisma.customerServiceDuration.create({
      data: { customerId: customer.id, serviceId: t.service.id, duration: 120 },
    });

    const url = `/public/${t.shop.slug}/slots?date=${DATE}&serviceId=${t.service.id}&staffId=${t.staff.id}`;
    const known = await api.get(url).set('X-Customer-Phone', '6912345678');
    const unknown = await api.get(url).set('X-Customer-Phone', '6900000000');
    const anonymous = await api.get(url);

    expect(known.status).toBe(200);
    expect(unknown.status).toBe(200);
    expect(known.body.data).not.toEqual(anonymous.body.data);
    expect(unknown.body.data).toEqual(anonymous.body.data);
  });
});
