import { test, expect, type Page } from '@playwright/test';
import { E2E } from '../support/env';
import { query } from '../support/db';
import { addDays, athensDate } from '../support/dates';

/**
 * Shop overview: Week (this Mon-Sun), Month (this calendar month) and 3 months
 * (this month plus the previous two, in Monday-start weeks) drive the stat
 * cards, the bar chart and the donut. Future days are included and drawn as
 * "scheduled". "Upcoming bookings" (the next 5 from now) ignores the switch.
 *
 * Bookings are seeded relative to the Athens "today". Which of them fall in
 * which period depends on the day the suite runs, so the expectations come
 * from a small calendar oracle below (plain Date maths, not the app's code).
 */
const today = athensDate();

type Status = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELED' | 'NO_SHOW';
const seedOffsets: { offset: number; hour: number; status: Status }[] = [
  { offset: 0, hour: 10, status: 'CONFIRMED' },
  { offset: 0, hour: 12, status: 'PENDING' },
  { offset: 1, hour: 10, status: 'COMPLETED' },
  { offset: 2, hour: 10, status: 'CANCELED' }, // a future canceled booking must not be "upcoming"
  { offset: 3, hour: 10, status: 'PENDING' },
  { offset: 9, hour: 10, status: 'CONFIRMED' },
  { offset: 45, hour: 10, status: 'CONFIRMED' },
  { offset: -2, hour: 10, status: 'COMPLETED' },
  { offset: -3, hour: 10, status: 'CANCELED' },
  { offset: -20, hour: 10, status: 'NO_SHOW' },
  { offset: -20, hour: 12, status: 'CONFIRMED' },
  { offset: -40, hour: 10, status: 'CONFIRMED' },
  { offset: -70, hour: 10, status: 'COMPLETED' },
  { offset: 400, hour: 10, status: 'CONFIRMED' },
];
const dated = seedOffsets.map((b) => ({ ...b, date: addDays(today, b.offset) }));

// ── calendar oracle ─────────────────────────────────────────────────────────
const utc = (d: string) => {
  const [y, m, day] = d.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, day));
};
const iso = (d: Date) => d.toISOString().slice(0, 10);
const mondayOf = (d: string) => addDays(d, -((utc(d).getUTCDay() + 6) % 7));
const firstOfMonth = (d: string, monthsBack = 0) => {
  const x = utc(d);
  return iso(new Date(Date.UTC(x.getUTCFullYear(), x.getUTCMonth() - monthsBack, 1)));
};
const lastOfMonth = (d: string) => {
  const x = utc(d);
  return iso(new Date(Date.UTC(x.getUTCFullYear(), x.getUTCMonth() + 1, 0)));
};

type Range = 'week' | 'month' | 'quarter';
const TABS: Record<Range, string> = { week: 'Week', month: 'Month', quarter: '3 months' };

const period = (range: Range) =>
  range === 'week'
    ? { from: mondayOf(today), to: addDays(mondayOf(today), 6) }
    : range === 'month'
      ? { from: firstOfMonth(today), to: lastOfMonth(today) }
      : { from: firstOfMonth(today, 2), to: lastOfMonth(today) };

/** Start dates of the bars the chart should draw. */
const bucketStarts = (range: Range) => {
  const { from, to } = period(range);
  const starts: string[] = [];
  if (range === 'quarter') {
    for (let m = mondayOf(from); m <= to; m = addDays(m, 7)) starts.push(m < from ? from : m);
  } else {
    for (let d = from; d <= to; d = addDays(d, 1)) starts.push(d);
  }
  return starts;
};

/** The next 5 bookings from now, canceled excluded, soonest first. */
const upcomingSeeds = () => {
  const now = Date.now();
  return dated
    .map((b) => ({ ...b, at: Date.parse(`${b.date}T${String(b.hour).padStart(2, '0')}:00:00Z`) }))
    .filter((b) => b.at >= now && b.status !== 'CANCELED' && b.status !== 'NO_SHOW')
    .sort((a, b) => a.at - b.at)
    .slice(0, 5);
};

