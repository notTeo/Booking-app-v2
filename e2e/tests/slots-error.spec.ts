import { test, expect, type Page } from '@playwright/test';
import { E2E } from '../support/env';
import { addDays, athensDate } from '../support/dates';

/**
 * A failed slot fetch is an error with a Retry, never "closed this day".
 * "Closed" is only for a successful empty response. Covers both the public
 * booking page and the owner wizard (they share useBookingWizard).
 */
const date = addDays(athensDate(), 9);

// Fails the first slots request with a 500, lets later ones through.
async function failSlotsOnce(page: Page, urlPart: RegExp) {
  let failed = false;
  await page.route(urlPart, (route) => {
    if (failed) return route.continue();
    failed = true;
    return route.fulfill({ status: 500, json: { status: 'error', message: 'boom' } });
  });
}

async function expectErrorThenRetry(page: Page) {
  const alert = page.getByRole('alert').filter({ hasText: 'Failed to load available slots' });
  await expect(alert).toBeVisible();
  await expect(page.getByText(/closed|no working hours/i)).toHaveCount(0);
  await alert.getByRole('button', { name: 'Retry' }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '10:00', exact: true })).toBeVisible();
}

test('public page: a failed slot fetch shows an error with Retry', async ({ page, context }) => {
  await context.addCookies([{ name: 'lang', value: 'en', url: E2E.webUrl }]);
  await failSlotsOnce(page, /\/public\/[^/]+\/slots/);
  await page.goto(`/${E2E.shop.slug}`);
  await page.getByRole('radiogroup').getByRole('radio').first().click();
  await page.getByRole('radiogroup').getByRole('radio').first().click();
  await page.locator('#booking-date').fill(date);
  await expectErrorThenRetry(page);
});

test('owner wizard: a failed slot fetch shows an error with Retry', async ({ page, context }) => {
  await context.addCookies([{ name: 'lang', value: 'en', url: E2E.webUrl }]);
  await page.goto('/login');
  await page.locator('#email').fill(E2E.owner.email);
  await page.locator('#password').fill(E2E.owner.password);
  await page.locator('button[type=submit]').click();
  await page.waitForURL('**/dashboard');
  await failSlotsOnce(page, /\/api\/shops\/[^/]+\/bookings\/slots/);
  await page.goto(`/shops/${E2E.shop.slug}/bookings/new`);
  await page.getByRole('radiogroup').getByRole('radio').first().click();
  await page.getByRole('radiogroup').getByRole('radio').first().click();
  await page.locator('#booking-date').fill(date);
  await expectErrorThenRetry(page);
});
