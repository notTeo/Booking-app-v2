// True negatives: boundary cases of the public booking flow that behave
// correctly today. These are expected to PASS.
import {
  at,
  DAY,
  addMember,
  book,
  bookingWithToken,
  getApi,
  holding,
  phone,
  prisma,
  shop,
  slots,
} from './_helpers';
import { addWeeklySchedule, createTenant } from '../../../api/src/tests/helpers';

vi.mock('../../../api/src/services/email.service', async (orig) =>
  (await import('./_mockEmail')).stubEmail(orig),
);
vi.setConfig({ testTimeout: 60_000 });

const post = async (path: string, body: object) => (await getApi()).post(path).send(body);
const long = async (t: Awaited<ReturnType<typeof shop>>, duration = 60) => {
  const s = await prisma.service.create({
    data: { shopId: t.shop.id, name: `Long${duration}`, duration, price: 1000 },
  });
  await prisma.staffService.create({ data: { userShopId: t.staff.id, serviceId: s.id } });
  return s;
};

describe('overlap boundaries', () => {
  it('back-to-back before and after an existing booking is allowed (half-open ranges)', async () => {
    const t = await shop();
    expect((await book(t, { startTime: at('10:00') })).status).toBe(201);
    expect((await book(t, { startTime: at('10:30') })).status).toBe(201);
    expect((await book(t, { startTime: at('09:30') })).status).toBe(201);
    expect(await holding(t.staff.id)).toHaveLength(3);
  });

  it('same start -> 409 SLOT_TAKEN', async () => {
    const t = await shop();
    await book(t);
    const res = await book(t);
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('SLOT_TAKEN');
  });

  it('partial overlap from either side and containment -> 409', async () => {
    const t = await shop();
    const l60 = await long(t, 60);
    const l120 = await long(t, 120);
    await book(t, { startTime: at('10:30') }); // 10:30-11:00
    expect((await book(t, { serviceId: l60.id, startTime: at('10:00') })).status).toBe(409); // tail overlaps
    expect((await book(t, { serviceId: l120.id, startTime: at('10:00') })).status).toBe(409); // contains it
    await book(t, { serviceId: l60.id, startTime: at('11:00') }); // 11:00-12:00
    expect((await book(t, { startTime: at('11:30') })).status).toBe(409); // inside it
    expect(await holding(t.staff.id)).toHaveLength(2);
  });

  it('a CANCELED or NO_SHOW booking frees its slot; a COMPLETED one does not', async () => {
    const t = await shop();
    for (const [status, expected] of [['CANCELED', 201], ['NO_SHOW', 201], ['COMPLETED', 409]] as const) {
      const made = await book(t, { startTime: at('10:00') });
      expect(made.status).toBe(201);
      await prisma.booking.update({ where: { id: made.body.data.id }, data: { status } });
      const again = await book(t, { startTime: at('10:00') });
      expect(again.status, status).toBe(expected);
      await prisma.booking.deleteMany({ where: { shopId: t.shop.id } });
    }
  });

  it('the same staff slot in another shop is independent', async () => {
    const a = await shop('A');
    const b = await shop('B');
    expect((await book(a)).status).toBe(201);
    expect((await book(b)).status).toBe(201);
  });
});

