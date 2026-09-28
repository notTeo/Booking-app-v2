import pg from 'pg';
import { E2E } from './env';

export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  const client = new pg.Client({ connectionString: E2E.dbUrl });
  await client.connect();
  try {
    return (await client.query<T>(sql, params)).rows;
  } finally {
    await client.end();
  }
}

/** startTime of the most recently created booking, as an exact UTC instant. */
export async function latestBookingStart(): Promise<string> {
  const rows = await query<{ startTime: Date }>(
    'select "startTime" from "Booking" order by "createdAt" desc limit 1',
  );
  return rows[0].startTime.toISOString();
}

export async function bookingCount(): Promise<number> {
  return Number((await query('select count(*)::int as n from "Booking"'))[0].n);
}
