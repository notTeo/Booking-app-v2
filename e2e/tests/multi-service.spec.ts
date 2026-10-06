import { test, expect, type Page } from '@playwright/test';
import { E2E } from '../support/env';
import { waitForLanding } from '../support/auth';
import { query } from '../support/db';
import { addDays, athensDate } from '../support/dates';

/**
 * A booking can have several services, done one after another by the same
 * provider: the times add up, the price is their sum, and every service shows
 * on the confirmation and on the booking.
 */
const DATE = addDays(athensDate(), 44);
const CUSTOMER = 'E2E Combo';

test.beforeAll(async () => {
  await query(`insert into "Service"(id,"shopId",name,duration,price,"updatedAt") values ('sv-beard','s1','Beard trim',20,1000,now()) on conflict (id) do nothing`);
  await query(`insert into "StaffService"(id,"userShopId","serviceId") values ('ss-beard','us1','sv-beard') on conflict (id) do nothing`);
});

test.afterEach(async () => {
  await query(`delete from "Booking" where "customerId" in (select id from "Customer" where name = $1)`, [CUSTOMER]);
  await query(`delete from "Customer" where name = $1`, [CUSTOMER]);
});

test.afterAll(async () => {
  await query(`delete from "StaffService" where id = 'ss-beard'`);
  await query(`delete from "Service" where id = 'sv-beard'`);
});

const pickDate = (page: Page, date: string) =>
  page.locator('#booking-date').evaluate((el, v) => {
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
    set.call(el, v);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, date);

const signIn = async (page: Page) => {
  await page.goto('/login');
  await page.locator('#email').fill(E2E.owner.email);
  await page.locator('#password').fill(E2E.owner.password);
  await page.locator('button[type=submit]').click();
  await waitForLanding(page);
};

test('a customer books two services on the public page: times and prices add up', async ({ page }) => {
  await page.context().addCookies([{ name: 'lang', value: 'en', url: E2E.webUrl }]);
  await page.goto(`/${E2E.shop.slug}`);

  // Step 1 of 4, with nothing to continue with until a service is picked.
  await expect(page.getByText('Step 1 of 4')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Choose a service' })).toBeVisible();
  const next = page.getByRole('button', { name: 'Choose a service to continue' });
  await expect(next).toBeDisabled();

  const group = page.getByRole('group', { name: 'Service', exact: true });
  await group.getByRole('checkbox', { name: /Haircut/ }).click();
  await group.getByRole('checkbox', { name: /Beard trim/ }).click();
  await expect(group.getByRole('checkbox', { checked: true })).toHaveCount(2);
  // 30 + 20 minutes, €15.00 + €10.00.
  await expect(page.getByText('2 services · 50m · €25.00')).toBeVisible();
  await page.getByRole('button', { name: /^continue/i }).click();

  await expect(page.getByText('Step 2 of 4')).toBeVisible();
  await expect(page.getByText('Haircut + Beard trim')).toBeVisible();
  await page.getByRole('radiogroup').getByRole('radio').first().click();

  await pickDate(page, DATE);
  // One 50-minute block: 22:30 + 50 minutes does not fit before closing at 23:30... the last start is 22:30.
  await expect(page.getByRole('button', { name: '23:00', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: '14:00', exact: true }).click();
  await page.getByRole('button', { name: /^continue/i }).click();
  await page.locator('#b-name').fill(CUSTOMER);
  await page.locator('#b-phone').fill('6900000452');
  await page.getByRole('button', { name: /confirm booking/i }).click();

  const card = page.locator('.booking-card__body .card--center');
  await expect(card).toBeVisible();
  await expect(card.getByText(/Haircut \+ Beard trim/)).toBeVisible();

  const rows = await query<{ minutes: number; names: string; lines: number }>(
    `select extract(epoch from (b."endTime" - b."startTime")) / 60 as minutes,
            (select string_agg(bs.name, ' + ' order by bs.position) from "BookingService" bs where bs."bookingId" = b.id) as names,
            (select count(*)::int from "BookingService" bs where bs."bookingId" = b.id) as lines
     from "Booking" b join "Customer" c on c.id = b."customerId" where c.name = $1`,
    [CUSTOMER],
  );
  expect(rows).toHaveLength(1);
  expect(Number(rows[0].minutes)).toBe(50);
  expect(rows[0].names).toBe('Haircut + Beard trim');
  expect(rows[0].lines).toBe(2);

  // The owner sees both services, each with its price, on the calendar and the booking.
  await signIn(page);
  await page.goto(`/shops/${E2E.shop.slug}/bookings?date=${DATE}`);
  const block = page.locator('.cal-block').filter({ hasText: CUSTOMER });
  await expect(block).toContainText('Haircut + Beard trim');
  await block.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText('Haircut')).toBeVisible();
  await expect(dialog.getByText('Beard trim')).toBeVisible();
  await expect(dialog.getByText('€10.00', { exact: true })).toBeVisible();
});

test('the staff wizard books several services too', async ({ page }) => {
  await page.context().addCookies([{ name: 'lang', value: 'en', url: E2E.webUrl }]);
  await signIn(page);
  await page.goto(`/shops/${E2E.shop.slug}/bookings/new`);
  const group = page.getByRole('group', { name: 'Service', exact: true });
  await group.getByRole('checkbox', { name: /Haircut/ }).click();
  await group.getByRole('checkbox', { name: /Beard trim/ }).click();
  await page.getByRole('button', { name: /^continue/i }).click();
  await page.getByRole('radiogroup').getByRole('radio').first().click();
  await pickDate(page, DATE);
  await page.getByRole('button', { name: '16:00', exact: true }).click();
  await page.getByRole('button', { name: /continue/i }).click();
  await page.locator('#b-name').fill(CUSTOMER);
  await page.locator('#b-phone').fill('6900000453');
  await page.locator('.public-wizard-actions').getByRole('button').last().click();

  await expect
    .poll(async () =>
      Number(
        (await query(
          `select count(*)::int as n from "BookingService" bs join "Booking" b on b.id = bs."bookingId" join "Customer" c on c.id = b."customerId" where c.name = $1`,
          [CUSTOMER],
        ))[0].n,
      ),
    )
    .toBe(2);
});
