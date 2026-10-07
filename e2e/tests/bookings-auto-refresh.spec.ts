import { test, expect } from '@playwright/test';
import { E2E } from '../support/env';
import { waitForLanding } from '../support/auth';
import { query } from '../support/db';
import { addDays, athensDate, athensWallClockToUtc } from '../support/dates';

/**
 * The open calendar picks up bookings made elsewhere (a customer on the public
 * page, a colleague) without a reload: on a timer, and the moment the window
 * is looked at again.
 */
const date = addDays(athensDate(), 9);
const at = (hhmm: string) => athensWallClockToUtc(date, hhmm).toISOString();

test.afterAll(async () => {
  await query(`delete from "Booking" where id = 'bk-auto1'`);
  await query(`delete from "Customer" where id = 'cust-auto1'`);
});

test('a booking made elsewhere appears on the open calendar without a reload', async ({ page }) => {
  await page.context().addCookies([{ name: 'lang', value: 'en', url: E2E.webUrl }]);
  await page.goto('/login');
  await page.locator('#email').fill(E2E.owner.email);
  await page.locator('#password').fill(E2E.owner.password);
  await page.locator('button[type=submit]').click();
  await waitForLanding(page);
  await page.goto(`/shops/${E2E.shop.slug}/bookings?date=${date}`);
  const block = page.locator('.cal-block', { hasText: 'Walked In Elsewhere' });
  await expect(page.locator('.cal-block')).toHaveCount(0);

  await query(
    `insert into "Customer"(id,"shopId",name,phone,"updatedAt") values ('cust-auto1','s1','Walked In Elsewhere','6900003333',now())`,
  );
  await query(
    `insert into "Booking"(id,"shopId","customerId","serviceId","staffId","startTime","endTime",status,"updatedAt")
     values ('bk-auto1','s1','cust-auto1','sv1','us1',$1,$2,'CONFIRMED',now())`,
    [at('11:00'), at('11:30')],
  );

  // Coming back to the window refreshes at once, with no loading state.
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(block).toBeVisible();
  await expect(page.locator('.spinner')).toHaveCount(0);
});
