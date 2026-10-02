import { test, expect, type Page } from '@playwright/test';
import { E2E } from '../support/env';
import { bookingCount, query } from '../support/db';
import { addDays, athensDate, athensWallClockToUtc } from '../support/dates';

/**
 * Owner/staff booking outside working hours.
 *
 * The seeded provider works 00:00–23:30, so for this spec her hours are
 * narrowed to 09:00–17:00 (and restored afterwards). Phone-size viewport.
 */
test.use({ timezoneId: 'America/New_York', viewport: { width: 390, height: 844 } });
test.describe.configure({ mode: 'serial' });

// A day no other spec books on (owner-booking uses +3).
const date = addDays(athensDate(), 5);

test.beforeAll(async () => {
  await query(`update "ShopWorkingHourRange" set "startTime"='09:00', "endTime"='17:00'`);
});
test.afterAll(async () => {
  await query(`update "ShopWorkingHourRange" set "startTime"='00:00', "endTime"='23:30'`);
});

async function openWizard(
  page: Page,
  context: import('@playwright/test').BrowserContext,
  targetDate: string = date,
) {
  await context.addCookies([{ name: 'lang', value: 'en', url: E2E.webUrl }]);
  await page.goto('/login');
  await page.locator('#email').fill(E2E.owner.email);
  await page.locator('#password').fill(E2E.owner.password);
  await page.locator('button[type=submit]').click();
  await page.waitForURL('**/dashboard');
  await page.goto(`/shops/${E2E.shop.slug}/bookings/new`);
  await page.getByRole('radiogroup').getByRole('radio').first().click();
  await page.getByRole('radiogroup').getByRole('radio').first().click();
  await page.locator('#booking-date').fill(targetDate);
  if (targetDate === date) {
    await expect(page.getByRole('button', { name: '10:00', exact: true })).toBeVisible();
  }
}

// The switch input is visually replaced by its track, which intercepts the pointer, hence force.
const toggle = (page: Page) => page.getByRole('switch', { name: /outside working hours/i });

async function lastBooking() {
  const rows = await query<{ startTime: Date; overriddenRules: string[]; createdById: string | null }>(
    'select "startTime", "overriddenRules", "createdById" from "Booking" order by "createdAt" desc limit 1',
  );
  return rows[0];
}

test('the out-of-hours grid is hidden until asked for, and is never colour alone', async ({ page, context }) => {
  await openWizard(page, context);

  // toggle off: only the working-hours grid (09:00–16:30), no out-of-hours slots
  await expect(page.getByRole('button', { name: /^20:30/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^06:00/ })).toHaveCount(0);

  await toggle(page).check({ force: true });
  await expect(page.getByRole('heading', { name: /before opening/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: /after closing/i })).toBeVisible();

  // out-of-hours sections are collapsible (a phone-friendly accordion) and
  // start open; collapsing one hides its slots without touching the others
  const beforeOpeningSlot = page.getByRole('button', { name: /^06:00,/ });
  await expect(beforeOpeningSlot).toBeVisible();
  await page.getByRole('heading', { name: /before opening/i }).click();
  await expect(beforeOpeningSlot).toBeHidden();
  await expect(page.getByRole('button', { name: /^21:00,/ })).toBeVisible();
  await page.getByRole('heading', { name: /before opening/i }).click();
  await expect(beforeOpeningSlot).toBeVisible();

  // 3 h before 09:00 and 4 h after 17:00, nothing beyond
  await expect(page.getByRole('button', { name: /^06:00,/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /^05:45/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^21:00,/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /^21:15/ })).toHaveCount(0);

  // an out-of-hours slot says so in words (aria-label), with an icon and a dashed border
  const slot = page.getByRole('button', { name: '20:30, outside working hours' });
  await expect(slot).toBeVisible();
  await expect(slot.locator('svg')).toBeVisible();
  expect(await slot.evaluate((el) => getComputedStyle(el).borderTopStyle)).toBe('dashed');
  // an in-hours slot has neither
  const inHours = page.getByRole('button', { name: '10:00', exact: true });
  expect(await inHours.evaluate((el) => getComputedStyle(el).borderTopStyle)).toBe('solid');

  // turning the toggle off drops a selected out-of-hours time (no unseen selection)
  await slot.click();
  await expect(page.getByRole('button', { name: /continue/i })).toBeVisible();
  await toggle(page).uncheck({ force: true });
  await expect(page.getByRole('button', { name: /continue/i })).toHaveCount(0);
});