describe('booking rules', () => {
  it('in the past -> 422 BOOKING_IN_PAST; exactly now is accepted', async () => {
    const t = await shop();
    const past = await book(t, { startTime: at('10:30', '2026-12-01') }); // now is 11:00 shop time
    expect(past.status).toBe(422);
    expect(past.body.code).toBe('BOOKING_IN_PAST');
    const now = await book(t, { startTime: '2026-12-01T09:00:00.000Z' });
    expect(now.status).toBe(201);
  });

  it('before opening, running past closing and off the grid -> 422', async () => {
    const t = await shop();
    const l60 = await long(t, 60);
    const early = await book(t, { startTime: at('08:30') });
    expect([early.status, early.body.code]).toEqual([422, 'OUTSIDE_OPENING_HOURS']);
    const late = await book(t, { serviceId: l60.id, startTime: at('12:30') });
    expect([late.status, late.body.code]).toEqual([422, 'OUTSIDE_OPENING_HOURS']);
    const atClose = await book(t, { startTime: at('13:00') });
    expect(atClose.status).toBe(422);
    const off = await book(t, { startTime: at('10:15') });
    expect([off.status, off.body.code]).toEqual([422, 'OFF_SLOT_GRID']);
    const sub = await book(t, { startTime: '2026-12-08T10:00:00.001+02:00' });
    expect([sub.status, sub.body.code]).toEqual([422, 'OFF_SLOT_GRID']);
    expect((await book(t, { startTime: at('12:30') })).status).toBe(201); // last slot ends at closing
  });

  it('closed weekday / staff with no schedule -> 422 SHOP_CLOSED', async () => {
    const t = await createTenant('Closed');
    await addWeeklySchedule(t, { closedDays: ['TUE'] });
    const res = await book(t); // DAY is a Tuesday
    expect([res.status, res.body.code]).toEqual([422, 'SHOP_CLOSED']);
    const none = await createTenant('NoSched');
    const res2 = await book(none);
    expect([res2.status, res2.body.code]).toEqual([422, 'SHOP_CLOSED']);
  });

  it('maxAdvanceDays: the last day is bookable, the next is not; the window uses the shop-local date', async () => {
    const t = await shop(); // default 60 days from 2026-12-01 -> 2027-01-30
    expect((await book(t, { startTime: at('10:00', '2027-01-30') })).status).toBe(201);
    const res = await book(t, { startTime: at('10:00', '2027-01-31') });
    expect([res.status, res.body.code]).toEqual([422, 'BOOKING_BEYOND_ADVANCE_WINDOW']);
    await prisma.shop.update({ where: { id: t.shop.id }, data: { maxAdvanceDays: 0 } });
    expect((await book(t, { startTime: at('12:00', '2026-12-01') })).status).toBe(201);
    expect((await book(t, { startTime: at('10:00', '2026-12-02') })).status).toBe(422);
  });

  it('time off: whole day closes it, part of a day is cut out, shop-wide applies to everyone', async () => {
    const t = await shop();
    const l60 = await long(t, 60);
    const day = new Date(`${DAY}T00:00:00.000Z`);
    const off = await prisma.timeOff.create({
      data: { shopId: t.shop.id, staffId: t.staff.id, startDate: day, endDate: day, startTime: '10:00', endTime: '11:00' },
    });
    expect((await book(t, { startTime: at('10:00') })).status).toBe(422);
    expect((await book(t, { startTime: at('10:30') })).status).toBe(422);
    expect((await book(t, { serviceId: l60.id, startTime: at('09:30') })).status).toBe(422); // runs into it
    expect((await book(t, { startTime: at('09:30') })).status).toBe(201); // ends as it starts
    expect((await book(t, { startTime: at('11:00') })).status).toBe(201); // starts as it ends
    const s = await slots(t, `date=${DAY}&serviceId=${t.service.id}&staffId=${t.staff.id}`);
    expect(s.body.data.slots.map((x: { time: string }) => x.time)).not.toContain('10:00');

    await prisma.timeOff.update({ where: { id: off.id }, data: { startTime: null, endTime: null } });
    const whole = await book(t, { startTime: at('12:00') });
    expect([whole.status, whole.body.code]).toEqual([422, 'SHOP_CLOSED']);

    await prisma.timeOff.update({ where: { id: off.id }, data: { staffId: null } });
    const m = await addMember(t, 'Other', [t.service.id]);
    expect((await book(t, { staffId: m.id, startTime: at('12:00') })).status).toBe(422);
    expect((await book(t, { staffId: undefined, startTime: at('12:00') })).status).toBe(422);
    // the day before is unaffected
    expect((await book(t, { startTime: at('12:00', '2026-12-07') })).status).toBe(201);
  });
});

