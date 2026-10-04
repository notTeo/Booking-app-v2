import { test, expect, type Page } from '@playwright/test';
import { E2E } from '../support/env';
import { waitForLanding } from '../support/auth';
import { query } from '../support/db';
import { addDays, athensDate } from '../support/dates';

/**
 * Dashboard overview: the shop overview summed across all of the owner's
 * shops, plus a "Your shops" section. The owner has the seeded Athens shop
 * (s1, first membership) and a New York shop (s2) added here.
 *
 * Bookings sit at mid-day UTC, which is the same calendar date in Athens and
 * New York, so period expectations don't depend on when the suite runs. The
 * one thing that does is each shop's own "today" (New York is behind Athens
 * for part of the day), so that count comes from an Intl oracle.
 */
const today = athensDate();
const nyToday = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date());

type Status = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELED' | 'NO_SHOW';
type Seed = { shop: 's1' | 's2'; offset: number; hour: number; status: Status };
const seeds: Seed[] = [
  { shop: 's1', offset: 0, hour: 10, status: 'CONFIRMED' },
  { shop: 's1', offset: 0, hour: 12, status: 'PENDING' },
  { shop: 's1', offset: 1, hour: 10, status: 'CONFIRMED' },
  { shop: 's1', offset: 3, hour: 10, status: 'PENDING' },
  { shop: 's2', offset: 0, hour: 11, status: 'COMPLETED' },
  { shop: 's2', offset: 0, hour: 13, status: 'PENDING' },
  { shop: 's2', offset: 0, hour: 15, status: 'CONFIRMED' },
  { shop: 's2', offset: 0, hour: 17, status: 'CANCELED' },
  { shop: 's2', offset: 2, hour: 11, status: 'CONFIRMED' },
  { shop: 's2', offset: 4, hour: 11, status: 'PENDING' },
  { shop: 's2', offset: 5, hour: 11, status: 'CONFIRMED' },
  { shop: 's2', offset: 400, hour: 11, status: 'CONFIRMED' },
];
const dated = seeds.map((b) => ({
  ...b,
  date: addDays(today, b.offset),
  at: Date.parse(`${addDays(today, b.offset)}T${String(b.hour).padStart(2, '0')}:00:00Z`),
}));

const SHOPS = {
  s1: { name: 'E2E Shop', zone: 'Europe/Athens', slug: 'e2e-shop' },
  s2: { name: 'Second Shop', zone: 'America/New_York', slug: 'second-shop' },
};

const mondayOf = (d: string) => {
  const [y, m, day] = d.split('-').map(Number);
  return addDays(d, -((new Date(Date.UTC(y, m - 1, day)).getUTCDay() + 6) % 7));
};
const weekFrom = mondayOf(today);
const weekTo = addDays(weekFrom, 6);
const inWeek = dated.filter((b) => b.date >= weekFrom && b.date <= weekTo);
const weekCount = (...statuses: Status[]) => inWeek.filter((b) => statuses.includes(b.status)).length;
const shopWeek = (shop: 's1' | 's2') => {
  const mine = inWeek.filter((b) => b.shop === shop);
  return {
    total: mine.filter((b) => b.status !== 'CANCELED').length,
    pending: mine.filter((b) => b.status === 'PENDING').length,
  };
};
const shopToday = (shop: 's1' | 's2') =>
  dated.filter(
    (b) => b.shop === shop && b.status !== 'CANCELED' && b.date === (shop === 's1' ? today : nyToday),
  ).length;

const whenLabel = (at: number, zone: string) => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: zone,
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(new Date(at))
      .map((p) => [p.type, p.value]),
  );
  return `${parts.weekday} ${parts.day} ${parts.month}, ${parts.hour}:${parts.minute}`;
};
const upcomingSeeds = () =>
  dated
    .filter((b) => b.at >= Date.now() && b.status !== 'CANCELED' && b.status !== 'NO_SHOW')
    .sort((a, b) => a.at - b.at)
    .slice(0, 5);

async function insertBooking(id: string, b: (typeof dated)[number]) {
  const staff = b.shop === 's1' ? 'us1' : 'us2';
  const service = b.shop === 's1' ? 'sv1' : 'sv2';
  const start = new Date(b.at).toISOString();
  await query(
    `insert into "Booking"(id,"shopId","customerId","serviceId","staffId","startTime","endTime",status,"cancelToken","updatedAt")
     values ($1,$2,$3,$4,$5,$6::timestamptz,$6::timestamptz + interval '30 minutes',$7::"BookingStatus",$1,now())`,
    [id, b.shop, `dash-cust-${b.shop}`, service, staff, start, b.status],
  );
}

