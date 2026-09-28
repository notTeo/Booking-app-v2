import { describe, it, expect } from 'vitest';
import { prisma } from '../utils/prisma';
import { createTenant, createBookingRow } from './helpers';

// Regression: Prisma's pg adapter sends Dates as a *naive* string; Postgres
// then interprets it in the connection's session timezone. Unless the app
// pins its connections to UTC, a timestamptz column stores the WRONG instant
// (a Prisma-only round trip still looks fine, because reading undoes it).
// So these tests look at the stored instant from outside Prisma's Date
// mapping: epoch seconds and the UTC wall clock, computed by Postgres.
describe('timestamptz columns store exactly the instant that was written', () => {
  it('Booking.startTime / endTime', async () => {
    const t = await createTenant('Tz');
    const b = await createBookingRow(t, '2027-02-10T08:00:00.000Z'); // 30 min

    const [row] = await prisma.$queryRaw<
      { start_epoch: number; end_epoch: number }[]
    >`select extract(epoch from "startTime")::float8 as start_epoch,
             extract(epoch from "endTime")::float8 as end_epoch
      from "Booking" where id = ${b.id}`;

    expect(row.start_epoch).toBe(Date.parse('2027-02-10T08:00:00Z') / 1000);
    expect(row.end_epoch).toBe(Date.parse('2027-02-10T08:30:00Z') / 1000);
  });

  it('the session timezone of the app connection is UTC', async () => {
    const [row] = await prisma.$queryRaw<
      { tz: string }[]
    >`select current_setting('TimeZone') as tz`;
    expect(row.tz).toBe('UTC');
  });

  it('DB-side now() defaults agree with the JS clock instant', async () => {
    const before = Date.now();
    const t = await createTenant('Tz');
    const after = Date.now();
    const shop = await prisma.shop.findUniqueOrThrow({
      where: { id: t.shop.id },
    });
    // (test clock is frozen for Date only; DB now() is real time)
    expect(shop.createdAt.getTime()).toBeGreaterThan(before - 60_000);
    expect(shop.createdAt.getTime()).toBeLessThan(after + 60_000);
  });
});