describe('who and what can be booked', () => {
  it("another tenant's staff, service or product is refused", async () => {
    const a = await shop('A');
    const b = await shop('B');
    const bProduct = await prisma.product.create({
      data: { shopId: b.shop.id, name: 'Wax', price: 900, stock: 5 },
    });
    expect((await book(a, { staffId: b.staff.id })).status).toBe(400);
    expect((await book(a, { serviceId: b.service.id })).status).toBe(404);
    expect((await book(a, { serviceId: undefined, serviceIds: [a.service.id, b.service.id] })).status).toBe(404);
    const p = await book(a, { products: [{ productId: bProduct.id, quantity: 1 }] });
    expect([p.status, p.body.code]).toEqual([404, 'PRODUCT_NOT_FOUND']);
    const s = await slots(a, `date=${DAY}&serviceId=${b.service.id}&staffId=${b.staff.id}`);
    expect(s.body.data).toEqual({ status: 'closed' });
    expect(await prisma.booking.count()).toBe(0);
  });

  it('inactive or non-public service -> 404; non-bookable or deactivated staff -> 400', async () => {
    const t = await shop();
    await prisma.service.update({ where: { id: t.service.id }, data: { showOnPublicPage: false } });
    expect((await book(t)).status).toBe(404);
    await prisma.service.update({ where: { id: t.service.id }, data: { showOnPublicPage: true, isActive: false } });
    expect((await book(t)).status).toBe(404);
    await prisma.service.update({ where: { id: t.service.id }, data: { isActive: true } });

    await prisma.userShop.update({ where: { id: t.staff.id }, data: { bookableByCustomers: false } });
    expect((await book(t)).status).toBe(400);
    expect((await book(t, { staffId: undefined })).status).toBe(400); // "any staff" pool is empty
    await prisma.userShop.update({ where: { id: t.staff.id }, data: { bookableByCustomers: true, active: false } });
    expect((await book(t)).status).toBe(400);
    expect((await book(t, { staffId: undefined })).status).toBe(400);
    expect(await prisma.booking.count()).toBe(0);
  });

  it('inactive shop -> 404 (book, slots, shop info); locked shop -> 403 SHOP_LOCKED', async () => {
    const t = await shop();
    await prisma.shop.update({ where: { id: t.shop.id }, data: { subscriptionStatus: 'TRIALING', trialEndsAt: new Date('2026-11-30T00:00:00Z') } });
    const locked = await book(t);
    expect([locked.status, locked.body.code]).toEqual([403, 'SHOP_LOCKED']);
    await prisma.shop.update({ where: { id: t.shop.id }, data: { subscriptionStatus: 'ACTIVE', isActive: false } });
    expect((await book(t)).status).toBe(404);
    expect((await slots(t, `date=${DAY}&serviceId=${t.service.id}`)).status).toBe(404);
    expect((await (await getApi()).get(`/public/${t.shop.slug}`)).status).toBe(404);
    expect(await prisma.booking.count()).toBe(0);
  });

  it('"any staff" gives the slot to a free member and answers 409 only when all are taken', async () => {
    const t = await shop();
    const m = await addMember(t, 'Second', [t.service.id]);
    const ids = new Set<string>();
    for (let i = 0; i < 2; i++) {
      const res = await book(t, { staffId: undefined });
      expect(res.status).toBe(201);
      ids.add((await prisma.booking.findUniqueOrThrow({ where: { id: res.body.data.id } })).staffId);
    }
    expect(ids).toEqual(new Set([t.staff.id, m.id]));
    expect((await book(t, { staffId: undefined })).status).toBe(409);
  });

  it('"any staff" never assigns a member who is off, not public, or does not do the service', async () => {
    const t = await shop();
    const other = await prisma.service.create({ data: { shopId: t.shop.id, name: 'Other', duration: 30, price: 1 } });
    await addMember(t, 'NoService', [other.id]);
    await addMember(t, 'NoSchedule', [t.service.id], { schedule: false });
    const hidden = await addMember(t, 'Hidden', [t.service.id]);
    await prisma.userShop.update({ where: { id: hidden.id }, data: { bookableByCustomers: false } });
    const first = await book(t, { staffId: undefined });
    expect(first.status).toBe(201);
    expect((await prisma.booking.findUniqueOrThrow({ where: { id: first.body.data.id } })).staffId).toBe(t.staff.id);
    // Refused once the only working member is taken (the status code it is
    // refused with is finding PB-12).
    expect((await book(t, { staffId: undefined })).status).not.toBe(201);
    expect(await prisma.booking.count({ where: { shopId: t.shop.id } })).toBe(1);
  });
});