test('owner books 20:30 via the toggle: confirmation panel, stored as an exception', async ({ page, context }) => {
  await openWizard(page, context);
  await toggle(page).check({ force: true });
  await page.getByRole('button', { name: '20:30, outside working hours' }).click();
  await page.getByRole('button', { name: /continue/i }).click();

  await page.locator('#b-name').fill('Late Regular');
  await page.locator('#b-phone').fill('6900000201');

  // non-modal panel, and the submit button says what it does
  const panel = page.getByRole('status').filter({ hasText: /outside working hours|custom time/i });
  await expect(panel).toBeVisible();
  await expect(panel).toContainText(/outside working hours/i);
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
  const before = await bookingCount();
  await page.getByRole('button', { name: 'Book outside working hours' }).click();
  await page.waitForURL(`**/shops/${E2E.shop.slug}/bookings`);

  expect(await bookingCount()).toBe(before + 1);
  const row = await lastBooking();
  expect(row.startTime.toISOString()).toBe(athensWallClockToUtc(date, '20:30').toISOString());
  expect(row.overriddenRules).toEqual(['OUTSIDE_OPENING_HOURS']);
  expect(row.createdById).toBe('u1');

  // and it is on the calendar
  await page.locator('#bookings-date').fill(date);
  await expect(page.locator('.cal-block', { hasText: 'Late Regular' })).toBeVisible();
});

test('the booked out-of-hours slot is shown as booked, and overlap is refused even after confirming', async ({
  page,
  context,
}) => {
  await openWizard(page, context);
  await toggle(page).check({ force: true });
  const booked = page.getByRole('button', { name: '20:30, outside working hours, booked' });
  await expect(booked).toBeDisabled();
  await expect(booked).toContainText('booked');

  // try to force it through "Other time": 20:30 is a listed slot, so the form
  // treats it as that slot (panel + explicit button) and lets the server decide
  await page.locator('#booking-other-time').fill('20:30');
  await page.getByRole('button', { name: /continue/i }).click();
  await page.locator('#b-name').fill('Double Booker');
  await page.locator('#b-phone').fill('6900000202');
  await expect(page.getByRole('status').filter({ hasText: /outside working hours|custom time/i })).toBeVisible();
  const before = await bookingCount();
  await page.getByRole('button', { name: 'Book outside working hours' }).click();

  // accepting the rule is not enough: the slot is taken (409), nothing created
  await expect(page.getByRole('alert')).toContainText(/already booked/i);
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
  expect(await bookingCount()).toBe(before);
});

