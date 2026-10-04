import { test, expect } from '@playwright/test';
import { E2E } from '../support/env';
import { waitForLanding } from '../support/auth';
import { latestBookingStart } from '../support/db';
import { addDays, athensDate, athensWallClockToUtc } from '../support/dates';

/**
 * Owner wizard smoke test: log in through the real form, create an in-hours
 * booking through the wizard, and find it in the calendar.
 *
 * The wizard must get its slots from the AUTHENTICATED owner endpoint
 * (GET /api/shops/:shopId/bookings/slots) — never the public one, which no
 * longer knows about internally-bookable staff.
 */
test.use({ timezoneId: 'America/New_York' }); // a browser that is NOT on shop time

test('owner books through the wizard (authenticated slots) and sees it in the calendar', async ({
  page,
  context,
}) => {
  await context.addCookies([{ name: 'lang', value: 'en', url: E2E.webUrl }]);
  const date = addDays(athensDate(), 3);

  const ownerSlotRequests: string[] = [];
  const publicSlotRequests: string[] = [];
  page.on('request', (r) => {
    const url = r.url();
    if (/\/api\/shops\/[^/]+\/bookings\/slots/.test(url)) ownerSlotRequests.push(url);
    if (/\/public\/[^/]+\/slots/.test(url)) publicSlotRequests.push(url);
  });

  // log in through the real form
  await page.goto('/login');
  await page.locator('#email').fill(E2E.owner.email);
  await page.locator('#password').fill(E2E.owner.password);
  await page.locator('button[type=submit]').click();
  await waitForLanding(page);

  // wizard: service -> team member -> date -> in-hours slot
  await page.goto(`/shops/${E2E.shop.slug}/bookings/new`);
  await page.getByRole('radiogroup').getByRole('radio').first().click();
  await page.getByRole('radiogroup').getByRole('radio').first().click();
  await page.locator('#booking-date').fill(date);
  await page.getByRole('button', { name: '10:00', exact: true }).click();
  await page.getByRole('button', { name: /continue/i }).click();

  // customer form: type the NAME first, then the phone. Changing the phone
  // triggers a customer look-up; it must never clear what was typed.
  await page.locator('#b-name').fill('Smoke Test');
  await page.locator('#b-phone').fill('6987654321');
  await page.waitForTimeout(600); // let the (debounced) look-up finish
  await expect(page.locator('#b-name')).toHaveValue('Smoke Test');
  await page.getByRole('button', { name: /create booking/i }).click();

  // lands on the calendar (today); go to the booking's day
  await page.waitForURL(`**/shops/${E2E.shop.slug}/bookings`);
  await page.locator('#bookings-date').fill(date);

  const block = page.locator('.cal-block', { hasText: 'Smoke Test' });
  await expect(block).toBeVisible();
  await expect(block.locator('.cal-block__time')).toContainText(/10:00/);
  await expect(block.locator('.cal-block__service')).toContainText('Haircut');

  // stored as exactly 10:00 Athens
  expect(await latestBookingStart()).toBe(athensWallClockToUtc(date, '10:00').toISOString());

  // the wizard used the authenticated endpoint, never the public one
  expect(ownerSlotRequests.length).toBeGreaterThan(0);
  expect(publicSlotRequests).toEqual([]);
});
