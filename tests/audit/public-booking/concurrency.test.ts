// REQUIRED concurrency test: 10 parallel POST /public/:slug/book for the same
// staff member and slot. Expect exactly one 201 and nine 409, and exactly one
// slot-holding row in the database. Repeated ROUNDS times in one run.
import { at, book, holding, shop, tally } from './_helpers';

vi.mock('../../../api/src/services/email.service', async (orig) =>
  (await import('./_mockEmail')).stubEmail(orig),
);
vi.setConfig({ testTimeout: 60_000 });

const N = 10;
const ROUNDS = 5;

describe('concurrency: 10 parallel public bookings for one slot', () => {
  for (let round = 1; round <= ROUNDS; round++) {
    it(`round ${round}: exactly one 201 and nine 409`, async () => {
      const t = await shop('Race');
      const rs = await Promise.all(
        Array.from({ length: N }, () => book(t, { startTime: at('10:00') })),
      );
      const dist = tally(rs.map((r) => r.status));
      console.log(`CONCURRENCY round ${round}: ${JSON.stringify(dist)}`);
      const rows = await holding(t.staff.id);
      expect(dist, JSON.stringify(rs.map((r) => r.body))).toEqual({
        201: 1,
        409: N - 1,
      });
      expect(
        rs.filter((r) => r.status === 409).every((r) => r.body.code === 'SLOT_TAKEN'),
      ).toBe(true);
      expect(rows).toHaveLength(1);
    });
  }

  it('10 parallel bookings for 10 overlapping starts of a 60-min service: no two stored rows overlap', async () => {
    const t = await shop('Race', '09:00', '18:00');
    const { prisma } = await import('./_helpers');
    const long = await prisma.service.create({
      data: { shopId: t.shop.id, name: 'Long', duration: 60, price: 1000 },
    });
    await prisma.staffService.create({
      data: { userShopId: t.staff.id, serviceId: long.id },
    });
    const starts = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30'];
    const rs = await Promise.all(
      starts.map((h) => book(t, { serviceId: long.id, startTime: at(h) })),
    );
    const dist = tally(rs.map((r) => r.status));
    console.log(`CONCURRENCY overlapping starts: ${JSON.stringify(dist)}`);
    expect(Object.keys(dist).every((s) => s === '201' || s === '409')).toBe(true);
    const rows = await holding(t.staff.id);
    expect(rows).toHaveLength(dist[201]);
    for (let i = 1; i < rows.length; i++)
      expect(rows[i].startTime >= rows[i - 1].endTime).toBe(true);
  });
});
