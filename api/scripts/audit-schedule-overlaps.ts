// Read-only: list ACTIVE working-hours schedules whose date ranges overlap for
// the same shop (and the same staff member / the shop-wide scope). The
// ShopWorkingSchedule_no_overlap migration fails while any exist, so run this
// where DATABASE_URL points at the target database BEFORE deploying it, e.g.
//   railway run npm run audit:schedule-overlaps
// Fix each pair by hand in the app (turn one off, or change its dates); this
// script never modifies data. Exit code 1 when overlaps exist.
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { prisma } from '../src/utils/prisma';

interface OverlapRow {
  slug: string;
  staffId: string | null;
  aId: string;
  aStart: Date;
  aEnd: Date | null;
  bId: string;
  bStart: Date;
  bEnd: Date | null;
}

const day = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : 'ongoing');

async function main() {
  // Same half-open [start, end) semantics as the application check and the
  // DB constraint; NULL end = unbounded. a.id < b.id lists each pair once.
  const rows = await prisma.$queryRaw<OverlapRow[]>`
    SELECT s."slug", a."staffId",
           a."id" AS "aId", a."startDate" AS "aStart", a."endDate" AS "aEnd",
           b."id" AS "bId", b."startDate" AS "bStart", b."endDate" AS "bEnd"
    FROM "ShopWorkingSchedule" a
    JOIN "ShopWorkingSchedule" b
      ON a."shopId" = b."shopId"
     AND COALESCE(a."staffId", '') = COALESCE(b."staffId", '')
     AND a."id" < b."id"
     AND tstzrange(a."startDate", a."endDate", '[)') && tstzrange(b."startDate", b."endDate", '[)')
    JOIN "Shop" s ON s."id" = a."shopId"
    WHERE a."isActive" AND b."isActive"
    ORDER BY s."slug", a."startDate"`;

  if (rows.length === 0) {
    console.log('No overlapping active schedules. Safe to apply the constraint.');
    return;
  }
  console.log(`${rows.length} overlapping pair(s) — fix these before deploying:\n`);
  for (const r of rows) {
    console.log(
      `${r.slug}${r.staffId ? ` (staff ${r.staffId})` : ' (shop-wide)'}: ` +
        `${day(r.aStart)} → ${day(r.aEnd)} [${r.aId}]  overlaps  ` +
        `${day(r.bStart)} → ${day(r.bEnd)} [${r.bId}]`,
    );
  }
  process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