describe('customer record', () => {
  it('a public booking with a known phone never rewrites that customer, and the response echoes no customer data', async () => {
    const t = await shop();
    const existing = await prisma.customer.create({
      data: { shopId: t.shop.id, name: 'Real Name', phone: '+306940000009', email: 'real@example.com', notes: 'private' },
    });
    const res = await book(t, { name: 'Attacker', phone: '+306940000009', email: 'evil@example.com' });
    expect(res.status).toBe(201);
    const after = await prisma.customer.findUniqueOrThrow({ where: { id: existing.id } });
    expect([after.name, after.email, after.notes]).toEqual(['Real Name', 'real@example.com', 'private']);
    const text = JSON.stringify(res.body);
    for (const leak of ['Real Name', 'real@example.com', 'private', 'cancelToken', existing.id])
      expect(text).not.toContain(leak);
  });

  it('the same phone in two shops is two separate customers', async () => {
    const a = await shop('A');
    const b = await shop('B');
    await book(a, { phone: '+306940000010', name: 'In A' });
    await book(b, { phone: '+306940000010', name: 'In B' });
    const rows = await prisma.customer.findMany({ where: { phone: '+306940000010' }, orderBy: { name: 'asc' } });
    expect(rows.map((c) => [c.shopId, c.name])).toEqual([[a.shop.id, 'In A'], [b.shop.id, 'In B']]);
  });

  it('10 parallel bookings with one new phone at different times create one customer and no 5xx', async () => {
    const t = await shop('P', '09:00', '15:00');
    const p = phone();
    const times = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30'];
    const rs = await Promise.all(times.map((h) => book(t, { phone: p, startTime: at(h) })));
    expect(rs.map((r) => r.status)).toEqual(times.map(() => 201));
    expect(await prisma.customer.count({ where: { shopId: t.shop.id } })).toBe(1);
  });
});

describe('multi-service and products', () => {
  it('several services hold their total length and must all fit', async () => {
    const t = await shop();
    const beard = await long(t, 30);
    const res = await book(t, { serviceId: undefined, serviceIds: [t.service.id, beard.id], startTime: at('10:00') });
    expect(res.status).toBe(201);
    expect(res.body.data.endTime).toBe(new Date(at('11:00')).toISOString());
    expect((await book(t, { startTime: at('10:30') })).status).toBe(409);
    const late = await book(t, { serviceId: undefined, serviceIds: [t.service.id, beard.id], startTime: at('12:30') });
    expect(late.status).toBe(422);
    const six = await book(t, { serviceId: undefined, serviceIds: ['a', 'b', 'c', 'd', 'e', 'f'] });
    expect(six.status).toBe(400);
  });

  it('products: over stock -> 422, bad quantity -> 400, duplicates -> 400, plan without products -> 403; nothing is booked', async () => {
    const t = await shop();
    const p = await prisma.product.create({ data: { shopId: t.shop.id, name: 'Wax', price: 900, stock: 2 } });
    const over = await book(t, { products: [{ productId: p.id, quantity: 3 }] });
    expect([over.status, over.body.code]).toEqual([422, 'PRODUCT_OUT_OF_STOCK']);
    for (const quantity of [0, -1, 100, 1.5])
      expect((await book(t, { products: [{ productId: p.id, quantity }] })).status).toBe(400);
    expect((await book(t, { products: [{ productId: p.id, quantity: 1 }, { productId: p.id, quantity: 1 }] })).status).toBe(400);
    await prisma.shop.update({ where: { id: t.shop.id }, data: { plan: 'SOLO' } });
    expect((await book(t, { products: [{ productId: p.id, quantity: 1 }] })).status).toBe(403);
    expect(await prisma.booking.count()).toBe(0);
  });
});

