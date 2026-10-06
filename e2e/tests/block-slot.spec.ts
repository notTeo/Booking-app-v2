import { test, expect, type Page } from '@playwright/test';
import { E2E } from '../support/env';
import { waitForLanding } from '../support/auth';
import { query } from '../support/db';
import { addDays, athensDate } from '../support/dates';
import { pickService } from '../support/booking';

/**
 * The shop's booking wizard can block a slot instead of booking a customer:
 * the time is held on a "Blocked" placeholder, shown as such on the calendar,
 * closed to the public page, and freed again by unblocking it.
 */
// A day no other spec books on.
const date = addDays(athensDate(), 25);

test.afterAll(async () => {
  await query(`delete from "Customer" where "isSystem"`);
});

async function publicTimes(page: Page) {
  await page.goto(`/${E2E.shop.slug}`);
  await pickService(page, /Haircut/);
  await page.getByRole('radiogroup').getByRole('radio').first().click();
  await page.locator('#booking-date').fill(date);
  await expect(page.getByRole('button', { name: '09:00', exact: true })).toBeVisible();
}

test('block a slot from the wizard, see it on the calendar, then unblock it', async ({ page, context }) => {
  await context.addCookies([{ name: 'lang', value: 'en', url: E2E.webUrl }]);
  await page.goto('/login');
  await page.locator('#email').fill(E2E.owner.email);
  await page.locator('#password').fill(E2E.owner.password);
  await page.locator('button[type=submit]').click();
  await waitForLanding(page);

  await page.goto(`/shops/${E2E.shop.slug}/bookings/new`);
  await pickService(page, /Haircut/);
  await page.getByRole('radiogroup').getByRole('radio').first().click();
  await page.locator('#booking-date').fill(date);
  await page.getByRole('button', { name: '10:00', exact: true }).click();
  await page.getByRole('button', { name: /continue/i }).click();

  // Blocking swaps the customer fields for a fixed "Blocked" and a ready note.
  await page.getByRole('button', { name: 'Block this slot' }).click();
  await expect(page.locator('#b-phone')).toHaveCount(0);
  await expect(page.locator('#b-blocked')).toHaveValue('Blocked');
  await expect(page.locator('#b-notes')).toHaveValue('Blocked slot');
  // …and back again without leaving the note behind.
  await page.getByRole('button', { name: 'Book a customer instead' }).click();
  await expect(page.locator('#b-phone')).toBeVisible();
  await expect(page.locator('#b-notes')).toHaveValue('');
  await page.getByRole('button', { name: 'Block this slot' }).click();

  await page.getByRole('button', { name: 'Block slot', exact: true }).click();
  await page.waitForURL(/\/bookings$/);

  const [row] = await query<{ name: string; phone: string; isSystem: boolean; notes: string }>(
    `select c.name, c.phone, c."isSystem", b.notes from "Booking" b join "Customer" c on c.id = b."customerId" where c."isSystem"`,
  );
  expect(row).toEqual({ name: 'Blocked', phone: '', isSystem: true, notes: 'Blocked slot' });

  // On the calendar it reads "Blocked"; in the customers list it does not exist.
  await page.locator('#bookings-date').fill(date);
  const block = page.locator('.cal-block--blocked');
  await expect(block).toContainText('Blocked');
  await page.goto(`/shops/${E2E.shop.slug}/customers`);
  await expect(page.getByRole('heading', { name: 'Customers' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Blocked' })).toHaveCount(0);

  // Customers cannot book the blocked time.
  await publicTimes(page);
  await expect(page.getByRole('button', { name: '10:00', exact: true })).toHaveCount(0);

  // Unblocking frees it.
  await page.goto(`/shops/${E2E.shop.slug}/bookings?date=${date}`);
  await page.locator('.cal-block--blocked').click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: 'Blocked' })).toBeVisible();
  // There is no customer page behind a blocked slot.
  await expect(dialog.getByRole('link', { name: 'Blocked' })).toHaveCount(0);
  await dialog.getByRole('button', { name: 'Unblock slot' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('.cal-block--blocked')).toHaveCount(0);

  await publicTimes(page);
  await expect(page.getByRole('button', { name: '10:00', exact: true })).toBeVisible();
});
