import { test, expect } from '@playwright/test';
import { E2E } from '../support/env';
import { waitForLanding } from '../support/auth';
import { query } from '../support/db';
import { addDays, athensDate } from '../support/dates';

/**
 * Time off sits on top of the weekly working hours: a day the owner marks as
 * off on a member's page is closed on the public booking page, and open again
 * once the entry is removed.
 */
const date = addDays(athensDate(), 44);

test.afterAll(async () => {
  await query('delete from "TimeOff"');
});

test('a day off closes that day for customers', async ({ page, context }) => {
  await context.addCookies([{ name: 'lang', value: 'en', url: E2E.webUrl }]);

  const openPublicDay = async () => {
    await page.goto(`/${E2E.shop.slug}`);
    await page.getByRole('radiogroup').getByRole('radio').first().click();
    await page.getByRole('radiogroup').getByRole('radio').first().click();
    await page.locator('#booking-date').fill(date);
  };

  await openPublicDay();
  await expect(page.getByRole('button', { name: '10:00', exact: true })).toBeVisible();

  await page.goto('/login');
  await page.locator('#email').fill(E2E.owner.email);
  await page.locator('#password').fill(E2E.owner.password);
  await page.locator('button[type=submit]').click();
  await waitForLanding(page);

  await page.goto(`/shops/${E2E.shop.slug}/team/us1`);
  const panel = page.locator('section', { has: page.getByRole('heading', { name: 'Time off' }) });
  await panel.getByRole('button', { name: 'Add' }).click();
  await panel.getByLabel('First day').fill(date);
  await panel.getByLabel('Note (optional)').fill('Vacation');
  await panel.getByRole('button', { name: 'Save' }).click();
  await expect(panel.getByText('All day · Vacation')).toBeVisible();

  await openPublicDay();
  await expect(page.getByText('No appointments available for this date')).toBeVisible();
  await expect(page.getByRole('button', { name: '10:00', exact: true })).toHaveCount(0);

  await page.goto(`/shops/${E2E.shop.slug}/team/us1`);
  await panel.getByRole('button', { name: 'Remove' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Remove' }).click();
  await expect(panel.getByText('No time off.')).toBeVisible();

  await openPublicDay();
  await expect(page.getByRole('button', { name: '10:00', exact: true })).toBeVisible();
});
