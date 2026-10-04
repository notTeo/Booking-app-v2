import { test, expect, type Page } from '@playwright/test';
import { E2E } from '../support/env';
import { waitForLanding } from '../support/auth';
import { query } from '../support/db';
import { addDays, athensDate, athensWallClockToUtc } from '../support/dates';

/**
 * Changing a booking's status must never fail silently: the detail panel shows
 * why. Re-opening a canceled booking whose slot was taken meanwhile is a 409.
 */
const date = addDays(athensDate(), 6);
const at = (hhmm: string) => athensWallClockToUtc(date, hhmm).toISOString();

test.beforeAll(async () => {
  await query(
    `insert into "Customer"(id,"shopId",name,phone,"updatedAt") values
       ('cust-st1','s1','Reopen Me','6900001111',now()),
       ('cust-st2','s1','Slot Taker','6900002222',now()) on conflict (id) do nothing`,
  );
  await query(
    `insert into "Booking"(id,"shopId","customerId","serviceId","staffId","startTime","endTime",status,"updatedAt") values
       ('bk-st1','s1','cust-st1','sv1','us1',$1,$2,'CANCELED',now()),
       ('bk-st2','s1','cust-st2','sv1','us1',$3,$4,'CONFIRMED',now())
     on conflict (id) do nothing`,
    [at('10:00'), at('10:30'), at('10:20'), at('10:50')],
  );
});

test.afterAll(async () => {
  await query(`delete from "Booking" where id in ('bk-st1','bk-st2')`);
  await query(`delete from "Customer" where id in ('cust-st1','cust-st2')`);
});

async function openCanceledBooking(page: Page) {
  await page.context().addCookies([{ name: 'lang', value: 'en', url: E2E.webUrl }]);
  await page.goto('/login');
  await page.locator('#email').fill(E2E.owner.email);
  await page.locator('#password').fill(E2E.owner.password);
  await page.locator('button[type=submit]').click();
  await waitForLanding(page);
  await page.goto(`/shops/${E2E.shop.slug}/bookings?date=${date}`);
  // top edge of the block: the later booking overlaps its lower half
  await page.locator('.cal-block--canceled').click({ position: { x: 8, y: 3 } });
  await expect(page.getByRole('dialog')).toContainText('Reopen Me');
}

const reopen = (page: Page) =>
  page.getByRole('dialog').getByRole('group').getByRole('button', { name: 'Confirmed' }).click();

test('reopening a canceled booking whose slot is taken explains why (409)', async ({ page }) => {
  await openCanceledBooking(page);
  await reopen(page);
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText(
    'That time is no longer free',
  );
  await expect(page.locator('.cal-block--canceled')).toHaveCount(1);
});

test('any other failure shows a generic error in the details modal', async ({ page }) => {
  await openCanceledBooking(page);
  await page.route(/\/api\/shops\/[^/]+\/bookings\/bk-st1/, (route) =>
    route.request().method() === 'PATCH'
      ? route.fulfill({ status: 500, json: { status: 'error', message: 'boom' } })
      : route.continue(),
  );
  await reopen(page);
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText(
    "Couldn't update the booking status",
  );
});
