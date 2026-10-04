import { test, expect } from '@playwright/test';
import { E2E } from '../support/env';
import { waitForLanding } from '../support/auth';
import { query } from '../support/db';
import { addDays, athensDate, athensWallClockToUtc } from '../support/dates';

/**
 * Per-shop slot interval (Shop settings) and the calendar filters modal.
 * The shop is put back on the default 30 minutes at the end: the other specs
 * assume a 30-minute grid and share this database.
 */
test.afterAll(async () => {
  await query('update "Shop" set "slotIntervalMinutes" = 30 where id = $1', ['s1']);
});

test('a 15-minute interval offers :15 starts, and the calendar filters hide blocks', async ({
  page,
  context,
}) => {
  await context.addCookies([{ name: 'lang', value: 'en', url: E2E.webUrl }]);
  const date = addDays(athensDate(), 4);

  await page.goto('/login');
  await page.locator('#email').fill(E2E.owner.email);
  await page.locator('#password').fill(E2E.owner.password);
  await page.locator('button[type=submit]').click();
  await waitForLanding(page);

  // Shop settings: every 15 minutes
  await page.goto(`/shops/${E2E.shop.slug}/settings`);
  await page.locator('#detail-slot-interval').selectOption('15');
  await page.getByRole('button', { name: /save changes/i }).click();
  await expect
    .poll(async () => (await query('select "slotIntervalMinutes" as n from "Shop" where id = $1', ['s1']))[0].n)
    .toBe(15);

  // the wizard now offers a :15 start
  await page.goto(`/shops/${E2E.shop.slug}/bookings/new`);
  await page.getByRole('radiogroup').getByRole('radio').first().click();
  await page.getByRole('radiogroup').getByRole('radio').first().click();
  await page.locator('#booking-date').fill(date);
  await page.getByRole('button', { name: '10:15', exact: true }).click();
  await page.getByRole('button', { name: /continue/i }).click();
  await page.locator('#b-name').fill('Filter Test');
  await page.locator('#b-phone').fill('6911111111');
  await page.waitForTimeout(600);
  await page.getByRole('button', { name: /create booking/i }).click();
  await page.waitForURL(`**/shops/${E2E.shop.slug}/bookings`);
  await page.locator('#bookings-date').fill(date);

  const block = page.locator('.cal-block', { hasText: 'Filter Test' });
  await expect(block).toBeVisible();

  // the filters live in a modal and apply straight away
  await page.getByRole('button', { name: /^Filters/ }).click();
  const filters = page.getByRole('dialog');

  // filter by a status it does not have: hidden, and the count says so
  await filters.getByRole('button', { name: 'Canceled', exact: true }).click();
  await expect(block).toHaveCount(0);
  await expect(page.locator('.cal-filters-count')).toContainText('0 of');

  // clear: back
  await filters.getByRole('button', { name: /clear filters/i }).click();
  await expect(block).toBeVisible();

  // a service filter that matches keeps it; staff filter to the member keeps it
  await filters.getByLabel('Service').selectOption({ label: 'Haircut' });
  await expect(block).toBeVisible();
  await filters.getByLabel('Staff').selectOption({ label: 'E2E Owner' });
  await expect(block).toBeVisible();

  await filters.getByRole('button', { name: 'Done' }).click();
  await expect(filters).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^Filters/ })).toContainText('2');
});

test('the "Time step" buttons in the staff wizard offer 10-minute starts for one booking, saved as a custom time', async ({
  page,
  context,
}) => {
  await context.addCookies([{ name: 'lang', value: 'en', url: E2E.webUrl }]);
  const date = addDays(athensDate(), 5);
  // the first test in this file left the shop on 15 minutes until afterAll
  await query('update "Shop" set "slotIntervalMinutes" = 30 where id = $1', ['s1']);

  await page.goto('/login');
  await page.locator('#email').fill(E2E.owner.email);
  await page.locator('#password').fill(E2E.owner.password);
  await page.locator('button[type=submit]').click();
  await waitForLanding(page);

  await page.goto(`/shops/${E2E.shop.slug}/bookings/new`);
  await page.getByRole('radiogroup').getByRole('radio').first().click();
  await page.getByRole('radiogroup').getByRole('radio').first().click();
  await page.locator('#booking-date').fill(date);

  // default: the shop's 30-minute grid, no :10 start
  await expect(page.getByRole('button', { name: '10:30', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '10:10', exact: true })).toHaveCount(0);

  await page.getByRole('button', { name: '10 min', exact: true }).click();
  await page.getByRole('button', { name: /^10:10/ }).click();
  await page.getByRole('button', { name: /continue/i }).click();

  await page.locator('#b-name').fill('Ten Minute');
  await page.locator('#b-phone').fill('6922222222');
  await page.waitForTimeout(600);
  await expect(page.getByRole('status').filter({ hasText: /outside working hours|custom time/i })).toContainText(/custom time/i);
  await page.getByRole('button', { name: 'Book this time' }).click();
  await page.waitForURL(`**/shops/${E2E.shop.slug}/bookings`);

  const rows = await query<{ startTime: Date; overriddenRules: string[] }>(
    'select "startTime", "overriddenRules" from "Booking" order by "createdAt" desc limit 1',
  );
  expect(rows[0].startTime.toISOString()).toBe(athensWallClockToUtc(date, '10:10').toISOString());
  expect(rows[0].overriddenRules).toEqual(['OFF_SLOT_GRID']);

  // the shop's own setting was not touched
  expect((await query('select "slotIntervalMinutes" as n from "Shop" where id = $1', ['s1']))[0].n).toBe(30);
});