describe('cancel / reschedule token', () => {
  it('a token is dead after cancel: cancel and reschedule both 409 BOOKING_ALREADY_CANCELED', async () => {
    const t = await shop();
    const { token } = await bookingWithToken(t);
    expect((await post('/public/cancel', { token })).status).toBe(200);
    const again = await post('/public/cancel', { token });
    expect([again.status, again.body.code]).toEqual([409, 'BOOKING_ALREADY_CANCELED']);
    const move = await post('/public/reschedule', { token, startTime: at('12:00') });
    expect([move.status, move.body.code]).toEqual([409, 'BOOKING_ALREADY_CANCELED']);
    expect(await holding(t.staff.id)).toHaveLength(0);
  });

  it('the old token is dead after a reschedule; the new booking gets a new one that works', async () => {
    const t = await shop();
    const { token, booking } = await bookingWithToken(t);
    const moved = await post('/public/reschedule', { token, startTime: at('12:00') });
    expect(moved.status).toBe(200);
    for (const path of ['/public/cancel', '/public/reschedule']) {
      const res = await post(path, { token, startTime: at('11:00') });
      expect([res.status, res.body.code], path).toEqual([409, 'BOOKING_RESCHEDULED']);
    }
    const fresh = await prisma.booking.findUniqueOrThrow({ where: { id: moved.body.data.id } });
    expect(fresh.cancelToken).not.toBe(token);
    expect(fresh.rescheduledFromId).toBe(booking.id);
    expect(await holding(t.staff.id)).toHaveLength(1);
    expect((await post('/public/cancel', { token: fresh.cancelToken })).status).toBe(200);
  });

  it('rescheduling into an occupied slot -> 409 and the booking stays where it was', async () => {
    const t = await shop();
    const { token, booking } = await bookingWithToken(t, { start: at('10:00') });
    await bookingWithToken(t, { start: at('11:00') });
    const res = await post('/public/reschedule', { token, startTime: at('11:00') });
    expect([res.status, res.body.code]).toEqual([409, 'SLOT_TAKEN']);
    const row = await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } });
    expect([row.status, row.startTime.toISOString()]).toEqual(['CONFIRMED', new Date(at('10:00')).toISOString()]);
  });

  it('rescheduling a 60-min booking 30 minutes later (overlapping only itself) works', async () => {
    const t = await shop();
    const l60 = await long(t, 60);
    const { token } = await bookingWithToken(t, { start: at('10:00'), serviceId: l60.id, minutes: 60 });
    const res = await post('/public/reschedule', { token, startTime: at('10:30') });
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect(await holding(t.staff.id)).toHaveLength(1);
  });

  it('reschedule obeys the rules: past, outside hours, beyond the window, another shop\'s staff', async () => {
    const a = await shop('A');
    const b = await shop('B');
    const { token } = await bookingWithToken(a);
    const cases: [object, number][] = [
      [{ startTime: at('10:30', '2026-12-01') }, 422],
      [{ startTime: at('15:00') }, 422],
      [{ startTime: at('10:00', '2027-03-01') }, 422],
      [{ startTime: at('12:00'), staffId: b.staff.id }, 400],
      [{ startTime: at('10:00') }, 400], // unchanged
    ];
    for (const [body, status] of cases) {
      const res = await post('/public/reschedule', { token, ...body });
      expect(res.status, JSON.stringify(body)).toBe(status);
    }
    const rows = await holding(a.staff.id);
    expect(rows).toHaveLength(1);
    expect(await holding(b.staff.id)).toHaveLength(0);
  });

  it('cutoffs: inside the window both links lock; exactly at the cutoff they still work', async () => {
    const t = await shop('C', '09:00', '18:00');
    // now = 11:00 shop time; cutoff 1h. 11:30 is inside, 12:00 is exactly at it.
    const inside = await bookingWithToken(t, { start: at('11:30', '2026-12-01') });
    const c = await post('/public/cancel', { token: inside.token });
    expect([c.status, c.body.code]).toEqual([409, 'CANCEL_WINDOW_CLOSED']);
    const r = await post('/public/reschedule', { token: inside.token, startTime: at('15:00', '2026-12-01') });
    expect([r.status, r.body.code]).toEqual([409, 'RESCHEDULE_WINDOW_CLOSED']);
    const edge = await bookingWithToken(t, { start: at('12:00', '2026-12-01') });
    expect((await post('/public/reschedule', { token: edge.token, startTime: at('16:00', '2026-12-01') })).status).toBe(200);
    const started = await bookingWithToken(t, { start: at('10:30', '2026-12-01') });
    const s = await post('/public/cancel', { token: started.token });
    expect([s.status, s.body.code]).toEqual([409, 'BOOKING_IN_PAST']);
  });

  it('unknown and malformed tokens: 404 / 400, same answer on all three endpoints', async () => {
    for (const path of ['/public/cancel', '/public/booking', '/public/reschedule']) {
      const unknown = await post(path, { token: crypto.randomUUID(), startTime: at('12:00') });
      expect(unknown.status, path).toBe(404);
      for (const token of ['', 'abc', null, 123, { a: 1 }, [crypto.randomUUID()]]) {
        const res = await post(path, { token, startTime: at('12:00') });
        expect(res.status, `${path} ${JSON.stringify(token)}`).toBe(400);
      }
    }
  });

  it('7 parallel reschedules of one booking to 7 different times: one wins, one row holds time', async () => {
    const t = await shop();
    const { token } = await bookingWithToken(t);
    const rs = await Promise.all(
      ['09:00', '09:30', '10:30', '11:00', '11:30', '12:00', '12:30'].map((h) =>
        post('/public/reschedule', { token, startTime: at(h) }),
      ),
    );
    expect(rs.map((r) => r.status).sort()).toEqual([200, 409, 409, 409, 409, 409, 409]);
    expect(await holding(t.staff.id)).toHaveLength(1);
  });

  it('5 reschedules and 5 new bookings racing for one slot: exactly one gets it, no 5xx', async () => {
    const t = await shop();
    const tokens: string[] = [];
    for (const h of ['09:00', '09:30', '10:00', '10:30', '11:00'])
      tokens.push((await bookingWithToken(t, { start: at(h) })).token);
    const rs = await Promise.all([
      ...tokens.map((token) => post('/public/reschedule', { token, startTime: at('12:00') })),
      ...Array.from({ length: 5 }, () => book(t, { startTime: at('12:00') })),
    ]);
    const statuses = rs.map((r) => r.status);
    expect(statuses.filter((s) => s === 200 || s === 201)).toHaveLength(1);
    expect(statuses.filter((s) => s === 409)).toHaveLength(9);
    const rows = await holding(t.staff.id);
    expect(rows.filter((b) => b.startTime.getTime() === new Date(at('12:00')).getTime())).toHaveLength(1);
    // A winning reschedule moves one of the five; a winning new booking adds a sixth.
    expect(rows).toHaveLength(5 + statuses.filter((s) => s === 201).length);
  });

  it('a reschedule token from another shop does not free a slot on this shop\'s grid', async () => {
    const a = await shop('A');
    const b = await shop('B');
    await bookingWithToken(a, { start: at('10:00') });
    const other = await bookingWithToken(b, { start: at('10:00') });
    const res = await slots(a, `date=${DAY}&serviceId=${a.service.id}&staffId=${a.staff.id}&rescheduleToken=${other.token}`);
    expect(res.body.data.slots.find((s: { time: string }) => s.time === '10:00').available).toBe(false);
  });
});

