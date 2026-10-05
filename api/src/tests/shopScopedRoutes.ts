import {
  addWeeklySchedule,
  createBookingRow,
  createStaffMember,
  createTenant,
} from './helpers';

// Every route under /api/shops/:id or /api/shops/:shopId/..., with the request
// each one needs. Shared by the membership matrix (membershipActive.test.ts)
// and the cross-shop ID-swap matrix (crossShopIds.test.ts).

// ── World: everything a shop-scoped route can point at ──────────────────────

export async function world() {
  const t = await createTenant('Matrix');
  const member = await createStaffMember(t, 'Target');
  const schedule = await addWeeklySchedule(t, { staffId: member.staff.id });
  const booking = await createBookingRow(t);
  return { t, member, schedule, booking };
}
export type World = Awaited<ReturnType<typeof world>>;

export const params = (w: World): Record<string, string> => ({
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

export const fill = (path: string, w: World) =>
  path.replace(/:(\w+)/g, (_, name: string) => {
    const v = params(w)[name];
    if (!v) throw new Error(`no fixture for :${name} in ${path}`);
    return v;
  });

// ── Route table ──────────────────────────────────────────────────────────────

export interface Fixture {
  // The lowest role let in: active members below it must get 403. 'manager'
  // admits the owner and managers, 'owner' only the owner.
  minRole?: 'manager' | 'owner';
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
export const SHOP_SCOPED: Record<string, Fixture> = {
  'GET /api/shops/:id': {},
  'PATCH /api/shops/:id': {
    minRole: 'manager',
    body: () => ({ name: 'Renamed' }),
  },
  'DELETE /api/shops/:id': { minRole: 'owner' },
  'GET /api/shops/:shopId/schedules/day': { query: 'date=2027-01-04' },
  'GET /api/shops/:shopId/overview': { query: 'range=week' },

  'GET /api/shops/:shopId/team': {},
  'POST /api/shops/:shopId/team': {
    minRole: 'manager',
    body: () => ({ name: 'New', role: 'staff', sendEmail: false }),
  },
  'GET /api/shops/:shopId/team/:memberId': {},
  'PATCH /api/shops/:shopId/team/:memberId': {
    minRole: 'manager',
    body: () => ({ role: 'staff', canViewCustomerDetails: false }),
  },
  'DELETE /api/shops/:shopId/team/:memberId': { minRole: 'manager' },
  'POST /api/shops/:shopId/team/:memberId/invite': { minRole: 'manager' },
  'DELETE /api/shops/:shopId/team/:memberId/invite': { minRole: 'manager' },
  'POST /api/shops/:shopId/team/:memberId/transfer-ownership': {
    minRole: 'owner',
  },
  'GET /api/shops/:shopId/team/:memberId/services': {},

  'POST /api/shops/:shopId/team/:memberId/schedules': {
    minRole: 'manager',
    body: () => ({ startDate: '2030-01-01', isActive: false }),
  },
  'GET /api/shops/:shopId/team/:memberId/schedules': {},
  'GET /api/shops/:shopId/team/:memberId/schedules/:scheduleId': {},
  'PATCH /api/shops/:shopId/team/:memberId/schedules/:scheduleId': {
    minRole: 'manager',
    body: () => ({ isActive: false }),
  },
  'DELETE /api/shops/:shopId/team/:memberId/schedules/:scheduleId': {
    minRole: 'manager',
  },
  'PUT /api/shops/:shopId/team/:memberId/schedules/:scheduleId/days': {
    minRole: 'manager',
    body: () => ({ days: [day] }),
  },
  'PATCH /api/shops/:shopId/team/:memberId/schedules/:scheduleId/days/:day': {
    minRole: 'manager',
    body: () => ({
      isOpen: true,
      hours: [{ startTime: '09:00', endTime: '12:00' }],
    }),
  },

  'POST /api/shops/:shopId/services': {
    minRole: 'manager',
    body: () => ({ name: 'Color', duration: 45, price: 5000 }),
  },
  'GET /api/shops/:shopId/services': {},
  'GET /api/shops/:shopId/services/:serviceId': {},
  'PATCH /api/shops/:shopId/services/:serviceId': {
    minRole: 'manager',
    body: () => ({ name: 'Cut v2' }),
  },
  'DELETE /api/shops/:shopId/services/:serviceId': { minRole: 'manager' },
  'POST /api/shops/:shopId/services/:serviceId/staff': {
    minRole: 'manager',
    body: (w) => ({ userShopId: w.member.staff.id }),
  },
  'DELETE /api/shops/:shopId/services/:serviceId/staff/:userShopId': {
    minRole: 'manager',
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
    minRole: 'manager',
    body: () => ({ notes: 'edited' }),
  },
  'PATCH /api/shops/:shopId/bookings/:bookingId/status': {
    body: () => ({ status: 'CONFIRMED' }),
  },

  'GET /api/shops/:shopId/customers': {},
  'GET /api/shops/:shopId/customers/:customerId': {},
  'GET /api/shops/:shopId/customers/:customerId/bookings': {},
  'PATCH /api/shops/:shopId/customers/:customerId': {
    body: () => ({ name: 'Renamed Customer' }),
  },
  'GET /api/shops/:shopId/customers/:customerId/export': { minRole: 'owner' },
  'DELETE /api/shops/:shopId/customers/:customerId': { minRole: 'owner' },
  'GET /api/shops/:shopId/customers/export-all': { minRole: 'manager' },
  'POST /api/shops/:shopId/customers/import': {
    minRole: 'manager',
    body: () => ({ rows: [{ name: 'Imported', phone: '6900000077' }] }),
  },
  'POST /api/shops/:shopId/customers/:customerId/merge': {
    minRole: 'manager',
    body: () => ({ sourceCustomerId: 'missing' }),
  },
};
