import { test, expect } from '@playwright/test';
import { E2E } from '../support/env';
import { waitForLanding } from '../support/auth';
import { query } from '../support/db';
import { addDays, athensDate, athensWallClockToUtc } from '../support/dates';

/**
 * A deactivated team member has no column on the bookings calendar. One who
 * still has a booking that day keeps theirs, so the booking is not hidden.
 */
const date = addDays(athensDate(), 52);

test.beforeAll(async () => {
  await query(
    `insert into "UserShop"(id,"shopId",role,name,active,"bookableByCustomers","bookableInternally")
     values ('us-gone','s1','staff','Gone Gary',false,false,false) on conflict (id) do nothing`,
  );
});

test.afterAll(async () => {
  await query(`delete from "Booking" where id = 'bk-gone'`);
  await query(`delete from "Customer" where id = 'c-gone'`);
  await query(`delete from "UserShop" where id = 'us-gone'`);
});

test('a deactivated member has no column, unless they still have a booking that day', async ({ page }) => {
  await page.context().addCookies([{ name: 'lang', value: 'en', url: E2E.webUrl }]);
  await page.goto('/login');
  await page.locator('#email').fill(E2E.owner.email);
  await page.locator('#password').fill(E2E.owner.password);
  await page.locator('button[type=submit]').click();
  await waitForLanding(page);

  await page.goto(`/shops/${E2E.shop.slug}/bookings?date=${date}`);
  await expect(page.locator('.cal').getByText('E2E Owner').first()).toBeVisible();
  await expect(page.locator('.cal').getByText('Gone Gary')).toHaveCount(0);
  await page.getByRole('button', { name: /filters/i }).click();
  await expect(page.getByRole('dialog').getByText('Gone Gary')).toHaveCount(0);
  await page.keyboard.press('Escape');

  // With a booking that day, the column stays so the booking is not hidden.
  await query(`insert into "Customer"(id,"shopId",name,phone,"updatedAt") values ('c-gone','s1','Stays Visible','6900000999',now())`);
  await query(
    `insert into "Booking"(id,"shopId","customerId","serviceId","staffId","startTime","endTime","updatedAt")
     values ('bk-gone','s1','c-gone','sv1','us-gone',$1,$2,now())`,
    [athensWallClockToUtc(date, '11:00'), athensWallClockToUtc(date, '11:30')],
  );
  await page.reload();
  await expect(page.locator('.cal').getByText('Gone Gary').first()).toBeVisible();
  await expect(page.locator('.cal-block').filter({ hasText: 'Stays Visible' })).toBeVisible();
});
