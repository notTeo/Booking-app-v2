import { test, expect } from '@playwright/test';
import { E2E } from '../support/env';
import { query } from '../support/db';
import { addDays, athensDate } from '../support/dates';

/**
 * Per-shop slot interval (Shop settings) and the calendar filter bar.
 * The shop is put back on the default 30 minutes at the end: the other specs
 * assume a 30-minute grid and share this database.
 */
test.afterAll(async () => {
  await query('update "Shop" set "slotIntervalMinutes" = 30 where id = $1', ['s1']);
});

test('a 15-minute interval offers :15 starts, and the calendar filter bar hides blocks', async ({
  page,
  context,
}) => {
  await context.addCookies([{ name: 'lang', value: 'en', url: E2E.webUrl }]);
  const date = addDays(athensDate(), 4);

  await page.goto('/login');
  await page.locator('#email').fill(E2E.owner.email);
  await page.locator('#password').fill(E2E.owner.password);
  await page.locator('button[type=submit]').click();
  await page.waitForURL('**/dashboard');

  // Shop settings: every 15 minutes
  await page.goto(`/shops/${E2E.shop.slug}/settings`);
  await page.locator('#detail-slot-interval').selectOption('15');
  await page.getByRole('button', { name: /save changes/i }).click();
  await expect
    .poll(async () => (await query('select "slotIntervalMinutes" as n from "Shop" where id = $1', ['s1']))[0].n)
    .toBe(15);

  // the wizard now offers a :15 start
  await page.goto(`/shops/${E2E.shop.slug}/bookings/new`);
  await page.locator('.public-service-card--selectable').first().click();
  await page.locator('.public-team-card--selectable').first().click();
  await page.locator('#booking-date').fill(date);
  await page.locator('.public-slot-btn', { hasText: /^10:15$/ }).click();
  await page.getByRole('button', { name: /continue/i }).click();
  await page.locator('#b-name').fill('Filter Test');
  await page.locator('#b-phone').fill('6911111111');
  await page.waitForTimeout(600);
  await page.getByRole('button', { name: /create booking/i }).click();
  await page.waitForURL(`**/shops/${E2E.shop.slug}/bookings`);
  await page.locator('#bookings-date').fill(date);

  const block = page.locator('.cal-block', { hasText: 'Filter Test' });
  await expect(block).toBeVisible();

  // filter by a status it does not have: hidden, and the count says so
  await page.getByRole('button', { name: 'Canceled', exact: true }).click();
  await expect(block).toHaveCount(0);
  await expect(page.locator('.cal-filters-count')).toContainText('0 of');

  // clear: back
  await page.getByRole('button', { name: /clear filters/i }).click();
  await expect(block).toBeVisible();

  // a service filter that matches keeps it; staff filter to the member keeps it
  await page.locator('#cal-filter-service').selectOption({ label: 'Haircut' });
  await expect(block).toBeVisible();
  await page.locator('#cal-filter-staff').selectOption({ label: 'E2E Owner' });
  await expect(block).toBeVisible();
});
