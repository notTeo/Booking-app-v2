// Drops + recreates the e2e database, applies the real migrations, and seeds
// one shop ("e2e-shop", Europe/Athens) with one owner/staff member, one
// 30-minute service and a schedule open 00:00–23:30 every day (so every date
// has slots, and "earlier today" slots exist to trigger the past-time rule).
import pg from 'pg';
import bcrypt from 'bcryptjs';
import { execSync } from 'node:child_process';
import { userInfo } from 'node:os';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const dbUser = process.env.PGUSER ?? userInfo().username;
const adminUrl = process.env.E2E_DB_ADMIN_URL ?? `postgresql://${dbUser}@localhost:5432/postgres`;
const dbUrl = process.env.E2E_DATABASE_URL ?? `postgresql://${dbUser}@localhost:5432/booking_e2e`;
const dbName = new URL(dbUrl).pathname.slice(1);
if (!/e2e/i.test(dbName)) throw new Error(`Refusing to reset a database not named *e2e* (got "${dbName}")`);

const admin = new pg.Client({ connectionString: adminUrl });
await admin.connect();
await admin.query(`DROP DATABASE IF EXISTS "${dbName}" WITH (FORCE)`);
await admin.query(`CREATE DATABASE "${dbName}"`);
await admin.end();

const apiDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../api');
execSync('npx prisma migrate deploy', { cwd: apiDir, stdio: 'inherit', env: { ...process.env, DATABASE_URL: dbUrl } });

const db = new pg.Client({ connectionString: dbUrl });
await db.connect();
const hash = await bcrypt.hash('E2e-Password1!', 10);
const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
await db.query(`INSERT INTO "User"(id,name,email,"passwordHash","isVerified","trialUsedAt","updatedAt") VALUES ('u1','E2E Owner','owner@e2e.test',$1,true,now(),now())`, [hash]);
await db.query(`INSERT INTO "Shop"(id,name,slug,timezone,"maxAdvanceDays","updatedAt") VALUES ('s1','E2E Shop','e2e-shop','Europe/Athens',730,now())`);
await db.query(`INSERT INTO "UserShop"(id,"userId","shopId",role,name,email) VALUES ('us1','u1','s1','owner','E2E Owner','owner@e2e.test')`);
await db.query(`INSERT INTO "Service"(id,"shopId",name,duration,price,"updatedAt") VALUES ('sv1','s1','Haircut',30,1500,now())`);
await db.query(`INSERT INTO "StaffService"(id,"userShopId","serviceId") VALUES ('ss1','us1','sv1')`);
await db.query(`INSERT INTO "ShopWorkingSchedule"(id,"shopId","staffId","startDate","updatedAt") VALUES ('sch1','s1','us1','2026-01-01',now())`);
for (const d of days) {
  await db.query(`INSERT INTO "ShopWorkingDay"(id,"scheduleId",day) VALUES ($1,'sch1',$2::"DayOfWeek")`, [`d-${d}`, d]);
  await db.query(`INSERT INTO "ShopWorkingHourRange"(id,"dayId","startTime","endTime") VALUES ($1,$2,'00:00','23:30')`, [`h-${d}`, `d-${d}`]);
}
await db.end();
console.log(`[e2e] database ${dbName} ready`);
