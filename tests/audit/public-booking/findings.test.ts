// One failing test (or more) per finding. Each asserts the CORRECT behaviour,
// so it fails today. See FINDINGS.md.
import {
  at,
  DAY,
  addMember,
  book,
  bookingWithToken,
  getApi,
  holding,
  prisma,
  shop,
  slots,
  tally,
} from './_helpers';
import { sendBookingConfirmationEmail } from '../../../api/src/services/email.service';

vi.mock('../../../api/src/services/email.service', async (orig) =>
  (await import('./_mockEmail')).stubEmail(orig),
);
vi.setConfig({ testTimeout: 60_000 });

const reschedule = async (body: object) =>
  (await getApi()).post('/public/reschedule').send(body);
const cancel = async (token: string) =>
  (await getApi()).post('/public/cancel').send({ token });

// ── PB-01 ────────────────────────────────────────────────────────────────────
describe('PB-01: an explicitly chosen staff member need not perform the service', () => {
  // Owner does "Cut" only; Colorist does "Color" only.
  async function twoSpecialists() {
    const t = await shop();
    const color = await prisma.service.create({
      data: { shopId: t.shop.id, name: 'Color', duration: 30, price: 5000 },
    });
    const colorist = await addMember(t, 'Colorist', [color.id]);
    return { t, color, colorist };
  }

  it('PB-01a: POST /public/:slug/book refuses a staff member who does not do the (single) service', async () => {
    const { t, color } = await twoSpecialists();
    const res = await book(t, { serviceId: color.id, staffId: t.staff.id });
    expect(res.status, JSON.stringify(res.body)).toBe(400);
    expect(await holding(t.staff.id)).toHaveLength(0);
  });

  it('PB-01b: GET /public/:slug/slots offers no times for a staff member who does not do the service', async () => {
    const { t, color } = await twoSpecialists();
    const res = await slots(
      t,
      `date=${DAY}&serviceId=${color.id}&staffId=${t.staff.id}`,
    );
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('closed');
  });

  it('PB-01c: POST /public/reschedule refuses a move to a staff member who does not do the service', async () => {
    const { t, colorist } = await twoSpecialists();
    const { token } = await bookingWithToken(t, { start: at('11:00') }); // a Cut with the owner
    const res = await reschedule({
      token,
      startTime: at('12:00'),
      staffId: colorist.id,
    });
    expect(res.status, JSON.stringify(res.body)).toBe(400);
    expect(await holding(colorist.id)).toHaveLength(0);
  });

  it('PB-01d: POST /public/reschedule refuses a multi-service move to a member who does not do all of them', async () => {
    const t = await shop();
    const beard = await prisma.service.create({
      data: { shopId: t.shop.id, name: 'Beard', duration: 30, price: 1000 },
    });
    await prisma.staffService.create({
      data: { userShopId: t.staff.id, serviceId: beard.id },
    });
    const onlyCut = await addMember(t, 'OnlyCut', [t.service.id]);
    const made = await book(t, {
      serviceId: undefined,
      serviceIds: [t.service.id, beard.id],
      startTime: at('09:00'),
    });
    expect(made.status).toBe(201);
    const row = await prisma.booking.findUniqueOrThrow({
      where: { id: made.body.data.id },
    });
    const res = await reschedule({
      token: row.cancelToken,
      startTime: at('11:00'),
      staffId: onlyCut.id,
    });
    expect(res.status, JSON.stringify(res.body)).toBe(400);
  });
});

// ── PB-02 ────────────────────────────────────────────────────────────────────
describe('PB-02: nothing caps how many slots one anonymous customer can hold', () => {
  it('PB-02: one phone number cannot take 20 confirmed slots on a single day', async () => {
    const t = await shop('Fill', '09:00', '19:00');
    const phone = '+306941234567';
    const statuses: number[] = [];
    for (let i = 0; i < 20; i++) {
      const hh = String(9 + Math.floor(i / 2)).padStart(2, '0');
      const res = await book(t, { phone, startTime: at(`${hh}:${i % 2 ? '30' : '00'}`) });
      statuses.push(res.status);
    }
    // The whole 09:00-19:00 day of the only provider is now held, auto-CONFIRMED.
    expect(tally(statuses)[201] ?? 0, JSON.stringify(tally(statuses))).toBeLessThan(20);
  });
});

// ── PB-03 ────────────────────────────────────────────────────────────────────
describe('PB-03: "any staff" picks the provider before taking the provider lock', () => {
  it('PB-03: 5 parallel no-preference bookings for one time, 5 free providers -> all five succeed', async () => {
    for (let round = 1; round <= 3; round++) {
      const t = await shop('Any');
      for (let i = 0; i < 4; i++) await addMember(t, `M${i}`, [t.service.id]);
      const rs = await Promise.all(
        Array.from({ length: 5 }, () => book(t, { staffId: undefined })),
      );
      const dist = tally(rs.map((r) => r.status));
      console.log(`PB-03 round ${round}: ${JSON.stringify(dist)}`);
      expect(dist, `round ${round}`).toEqual({ 201: 5 });
      await prisma.shop.delete({ where: { id: t.shop.id } });
    }
  });
});

