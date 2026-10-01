import { test, expect, type Page } from '@playwright/test';
import { E2E } from '../support/env';
import { query } from '../support/db';
import { addDays, athensDate } from '../support/dates';

/**
 * Shop overview: the Week / Month / 3 months switch drives the stat cards, the
 * bar chart and the recent bookings. Bookings are seeded relative to the Athens
 * "today" so the expectations hold on any day the suite runs.
 *
 *   today     CONFIRMED + PENDING
 *   today-2   COMPLETED
 *   today-3   CANCELED
 *   today-20  NO_SHOW + CONFIRMED          (month and 3 months only)
 *   today-60  CONFIRMED                    (3 months only)
 */
const today = athensDate();
const seed = [
  { id: 'ov-1', date: today, time: '12:00', status: 'CONFIRMED' },
  { id: 'ov-2', date: today, time: '13:00', status: 'PENDING' },
  { id: 'ov-3', date: addDays(today, -2), time: '12:00', status: 'COMPLETED' },
  { id: 'ov-4', date: addDays(today, -3), time: '12:00', status: 'CANCELED' },
  { id: 'ov-5', date: addDays(today, -20), time: '12:00', status: 'NO_SHOW' },
  { id: 'ov-6', date: addDays(today, -20), time: '13:00', status: 'CONFIRMED' },
  { id: 'ov-7', date: addDays(today, -60), time: '12:00', status: 'CONFIRMED' },
];

test.beforeAll(async () => {
  await query('delete from "Booking"');
  await query(
    `insert into "Customer"(id,"shopId",name,phone,"updatedAt")
     values ('ov-cust','s1','Overview Customer','6900000001',now()) on conflict (id) do nothing`,
  );
  for (const b of seed) {
    // 12:00Z / 13:00Z are mid-afternoon in Athens, so the local date matches `date`.
    const start = `${b.date}T${b.time}:00Z`;
    await query(
      `insert into "Booking"(id,"shopId","customerId","serviceId","staffId","startTime","endTime",status,"cancelToken","updatedAt")
       values ($1,'s1','ov-cust','sv1','us1',$2::timestamptz,$2::timestamptz + interval '30 minutes',$3::"BookingStatus",$1,now())`,
      [b.id, start, b.status],
    );
  }
});

test.afterAll(async () => {
  await query('delete from "Booking"');
});

async function openOverview(page: Page) {
  await page.context().addCookies([{ name: 'lang', value: 'en', url: E2E.webUrl }]);
  await page.goto('/login');
  await page.locator('#email').fill(E2E.owner.email);
  await page.locator('#password').fill(E2E.owner.password);
  await page.locator('button[type=submit]').click();
  await page.waitForURL('**/dashboard');
  await page.goto(`/shops/${E2E.shop.slug}`);
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/Good (morning|afternoon|evening), E2E/);
}

const stat = (page: Page, label: string) =>
  page.locator('.stat', { hasText: label }).locator('.stat__value');
const bars = (page: Page) => page.locator('.bar-chart__col');
const recentRows = (page: Page) => page.locator('.data-table tbody tr');

test('switching the range updates cards, chart and recent bookings', async ({ page }) => {
  await openOverview(page);

  // Week is the default.
  await expect(page.getByRole('tab', { name: 'Week', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(bars(page)).toHaveCount(7);
  await expect(stat(page, 'Bookings')).toHaveText('3');
  await expect(stat(page, 'Pending')).toHaveText('1');
  await expect(stat(page, 'Completed')).toHaveText('1');
  await expect(stat(page, 'Canceled / no-show')).toHaveText('1');
  // The current day is highlighted and carries its count in its accessible name.
  const current = page.locator('.bar-chart__col--current');
  await expect(current).toHaveCount(1);
  await expect(current).toHaveAttribute('aria-label', /: 2 bookings$/);
  await expect(recentRows(page)).toHaveCount(4);
  await expect(page.getByRole('link', { name: 'View all' })).toHaveAttribute('href', `/shops/${E2E.shop.slug}/bookings`);

  // Month: 30 daily bars, the no-show and the older confirmed booking join in.
  await page.getByRole('tab', { name: 'Month', exact: true }).click();
  await expect(bars(page)).toHaveCount(30);
  await expect(stat(page, 'Bookings')).toHaveText('5');
  await expect(stat(page, 'Canceled / no-show')).toHaveText('2');
  await expect(recentRows(page)).toHaveCount(5); // limit 5 of 6

  // 3 months: 13 weekly bars.
  await page.getByRole('tab', { name: '3 months', exact: true }).click();
  await expect(bars(page)).toHaveCount(13);
  await expect(stat(page, 'Bookings')).toHaveText('6');

  // Back to Week.
  await page.getByRole('tab', { name: 'Week', exact: true }).click();
  await expect(bars(page)).toHaveCount(7);
  await expect(stat(page, 'Bookings')).toHaveText('3');
});

test('the status breakdown legend states every status with count and percent', async ({ page }) => {
  await openOverview(page);
  const legend = page.getByRole('list', { name: 'Bookings by status' });
  await expect(legend.getByRole('listitem')).toHaveCount(5);
  await expect(legend.getByRole('listitem').filter({ hasText: 'Confirmed' })).toContainText('1');
  await expect(legend.getByRole('listitem').filter({ hasText: 'Pending' })).toContainText('25%');
});

test('bars are keyboard-focusable and reveal their count; a table backs the chart', async ({ page }) => {
  await openOverview(page);
  const last = bars(page).last();
  await last.focus();
  await expect(last.locator('.bar-chart__value')).toHaveCSS('opacity', '1');
  await expect(page.locator('.visually-hidden table tbody tr')).toHaveCount(7);
});

test('the tabs follow the arrow keys', async ({ page }) => {
  await openOverview(page);
  await page.getByRole('tab', { name: 'Week', exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Month', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(bars(page)).toHaveCount(30);
});

test('no horizontal scroll at 360px in any range', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await openOverview(page);
  for (const name of ['Week', 'Month', '3 months']) {
    await page.getByRole('tab', { name, exact: true }).click();
    await expect(page.locator('.bar-chart')).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, `${name}: horizontal overflow`).toBeLessThanOrEqual(0);
  }
});

test('with no bookings in the period, the empty state offers the booking link', async ({ page }) => {
  await query('delete from "Booking"');
  try {
    await openOverview(page);
    await expect(stat(page, 'Bookings')).toHaveText('0');
    await expect(page.getByText('No bookings in this period')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Copy booking link' })).toBeVisible();
    await expect(bars(page)).toHaveCount(0);
  } finally {
    // restore for any test after this one in the file
  }
});
