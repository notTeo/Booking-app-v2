import { test, expect } from '@playwright/test';
import { E2E } from '../support/env';
import { waitForLanding } from '../support/auth';
import { bookingCount } from '../support/db';
import { addDays, athensDate } from '../support/dates';
import { pickServiceAndProvider } from '../support/booking';

/**
 * BOOKING_BUSY (503, out-of-retry-budget) must never look like a rejection of
 * what the customer entered: a
 * neutral notice, the typed values kept, and the submit button re-enabled
 * after the server's Retry-After window — never the red error style used for
 * real rejections (409 slot taken, 422 rule violations).
 */

// A day no other spec books on.
const date = addDays(athensDate(), 8);

test('a 503 BOOKING_BUSY response shows a neutral notice, keeps the form, and re-enables the button', async ({
  page,
  context,
}) => {
  await context.addCookies([{ name: 'lang', value: 'en', url: E2E.webUrl }]);
  await page.goto(`/${E2E.shop.slug}`);
  await pickServiceAndProvider(page);
  await page.locator('#booking-date').fill(date);
  await page.getByRole('button', { name: '10:00', exact: true }).click();
  await page.getByRole('button', { name: /continue/i }).click();

  await page.locator('#b-name').fill('Busy Tester');
  await page.locator('#b-phone').fill('6900009999');

  let intercepted = false;
  await page.route(`**/public/${E2E.shop.slug}/book`, async (route) => {
    if (intercepted) {
      await route.continue();
      return;
    }
    intercepted = true;
    await route.fulfill({
      status: 503,
      headers: { 'Retry-After': '1' },
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'error',
        code: 'BOOKING_BUSY',
        message: 'The booking system is busy right now. Please try again in a moment.',
      }),
    });
  });

  const before = await bookingCount();
  // Located by position, not name: the label changes while the button is busy/disabled.
  const submit = page.locator('.booking-card__actions').getByRole('button').last();
  await submit.click();

  // Neutral, not the red rejection style; nothing was actually booked.
  const notice = page.getByRole('status').filter({ hasText: /busy/i });
  await expect(notice).toBeVisible();
  await expect(notice).toContainText(/busy/i);
  await expect(page.getByRole('alert')).toHaveCount(0);
  expect(await bookingCount()).toBe(before);

  // The typed values are untouched.
  await expect(page.locator('#b-name')).toHaveValue('Busy Tester');
  await expect(page.locator('#b-phone')).toHaveValue('6900009999');

  // The button stays disabled through the server's Retry-After window, then
  // re-enables on its own (no auto-resubmit).
  await expect(submit).toBeDisabled();
  await expect(submit).toBeEnabled({ timeout: 3000 });
});

test('the owner wizard gets the same treatment: neutral notice, never the override dialog', async ({
  page,
  context,
}) => {
  await context.addCookies([{ name: 'lang', value: 'en', url: E2E.webUrl }]);
  await page.goto('/login');
  await page.locator('#email').fill(E2E.owner.email);
  await page.locator('#password').fill(E2E.owner.password);
  await page.locator('button[type=submit]').click();
  await waitForLanding(page);

  await page.goto(`/shops/${E2E.shop.slug}/bookings/new`);
  await pickServiceAndProvider(page);
  await page.locator('#booking-date').fill(addDays(date, 1));
  await page.getByRole('button', { name: '10:00', exact: true }).click();
  await page.getByRole('button', { name: /continue/i }).click();

  await page.locator('#b-name').fill('Busy Owner Test');
  await page.locator('#b-phone').fill('6900008888');

  let intercepted = false;
  await page.route(`**/api/shops/*/bookings`, async (route) => {
    if (intercepted || route.request().method() !== 'POST') {
      await route.continue();
      return;
    }
    intercepted = true;
    await route.fulfill({
      status: 503,
      headers: { 'Retry-After': '1' },
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'error',
        code: 'BOOKING_BUSY',
        message: 'The booking system is busy right now. Please try again in a moment.',
      }),
    });
  });

  const before = await bookingCount();
  await page.getByRole('button', { name: /create booking/i }).click();

  const notice = page.getByRole('status').filter({ hasText: /busy/i });
  await expect(notice).toBeVisible();
  await expect(notice).toContainText(/busy/i);
  await expect(page.getByRole('alert')).toHaveCount(0);
  // Never treated as an overridable rule violation.
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
  expect(await bookingCount()).toBe(before);
  await expect(page.locator('#b-name')).toHaveValue('Busy Owner Test');
});