// ── PB-04 ────────────────────────────────────────────────────────────────────
describe('PB-04: the cancel link is a non-atomic check-then-write', () => {
  it('PB-04a: 5 parallel cancels of one booking -> exactly one 200', async () => {
    const t = await shop();
    const { token } = await bookingWithToken(t);
    const rs = await Promise.all(Array.from({ length: 5 }, () => cancel(token)));
    const dist = tally(rs.map((r) => r.status));
    console.log(`PB-04a: ${JSON.stringify(dist)}`);
    expect(dist).toEqual({ 200: 1, 409: 4 });
  });

  it('PB-04b: cancel racing reschedule never answers "cancelled" while the moved booking stays active (60 staggered attempts)', async () => {
    const lied: string[] = [];
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    for (let i = 0; i < 60; i++) {
      const t = await shop();
      const { token } = await bookingWithToken(t);
      const delay = i % 6; // ms the cancel is sent after the reschedule
      const [re, ca] = await Promise.all([
        reschedule({ token, startTime: at('12:00') }),
        sleep(delay).then(() => cancel(token)),
      ]);
      const active = await holding(t.staff.id);
      if (ca.status === 200 && active.length > 0)
        lied.push(
          `attempt ${i} (+${delay}ms): reschedule ${re.status}, cancel ${ca.status}, active bookings ${active.length}`,
        );
      await prisma.shop.delete({ where: { id: t.shop.id } });
    }
    console.log(`PB-04b: ${lied.length}/60 attempts`);
    expect(lied).toEqual([]);
  });
});

// ── PB-05 ────────────────────────────────────────────────────────────────────
describe('PB-05: a startTime without a UTC offset is read in the server process timezone', () => {
  const realTz = process.env.TZ;
  afterEach(() => {
    if (realTz === undefined) delete process.env.TZ;
    else process.env.TZ = realTz;
  });

  it('PB-05a: POST /public/:slug/book rejects "2026-12-08T10:00:00" (no offset)', async () => {
    process.env.TZ = 'UTC'; // what a typical production host runs in
    const t = await shop(); // Europe/Athens, open 09:00-13:00
    const res = await book(t, { startTime: '2026-12-08T10:00:00' });
    const stored = (await holding(t.staff.id)).map((b) => b.startTime.toISOString());
    // Today: 201, stored as 10:00Z = 12:00 shop time (and 08:00Z on a host in Athens time).
    expect(res.status, `stored ${JSON.stringify(stored)}`).toBe(400);
  });

  it('PB-05b: POST /public/reschedule rejects a startTime without an offset', async () => {
    process.env.TZ = 'UTC';
    const t = await shop();
    const { token } = await bookingWithToken(t, { start: at('09:00') });
    const res = await reschedule({ token, startTime: '2026-12-08T10:00:00' });
    expect(res.status, JSON.stringify(res.body)).toBe(400);
  });
});

// ── PB-06 ────────────────────────────────────────────────────────────────────
describe('PB-06: date strings the validator accepts but the code cannot parse -> 500', () => {
  for (const startTime of ['2026-W50', '20261208T080000Z', '2026-342']) {
    it(`PB-06a: POST /public/:slug/book with startTime "${startTime}" is a 4xx, not a 500`, async () => {
      const t = await shop();
      const res = await book(t, { startTime });
      expect(res.status, JSON.stringify(res.body)).toBeLessThan(500);
    });
  }

  it('PB-06b: POST /public/reschedule with startTime "2026-W50" is a 4xx, not a 500', async () => {
    const t = await shop();
    const { token } = await bookingWithToken(t);
    const res = await reschedule({ token, startTime: '2026-W50' });
    expect(res.status, JSON.stringify(res.body)).toBeLessThan(500);
  });

  it('PB-06c: GET /public/:slug/slots?date=2026-02-30 is a 400, not a 500', async () => {
    const t = await shop();
    const res = await slots(
      t,
      `date=2026-02-30&serviceId=${t.service.id}&staffId=${t.staff.id}`,
    );
    expect(res.status, JSON.stringify(res.body)).toBe(400);
  });
});