/** "Thu 1 Oct, 13:00" in Athens, built from Intl parts rather than the app's formatter. */
const whenLabel = (at: number) => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'Europe/Athens',
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

const inPeriod = (range: Range) => {
  const { from, to } = period(range);
  return dated.filter((b) => b.date >= from && b.date <= to);
};
const count = (range: Range, ...statuses: Status[]) =>
  inPeriod(range).filter((b) => statuses.includes(b.status)).length;

// ── data ────────────────────────────────────────────────────────────────────
async function insertBooking(id: string, date: string, hour: number, status: Status) {
  // Mid-day UTC is mid-day in Athens too, so the local date matches `date`.
  const start = `${date}T${String(hour).padStart(2, '0')}:00:00Z`;
  await query(
    `insert into "Booking"(id,"shopId","customerId","serviceId","staffId","startTime","endTime",status,"cancelToken","updatedAt")
     values ($1,'s1','ov-cust','sv1','us1',$2::timestamptz,$2::timestamptz + interval '30 minutes',$3::"BookingStatus",$1,now())`,
    [id, start, status],
  );
}

test.beforeAll(async () => {
  await query('delete from "Booking"');
  await query(
    `insert into "Customer"(id,"shopId",name,phone,"updatedAt")
     values ('ov-cust','s1','Overview Customer','6900000001',now()) on conflict (id) do nothing`,
  );
  for (const [i, b] of dated.entries()) await insertBooking(`ov-${i}`, b.date, b.hour, b.status);
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

const tab = (page: Page, range: Range) => page.getByRole('tab', { name: TABS[range], exact: true });
const stat = (page: Page, label: string) => page.locator('.stat', { hasText: label }).locator('.stat__value');
const bars = (page: Page) => page.locator('.bar-chart__col');
const upcomingRows = (page: Page) => page.locator('.data-table tbody tr');
const upcomingWhen = (page: Page) => page.locator('.data-table td[data-label="When"]');

async function expectPeriod(page: Page, range: Range) {
  await expect(bars(page)).toHaveCount(bucketStarts(range).length);
  await expect(stat(page, 'Bookings')).toHaveText(String(count(range, 'PENDING', 'CONFIRMED', 'COMPLETED', 'NO_SHOW')));
  await expect(stat(page, 'Pending')).toHaveText(String(count(range, 'PENDING')));
  await expect(stat(page, 'Completed')).toHaveText(String(count(range, 'COMPLETED')));
  await expect(stat(page, 'Canceled / no-show')).toHaveText(String(count(range, 'CANCELED', 'NO_SHOW')));

  // Today's bar/week is highlighted; later ones are drawn as scheduled and say so.
  await expect(page.locator('.bar-chart__col--current')).toHaveCount(1);
  const scheduledBars = bucketStarts(range).filter((s) => s > today).length;
  await expect(page.locator('.bar-chart__col--scheduled')).toHaveCount(scheduledBars);
  for (const label of await page.locator('.bar-chart__col--scheduled').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')))) {
    expect(label).toMatch(/, scheduled$/);
  }
  for (const label of await page.locator('.bar-chart__col:not(.bar-chart__col--scheduled)').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')))) {
    expect(label).not.toMatch(/scheduled/);
  }
}

test('switching the range updates the cards, the chart and the scheduled bars', async ({ page }) => {
  await openOverview(page);

  // Week is the default.
  await expect(tab(page, 'week')).toHaveAttribute('aria-selected', 'true');
  await expectPeriod(page, 'week');
  await expect(bars(page)).toHaveCount(7);
  // Today's own bar carries today's count in its accessible name.
  await expect(page.locator('.bar-chart__col--current')).toHaveAttribute('aria-label', /: 2 bookings$/);

  await tab(page, 'month').click();
  await expectPeriod(page, 'month');
  await expect(page.locator('.bar-chart__col--current')).toHaveAttribute('aria-label', /: 2 bookings$/);

  await tab(page, 'quarter').click();
  await expectPeriod(page, 'quarter');

  await tab(page, 'week').click();
  await expectPeriod(page, 'week');
});

test('upcoming bookings are the next 5 from now, whatever the period', async ({ page }) => {
  await openOverview(page);
  const expected = upcomingSeeds().map((b) => whenLabel(b.at));
  expect(expected.length).toBeGreaterThan(0);
  await expect(page.getByRole('heading', { name: 'Upcoming bookings' })).toBeVisible();
  await expect(upcomingWhen(page)).toHaveText(expected);
  await expect(upcomingRows(page).getByText(/Canceled|No-show/)).toHaveCount(0);

  // Switching the period leaves the list alone.
  for (const range of ['month', 'quarter', 'week'] as const) {
    await tab(page, range).click();
    await expect(bars(page)).toHaveCount(bucketStarts(range).length);
    await expect(upcomingWhen(page)).toHaveText(expected);
  }
  await expect(page.getByRole('link', { name: 'View all' })).toHaveAttribute('href', `/shops/${E2E.shop.slug}/bookings`);
});

test('the status breakdown legend states every status with count and percent', async ({ page }) => {
  await openOverview(page);
  const legend = page.getByRole('list', { name: 'Bookings by status' });
  await expect(legend.getByRole('listitem')).toHaveCount(5);
  const pending = count('week', 'PENDING');
  const total = inPeriod('week').length;
  const row = legend.getByRole('listitem').filter({ hasText: 'Pending' });
  await expect(row.locator('.legend__count')).toHaveText(String(pending));
  await expect(row.locator('.legend__pct')).toHaveText(`${Math.round((pending / total) * 100)}%`);
  await expect(page.locator('.donut__value')).toHaveText(String(total));
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
  await tab(page, 'week').focus();
  await page.keyboard.press('ArrowRight');
  await expect(tab(page, 'month')).toHaveAttribute('aria-selected', 'true');
  await expect(bars(page)).toHaveCount(bucketStarts('month').length);
});

test('no horizontal scroll at 360px in any range', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await openOverview(page);
  for (const range of ['week', 'month', 'quarter'] as const) {
    await tab(page, range).click();
    await expect(bars(page)).toHaveCount(bucketStarts(range).length);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, `${range}: horizontal overflow`).toBeLessThanOrEqual(0);
  }
});