describe('DST in Europe/Athens', () => {
  const far = async () => {
    const t = await shop('Dst', '01:00', '07:00');
    await prisma.shop.update({ where: { id: t.shop.id }, data: { maxAdvanceDays: 400 } });
    return t;
  };

  it('2027-03-28 (03:00 -> 04:00): no slot in the missing hour, bookings around it do not overlap', async () => {
    const t = await far();
    const s = await slots(t, `date=2027-03-28&serviceId=${t.service.id}&staffId=${t.staff.id}`);
    const times = s.body.data.slots.map((x: { time: string }) => x.time);
    expect(times).toContain('02:30');
    expect(times).not.toContain('03:00');
    expect(times).not.toContain('03:30');
    expect(times).toContain('04:00');
    // 02:30 EET = 00:30Z ends 01:00Z, which is 04:00 EEST: back-to-back, not overlapping.
    expect((await book(t, { startTime: '2027-03-28T00:30:00Z' })).status).toBe(201);
    expect((await book(t, { startTime: '2027-03-28T01:00:00Z' })).status).toBe(201);
    expect((await book(t, { startTime: '2027-03-28T04:00:00+03:00' })).status).toBe(409); // same instant
    // "03:30+02:00" names an instant that exists (04:30 EEST) and is on the grid.
    expect((await book(t, { startTime: '2027-03-28T03:30:00+02:00' })).status).toBe(201);
    expect(await holding(t.staff.id)).toHaveLength(3);
  });

  it('2027-10-31 (04:00 -> 03:00): the repeated hour is bookable once, on its first pass', async () => {
    const t = await far();
    expect((await book(t, { startTime: '2027-10-31T03:00:00+03:00' })).status).toBe(201); // 00:00Z, first 03:00
    const second = await book(t, { startTime: '2027-10-31T03:00:00+02:00' }); // 01:00Z, second 03:00
    expect(second.status).toBe(422);
    expect((await book(t, { startTime: '2027-10-31T03:30:00+03:00' })).status).toBe(201); // 00:30Z
    expect((await book(t, { startTime: '2027-10-31T04:00:00+02:00' })).status).toBe(201); // 02:00Z
    const rows = await holding(t.staff.id);
    for (let i = 1; i < rows.length; i++) expect(rows[i].startTime >= rows[i - 1].endTime).toBe(true);
  });

  it('a non-Athens offset naming the same instant is the same slot', async () => {
    const t = await shop();
    expect((await book(t, { startTime: '2026-12-08T03:00:00-05:00' })).status).toBe(201); // 10:00 Athens
    expect((await book(t, { startTime: at('10:00') })).status).toBe(409);
    expect((await book(t, { startTime: '2026-12-08T08:00:00.000Z' })).status).toBe(409);
  });
});