// ── PB-07 ────────────────────────────────────────────────────────────────────
describe('PB-07: public slots are offered for times the booking endpoint always refuses', () => {
  const available = (res: { body: { data: { status: string; slots?: { time: string; available: boolean }[] } } }) =>
    (res.body.data.slots ?? []).filter((s) => s.available).map((s) => s.time);

  it('PB-07a: today, times already past are not available (now = 11:00 shop time)', async () => {
    const t = await shop();
    const res = await slots(t, `date=2026-12-01&serviceId=${t.service.id}&staffId=${t.staff.id}`);
    expect(available(res)).not.toContain('09:00');
    expect(available(res)).not.toContain('10:30');
  });

  it('PB-07b: a date in the past has no available times', async () => {
    const t = await shop();
    const res = await slots(t, `date=2026-11-20&serviceId=${t.service.id}&staffId=${t.staff.id}`);
    expect(available(res)).toEqual([]);
  });

  it('PB-07c: a date beyond maxAdvanceDays (60) has no available times', async () => {
    const t = await shop();
    const res = await slots(t, `date=2027-06-01&serviceId=${t.service.id}&staffId=${t.staff.id}`);
    expect(available(res)).toEqual([]);
  });
});

// ── PB-08 ────────────────────────────────────────────────────────────────────
describe('PB-08: a locked shop refuses new public bookings but still takes token reschedules', () => {
  it('PB-08: POST /public/reschedule on a locked shop is refused like POST /public/:slug/book', async () => {
    const t = await shop();
    const { token } = await bookingWithToken(t);
    await prisma.shop.update({
      where: { id: t.shop.id },
      data: { subscriptionStatus: 'INACTIVE' },
    });
    const fresh = await book(t, { startTime: at('11:00') });
    expect(fresh.status).toBe(403); // SHOP_LOCKED, as designed
    const res = await reschedule({ token, startTime: at('12:00') });
    expect(res.status, JSON.stringify(res.body)).toBe(403);
  });
});

// ── PB-09 ────────────────────────────────────────────────────────────────────
describe('PB-09: the customer key (shopId, phone) is the raw string as typed', () => {
  it('PB-09: the same number typed with spaces maps to the same customer', async () => {
    const t = await shop();
    await prisma.customer.create({
      data: { shopId: t.shop.id, name: 'Maria', phone: '+306941234567', email: 'maria@example.com' },
    });
    const res = await book(t, { name: 'Maria', phone: '+30 694 123 4567' });
    expect(res.status).toBe(201);
    const customers = await prisma.customer.findMany({ where: { shopId: t.shop.id } });
    expect(customers.map((c) => c.phone)).toEqual(['+306941234567']);
  });
});

// ── PB-10 ────────────────────────────────────────────────────────────────────
describe('PB-10: X-Customer-Phone on public slots reveals a known customer', () => {
  it('PB-10: the slot list is the same for a known and an unknown phone number', async () => {
    const t = await shop();
    const vip = await prisma.customer.create({
      data: { shopId: t.shop.id, name: 'VIP', phone: '+306940000001' },
    });
    await prisma.customerServiceDuration.create({
      data: { customerId: vip.id, serviceId: t.service.id, duration: 120 },
    });
    const q = `date=${DAY}&serviceId=${t.service.id}&staffId=${t.staff.id}`;
    const known = await slots(t, q, { 'x-customer-phone': '+306940000001' });
    const unknown = await slots(t, q, { 'x-customer-phone': '+306940000002' });
    expect(known.body.data.slots).toEqual(unknown.body.data.slots);
  });
});

// ── PB-11 ────────────────────────────────────────────────────────────────────
describe('PB-11: a returning customer with no email on file never gets a confirmation', () => {
  it('PB-11: the confirmation (with the cancel link) goes to the email typed for this booking', async () => {
    const t = await shop();
    await prisma.customer.create({
      data: { shopId: t.shop.id, name: 'Walk-in', phone: '+306940000003' }, // added by the shop, no email
    });
    // Control: the stub is the one the controller calls.
    const control = await book(t, { email: 'new@example.com', startTime: at('09:00') });
    expect(control.status).toBe(201);
    await vi.waitFor(() =>
      expect(sendBookingConfirmationEmail).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'new@example.com' }),
      ),
    );

    const res = await book(t, { phone: '+306940000003', email: 'me@example.com' });
    expect(res.status).toBe(201);
    await new Promise((r) => setTimeout(r, 300));
    expect(sendBookingConfirmationEmail).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'me@example.com' }),
    );
  });
});

// ── PB-12 ────────────────────────────────────────────────────────────────────
describe('PB-12: "any staff" on a taken slot reports the wrong reason', () => {
  it('PB-12: a taken slot is 409 SLOT_TAKEN even when a teammate who is not working that day exists', async () => {
    const t = await shop();
    await addMember(t, 'DayOff', [t.service.id], { schedule: false });
    expect((await book(t, { staffId: undefined })).status).toBe(201); // the owner, the only one working
    const res = await book(t, { staffId: undefined });
    expect([res.status, res.body.code], JSON.stringify(res.body)).toEqual([409, 'SLOT_TAKEN']);
  });
});