test('bookings exist, but none in the period: a plain message and no button', async ({ page }) => {
  await query('delete from "Booking"');
  await insertBooking('ov-far', addDays(today, 400), 10, 'CONFIRMED');
  await openOverview(page);

  await expect(page.getByText('No bookings this week')).toBeVisible();
  await expect(stat(page, 'Bookings')).toHaveText('0');
  await expect(page.getByRole('button', { name: 'Copy booking link' })).toHaveCount(0);
  await expect(bars(page)).toHaveCount(0);
  // The far-future booking is still the next upcoming one.
  await expect(upcomingRows(page)).toHaveCount(1);

  await tab(page, 'month').click();
  await expect(page.getByText('No bookings this month')).toBeVisible();
  await tab(page, 'quarter').click();
  await expect(page.getByText('No bookings in the last 3 months')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Copy booking link' })).toHaveCount(0);
});

test('bookings exist but none upcoming: "No upcoming bookings" with a link to all', async ({ page }) => {
  await query('delete from "Booking"');
  await insertBooking('ov-past', addDays(today, -10), 10, 'COMPLETED');
  await openOverview(page);
  await expect(page.getByText('No upcoming bookings')).toBeVisible();
  await expect(upcomingRows(page)).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'View all' })).toHaveAttribute('href', `/shops/${E2E.shop.slug}/bookings`);
});

test('a shop with no bookings ever shows the empty state with the booking link', async ({ page }) => {
  await query('delete from "Booking"');
  await openOverview(page);
  await expect(stat(page, 'Bookings')).toHaveText('0');
  await expect(page.getByText('No bookings in this period')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Copy booking link' })).toBeVisible();
  // The same, whichever period is selected.
  await tab(page, 'quarter').click();
  await expect(page.getByRole('button', { name: 'Copy booking link' })).toBeVisible();
  await expect(bars(page)).toHaveCount(0);
  // Nothing to list, so no empty "upcoming" table next to the call to action.
  await expect(page.getByRole('heading', { name: 'Upcoming bookings' })).toHaveCount(0);
});