test.beforeAll(async () => {
  await query('delete from "Booking"');
  await query(
    `insert into "Shop"(id,name,slug,timezone,"maxAdvanceDays","updatedAt")
     values ('s2',$1,$2,'America/New_York',730,now()) on conflict (id) do nothing`,
    [SHOPS.s2.name, SHOPS.s2.slug],
  );
  await query(
    `insert into "UserShop"(id,"userId","shopId",role,name,email,"createdAt")
     values ('us2','u1','s2','owner','E2E Owner','owner@e2e.test', now() + interval '1 minute') on conflict (id) do nothing`,
  );
  await query(
    `insert into "Service"(id,"shopId",name,duration,price,"updatedAt")
     values ('sv2','s2','Massage',30,1500,now()) on conflict (id) do nothing`,
  );
  for (const shop of ['s1', 's2']) {
    await query(
      `insert into "Customer"(id,"shopId",name,phone,"updatedAt")
       values ($1,$2,$3,$4,now()) on conflict (id) do nothing`,
      [`dash-cust-${shop}`, shop, `Customer ${shop}`, shop === 's1' ? '6900000011' : '6900000012'],
    );
  }
  for (const [i, b] of dated.entries()) await insertBooking(`dash-${i}`, b);
});

test.afterAll(async () => {
  await query('delete from "Booking"');
  await query(`delete from "Customer" where id like 'dash-cust-%'`);
  await query(`delete from "Shop" where id = 's2'`); // cascades its membership and service
  await query(`update "UserShop" set active = true where "userId" = 'u1'`);
});

async function login(page: Page) {
  await page.context().addCookies([{ name: 'lang', value: 'en', url: E2E.webUrl }]);
  await page.goto('/login');
  await page.locator('#email').fill(E2E.owner.email);
  await page.locator('#password').fill(E2E.owner.password);
  await page.locator('button[type=submit]').click();
  await waitForLanding(page);
  // The owner's landing depends on how many shops the test left active.
  await page.goto('/dashboard');
}

async function openDashboard(page: Page) {
  await login(page);
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/Good (morning|afternoon|evening), E2E/);
}

const tab = (page: Page, name: string) => page.getByRole('tab', { name, exact: true });
const stat = (page: Page, label: string) => page.locator('.stat', { hasText: label }).locator('.stat__value');
const shopCard = (page: Page, name: string) => page.locator('.shop-card', { hasText: name });

test('stat cards and the chart are summed across all shops', async ({ page }) => {
  await openDashboard(page);
  await expect(tab(page, 'Week')).toHaveAttribute('aria-selected', 'true');
  await expect(stat(page, 'Bookings')).toHaveText(String(weekCount('PENDING', 'CONFIRMED', 'COMPLETED', 'NO_SHOW')));
  await expect(stat(page, 'Pending')).toHaveText(String(weekCount('PENDING')));
  await expect(stat(page, 'Completed')).toHaveText(String(weekCount('COMPLETED')));
  await expect(stat(page, 'Canceled / no-show')).toHaveText(String(weekCount('CANCELED', 'NO_SHOW')));
  await expect(page.locator('.bar-chart__col')).toHaveCount(7);
  // Both shops' bookings today land on today's bar.
  const todayTotal = dated.filter((b) => b.date === today && b.status !== 'CANCELED').length;
  await expect(page.locator('.bar-chart__col--current')).toHaveAttribute(
    'aria-label',
    new RegExp(`: ${todayTotal} bookings$`),
  );

  await tab(page, '3 months').click();
  await expect(page.locator('.bar-chart__col').first()).toBeVisible();
  await tab(page, 'Week').click();
  await expect(stat(page, 'Bookings')).toHaveText(String(weekCount('PENDING', 'CONFIRMED', 'COMPLETED', 'NO_SHOW')));
});

test('upcoming bookings: next 5 across shops with a Shop column, no "view all" for two shops', async ({ page }) => {
  await openDashboard(page);
  const expected = upcomingSeeds();
  expect(expected.length).toBeGreaterThan(0);
  await expect(page.getByRole('heading', { name: 'Upcoming bookings' })).toBeVisible();
  await expect(page.locator('.data-table th', { hasText: 'Shop' })).toBeVisible();
  await expect(page.locator('.data-table td[data-label="Shop"]')).toHaveText(expected.map((b) => SHOPS[b.shop].name));
  // Each time is shown in its own shop's timezone.
  await expect(page.locator('.data-table td[data-label="When"]')).toHaveText(
    expected.map((b) => whenLabel(b.at, SHOPS[b.shop].zone)),
  );
  await expect(page.getByRole('link', { name: 'View all' })).toHaveCount(0);
});

