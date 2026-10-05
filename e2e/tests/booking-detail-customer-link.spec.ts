import { test, expect } from '@playwright/test';
import { E2E } from '../support/env';
import { waitForLanding } from '../support/auth';
import { query } from '../support/db';
import { addDays, athensDate, athensWallClockToUtc } from '../support/dates';

/**
 * In the booking details opened from the calendar, the customer's name is a
 * link to their customer page.
 */
// A day no other spec books on.
const date = addDays(athensDate(), 30);

test.beforeAll(async () => {
  await query(
    `insert into "Customer"(id,"shopId",name,phone,"updatedAt")
     values ('cust-link','s1','Linked Lena','6900008821',now()) on conflict (id) do nothing`,
  );
  const start = athensWallClockToUtc(date, '10:00');
  await query(
    `insert into "Booking"(id,"shopId","customerId","serviceId","staffId","startTime","endTime","updatedAt")
     values ('bk-link','s1','cust-link','sv1','us1',$1,$2,now()) on conflict (id) do nothing`,
    [start.toISOString(), new Date(start.getTime() + 30 * 60_000).toISOString()],
  );
});

test.afterAll(async () => {
  await query(`delete from "Customer" where id = 'cust-link'`);
});

test('the name in the booking details opens the customer page', async ({ page, context }) => {
  await context.addCookies([{ name: 'lang', value: 'en', url: E2E.webUrl }]);
  await page.goto('/login');
  await page.locator('#email').fill(E2E.owner.email);
  await page.locator('#password').fill(E2E.owner.password);
  await page.locator('button[type=submit]').click();
  await waitForLanding(page);

  await page.goto(`/shops/${E2E.shop.slug}/bookings?date=${date}`);
  await page.locator('.cal-block').filter({ hasText: 'Linked Lena' }).click();
  await page.getByRole('dialog').getByRole('link', { name: 'Linked Lena' }).click();

  await expect(page).toHaveURL(new RegExp(`/shops/${E2E.shop.slug}/customers/cust-link$`));
  await expect(page.getByRole('heading', { name: 'Linked Lena' })).toBeVisible();
});