test('owner books 21:10 via "Other time": the dialog fallback lists the rule, then stores it', async ({
  page,
  context,
}) => {
  await openWizard(page, context);
  await toggle(page).check({ force: true });
  await page.locator('#booking-other-time').fill('21:10');
  await page.getByRole('button', { name: /continue/i }).click();
  await page.locator('#b-name').fill('Walk In');
  await page.locator('#b-phone').fill('6900000203');

  // a typed-in time is unknown client-side: no panel, an ordinary button
  await expect(page.getByRole('status').filter({ hasText: /outside working hours|custom time/i })).toHaveCount(0);
  const before = await bookingCount();
  await page.getByRole('button', { name: /create booking/i }).click();

  const dialog = page.getByRole('alertdialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('Book anyway?');
  expect(await bookingCount()).toBe(before); // nothing yet

  // Cancel closes it and still creates nothing ...
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(dialog).toBeHidden();
  expect(await bookingCount()).toBe(before);

  // ... submitting again and confirming books it
  await page.getByRole('button', { name: /create booking/i }).click();
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Book anyway' }).click();
  await page.waitForURL(`**/shops/${E2E.shop.slug}/bookings`);

  const row = await lastBooking();
  expect(row.startTime.toISOString()).toBe(athensWallClockToUtc(date, '21:10').toISOString());
  expect(row.overriddenRules).toEqual(['OUTSIDE_OPENING_HOURS']);
});

test('the public booking page never offers those times', async ({ request }) => {
  const res = await request.get(
    `${E2E.apiUrl}/public/${E2E.shop.slug}/slots?date=${date}&serviceId=sv1&staffId=us1&includeOutsideHours=true`,
  );
  expect(res.status()).toBe(200);
  const { data } = await res.json();
  expect(data.status).toBe('ok');
  const times: string[] = data.slots.map((s: { time: string }) => s.time);
  expect(times[0]).toBe('09:00');
  expect(times.every((x) => x >= '09:00' && x <= '16:30')).toBe(true);
  expect(times).not.toContain('20:30');
  expect(data.slots.every((s: object) => !('outsideHours' in s))).toBe(true);

  // and a public booking at 20:30 is refused outright
  const book = await request.post(`${E2E.apiUrl}/public/${E2E.shop.slug}/book`, {
    data: {
      name: 'Sneaky',
      phone: '6900000204',
      serviceId: 'sv1',
      staffId: 'us1',
      startTime: athensWallClockToUtc(date, '20:00').toISOString(),
      overrideRules: ['OUTSIDE_OPENING_HOURS'],
    },
  });
  expect(book.status()).toBe(422);
  expect((await book.json()).code).toBe('OUTSIDE_OPENING_HOURS');
});

test('a 06:15 booking (before opening) lands on the calendar', async ({ page, context }) => {
  await openWizard(page, context);
  await toggle(page).check({ force: true });
  await page.getByRole('button', { name: '06:15, outside working hours' }).click();
  await page.getByRole('button', { name: /continue/i }).click();
  await page.locator('#b-name').fill('Early Bird');
  await page.locator('#b-phone').fill('6900000205');
  await page.getByRole('button', { name: 'Book outside working hours' }).click();
  await page.waitForURL(`**/shops/${E2E.shop.slug}/bookings`);

  await page.locator('#bookings-date').fill(date);
  await expect(page.locator('.cal-block', { hasText: 'Early Bird' })).toBeVisible();
});

test('a 22:30 booking (after closing, via "Other time") lands on the calendar', async ({ page, context }) => {
  // 22:30 is beyond the 4h-after-closing cap, so it is off-grid: typed via
  // "Other time" and confirmed through the dialog fallback (like 21:10 above).
  await openWizard(page, context);
  await toggle(page).check({ force: true });
  await page.locator('#booking-other-time').fill('22:30');
  await page.getByRole('button', { name: /continue/i }).click();
  await page.locator('#b-name').fill('Night Owl');
  await page.locator('#b-phone').fill('6900000206');
  await page.getByRole('button', { name: /create booking/i }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Book anyway' }).click();
  await page.waitForURL(`**/shops/${E2E.shop.slug}/bookings`);

  await page.locator('#bookings-date').fill(date);
  await expect(page.locator('.cal-block', { hasText: 'Night Owl' })).toBeVisible();
});

test.describe('a booking on a fully closed day', () => {
  // A weekday not used by any other test in this file, narrowed to a full day
  // off (the seeded provider's only schedule) so the calendar's closed-day
  // fallback grid (08:00–22:00, decision 4) applies.
  const closedDate = addDays(date, 2);
  const closedWeekday = (['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as const)[
    new Date(`${closedDate}T00:00:00Z`).getUTCDay()
  ];

  test.beforeAll(async () => {
    await query('update "ShopWorkingDay" set "isOpen"=false where "scheduleId"=\'sch1\' and day=$1', [closedWeekday]);
  });
  test.afterAll(async () => {
    await query('update "ShopWorkingDay" set "isOpen"=true where "scheduleId"=\'sch1\' and day=$1', [closedWeekday]);
  });

  test('is visible on the calendar and tagged as a closed-day exception', async ({ page, context }) => {
    await openWizard(page, context, closedDate);
    await expect(page.getByRole('status').filter({ hasText: /closed/i })).toBeVisible();
    await toggle(page).check({ force: true });
    await expect(page.getByRole('heading', { name: /closed day/i })).toBeVisible();

    await page.getByRole('button', { name: '10:00, outside working hours' }).click();
    await page.getByRole('button', { name: /continue/i }).click();
    await page.locator('#b-name').fill('Sunday Regular');
    await page.locator('#b-phone').fill('6900000207');
    await expect(page.getByRole('status').filter({ hasText: /outside working hours|custom time/i })).toContainText(/outside working hours/i);
    await page.getByRole('button', { name: 'Book outside working hours' }).click();
    await page.waitForURL(`**/shops/${E2E.shop.slug}/bookings`);

    const row = await lastBooking();
    expect(row.overriddenRules).toEqual(['SHOP_CLOSED']);

    await page.locator('#bookings-date').fill(closedDate);
    const block = page.locator('.cal-block', { hasText: 'Sunday Regular' });
    await expect(block).toBeVisible();
    // tagged in words, not colour alone
    await expect(block).toContainText(/closed day/i);
    expect(await block.evaluate((el) => getComputedStyle(el).borderTopStyle)).toBe('dashed');
  });
});
