import { test, expect } from '@playwright/test';
import { E2E } from '../support/env';
import { waitForLanding } from '../support/auth';
import { query } from '../support/db';

/**
 * Shop settings are split into tabs that are saved together. A change in any
 * of them is marked (a yellow border) and brings up a Save bar that stays in
 * view, on every tab, until the change is saved or undone.
 */
test.afterEach(async () => {
  await query(`update "Shop" set "reminderEnabled" = true where slug = $1`, [E2E.shop.slug]);
});

test('a changed setting shows a Save bar that stays in view, and goes once saved', async ({ page }) => {
  await page.context().addCookies([{ name: 'lang', value: 'en', url: E2E.webUrl }]);
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto('/login');
  await page.locator('#email').fill(E2E.owner.email);
  await page.locator('#password').fill(E2E.owner.password);
  await page.locator('button[type=submit]').click();
  await waitForLanding(page);
  await page.goto(`/shops/${E2E.shop.slug}/settings`);

  const bar = page.locator('.save-bar');
  await expect(bar).toHaveCount(0);

  // A change on one tab is still waiting to be saved on the others.
  const name = page.locator('#detail-name');
  const original = await name.inputValue();
  await name.fill(`${original} x`);
  await expect(bar).toBeInViewport();
  await expect(bar).toContainText('You have unsaved changes.');
  await expect(page.locator('.card--unsaved')).toHaveCount(1);
  await page.getByRole('tab', { name: 'Booking page' }).click();
  await expect(bar).toBeVisible();
  await page.getByRole('tab', { name: 'Shop', exact: true }).click();
  await expect(name).toHaveValue(`${original} x`);
  await name.fill(original);
  await expect(bar).toHaveCount(0);

  await page.getByRole('tab', { name: 'Bookings' }).click();
  await expect(page).toHaveURL(/\?tab=bookings$/);
  const reminder = page.locator('#detail-reminder');
  await expect(reminder).toBeChecked();
  await reminder.uncheck({ force: true });
  await expect(bar).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  if (process.env.SHOT) await page.screenshot({ path: process.env.SHOT });

  // Undoing the change is not a change.
  await reminder.check({ force: true });
  await expect(bar).toHaveCount(0);

  await reminder.uncheck({ force: true });
  await bar.getByRole('button', { name: 'Save Changes' }).click();
  await expect(bar).toHaveCount(0);
  await expect(page.locator('.card--unsaved')).toHaveCount(0);
  const saved = await query(`select "reminderEnabled" from "Shop" where slug = $1`, [E2E.shop.slug]);
  expect(saved[0].reminderEnabled).toBe(false);
});

test('working hours mark a changed schedule and offer Save where the change is', async ({ page }) => {
  await page.context().addCookies([{ name: 'lang', value: 'en', url: E2E.webUrl }]);
  await page.goto('/login');
  await page.locator('#email').fill(E2E.owner.email);
  await page.locator('#password').fill(E2E.owner.password);
  await page.locator('button[type=submit]').click();
  await waitForLanding(page);
  await page.goto(`/shops/${E2E.shop.slug}/team/us1`);

  const schedule = page.locator('.card--flush').first();
  const bar = schedule.locator('.save-bar');
  await expect(schedule.locator('.card__section').first()).toBeVisible();
  await expect(bar).toHaveCount(0);
  await expect(schedule).not.toHaveClass(/card--unsaved/);

  // Close a day, then open it again: back to what is saved, nothing to save.
  const day = schedule.locator('.card__section').getByRole('switch').first();
  const wasOpen = await day.isChecked();
  await day.setChecked(!wasOpen, { force: true });
  await expect(schedule).toHaveClass(/card--unsaved/);
  await expect(bar).toContainText('You have unsaved changes.');
  await day.setChecked(wasOpen, { force: true });
  await expect(bar).toHaveCount(0);
  await expect(schedule).not.toHaveClass(/card--unsaved/);
});