test('"Your shops": a card per shop, sorted by bookings, with pending and today', async ({ page }) => {
  await openDashboard(page);
  const cards = page.locator('.shop-card');
  await expect(cards).toHaveCount(2);
  // Most bookings this week first, ties by name (which one that is depends on the weekday).
  const order = (['s1', 's2'] as const)
    .slice()
    .sort((x, y) => shopWeek(y).total - shopWeek(x).total || SHOPS[x].name.localeCompare(SHOPS[y].name));
  await expect(cards.nth(0)).toContainText(SHOPS[order[0]].name);
  await expect(cards.nth(1)).toContainText(SHOPS[order[1]].name);

  for (const id of ['s1', 's2'] as const) {
    const card = shopCard(page, SHOPS[id].name);
    await expect(card.locator('.shop-card__metric').nth(0).locator('.shop-card__value')).toHaveText(String(shopWeek(id).total));
    await expect(card.locator('.shop-card__metric').nth(1).locator('.shop-card__value')).toHaveText(String(shopToday(id)));
    await expect(card.locator('.badge--warning')).toHaveText(`${shopWeek(id).pending} pending`);
  }

  await shopCard(page, SHOPS.s1.name).click();
  await expect(page).toHaveURL(new RegExp(`/shops/${SHOPS.s1.slug}$`));
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/Good (morning|afternoon|evening), E2E/);
});

test('a shop with nothing pending shows no warning badge', async ({ page }) => {
  await query(`update "Booking" set status = 'CONFIRMED' where "shopId" = 's1' and status = 'PENDING'`);
  try {
    await openDashboard(page);
    const card = shopCard(page, SHOPS.s1.name);
    await expect(card.locator('.badge--warning')).toHaveCount(0);
    await expect(card).toContainText('None pending');
  } finally {
    await query(`update "Booking" set status = 'PENDING' where id in ('dash-1','dash-3')`);
  }
});

test('one shop: same page, one card, and a "View all" link', async ({ page }) => {
  await query(`update "UserShop" set active = false where id = 'us2'`);
  try {
    await openDashboard(page);
    await expect(page.locator('.shop-card')).toHaveCount(1);
    await expect(page.locator('.shop-card')).toContainText(SHOPS.s1.name);
    await expect(page.getByRole('link', { name: 'View all' })).toHaveAttribute('href', `/shops/${SHOPS.s1.slug}/bookings`);
    // Totals now only count that shop.
    const mine = inWeek.filter((b) => b.shop === 's1');
    await expect(stat(page, 'Bookings')).toHaveText(String(mine.filter((b) => b.status !== 'CANCELED').length));
  } finally {
    await query(`update "UserShop" set active = true where id = 'us2'`);
  }
});

test('no shops: an empty state with "Create your first shop"', async ({ page }) => {
  await query(`update "UserShop" set active = false where "userId" = 'u1'`);
  try {
    await login(page);
    await expect(page.getByRole('heading', { name: "You don't have any shops yet" })).toBeVisible();
    await page.getByRole('link', { name: 'Create your first shop' }).click();
    await expect(page).toHaveURL(/\/shops\/new$/);
  } finally {
    await query(`update "UserShop" set active = true where "userId" = 'u1'`);
  }
});

test('the API failing shows an alert with a working retry', async ({ page }) => {
  let fail = true;
  await page.route('**/api/shops/overview*', (route) =>
    fail ? route.fulfill({ status: 500, json: { status: 'error', message: 'boom' } }) : route.continue(),
  );
  await login(page);
  await expect(page.getByText("We couldn't load your overview")).toBeVisible();
  fail = false;
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.locator('.shop-card')).toHaveCount(2);
});

test('no horizontal scroll at 360px, and the shop shows in the phone row card', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await openDashboard(page);
  for (const range of ['Week', 'Month', '3 months']) {
    await tab(page, range).click();
    await expect(page.locator('.shop-card')).toHaveCount(2);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, `${range}: horizontal overflow`).toBeLessThanOrEqual(0);
  }
  await expect(page.locator('.data-table td[data-label="Shop"]').first()).toBeVisible();
});
