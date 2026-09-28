import { test, expect } from '@playwright/test';
import { E2E } from '../support/env';
import { bookingCount, latestBookingStart } from '../support/db';
import { athensDate, athensWallClockToUtc } from '../support/dates';

/**
 * Owner path: a booking that breaks a rule (here: a slot earlier today, i.e.
 * in the past) is rejected with 422; the dashboard asks "Book anyway?" and
 * only sends override: true after the owner confirms.
 */
test.use({ timezoneId: 'America/New_York' });

// SKIPPED — obsolete. This test drives the first override design (a blanket
// `override: true` after a 422 -> dialog -> resend). That design is replaced by
// the approved out-of-hours plan (docs/plan-out-of-hours.md): an explicit
// `overrideRules` list confirmed on the last step, with out-of-hours slots
// visible in the form. Commit 9 of that plan rewrites this spec against the
// new flow; until then it stays skipped (it also fails: the submit button is
// disabled in this flow).
test.skip('owner is asked before booking a past time, and can confirm or cancel', async ({
  page,
  context,
}) => {
  await context.addCookies([{ name: 'lang', value: 'en', url: E2E.webUrl }]);
  const today = athensDate();

  // log in through the real form
  await page.goto('/login');
  await page.locator('#email').fill(E2E.owner.email);
  await page.locator('#password').fill(E2E.owner.password);
  await page.locator('button[type=submit]').click();
  await page.waitForURL('**/dashboard');

  await page.goto(`/shops/${E2E.shop.slug}/bookings/new`);
  await page.locator('.public-service-card--selectable').first().click();
  await page.locator('.public-team-card--selectable').first().click();
  await page.locator('#booking-date').evaluate((el, v) => {
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
    set.call(el, v);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }, today);
  await page.locator('.public-slot-btn', { hasText: /^00:00$/ }).click(); // earlier today: in the past
  await page.getByRole('button', { name: /continue/i }).click();
  await page.locator('#b-name').fill('Late Walk-in');
  await page.locator('#b-phone').fill('6900000123');

  const before = await bookingCount();
  const submit = page.locator('button.btn-primary').last();

  // 1) submit -> server 422 -> confirmation dialog; nothing is created yet
  await submit.click();
  const dialog = page.getByRole('alertdialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('Book anyway?');
  await expect(dialog).toContainText('That time is in the past.');
  expect(await bookingCount()).toBe(before);

  // 2) Cancel -> dialog closes, still nothing created
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(dialog).toBeHidden();
  expect(await bookingCount()).toBe(before);

  // 3) submit again and confirm -> override sent -> booking exists
  await submit.click();
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Book anyway' }).click();
  await page.waitForURL(`**/shops/${E2E.shop.slug}/bookings`);
  expect(await bookingCount()).toBe(before + 1);
  expect(await latestBookingStart()).toBe(athensWallClockToUtc(today, '00:00').toISOString());
});
