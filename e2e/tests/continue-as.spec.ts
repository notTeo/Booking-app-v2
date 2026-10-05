import { test, expect, type Page } from '@playwright/test';
import { E2E } from '../support/env';
import { waitForLanding } from '../support/auth';
import { query } from '../support/db';
import { addDays, athensDate } from '../support/dates';

/**
 * A returning customer's own duration for a service decides which times they
 * are offered. On the public page they are recognised from details saved in
 * their browser ("Continue as …?") or a phone they choose to enter; in the
 * shop's wizard the owner picks them on the first step.
 *
 * The shop is open until 23:30, so a 30-minute service ends with a 23:00 slot
 * and the customer's 60-minute version of it with 22:30.
 */
const PHONE = '6900008811';
// Days no other spec books on; the first test books on `date`, so its second
// half looks at the day after.
const date = addDays(athensDate(), 20);
const nextDate = addDays(athensDate(), 21);

test.beforeAll(async () => {
  await query(
    `insert into "Service"(id,"shopId",name,duration,price,"updatedAt")
     values ('sv-ident','s1','Identity Service',30,1000,now()) on conflict (id) do nothing`,
  );
  await query(
    `insert into "StaffService"(id,"userShopId","serviceId") values ('ss-ident','us1','sv-ident') on conflict (id) do nothing`,
  );
  await query(
    `insert into "Customer"(id,"shopId",name,phone,"updatedAt")
     values ('cust-ident','s1','Ida Returning',$1,now()) on conflict (id) do nothing`,
    [PHONE],
  );
  await query(
    `insert into "CustomerServiceDuration"(id,"customerId","serviceId",duration,"updatedAt")
     values ('csd-ident','cust-ident','sv-ident',60,now()) on conflict (id) do nothing`,
  );
});

test.afterAll(async () => {
  await query(`delete from "Booking" where "serviceId" = 'sv-ident'`);
  await query(`delete from "Customer" where id = 'cust-ident'`);
  await query(`delete from "Service" where id = 'sv-ident'`);
});

const saveDetails = (page: Page) =>
  page.addInitScript(
    ([phone]) => {
      if (!sessionStorage.getItem('seeded')) {
        localStorage.setItem(
          'booking-details',
          JSON.stringify({ name: 'Ida Returning', phone, email: '', savedAt: Date.now() }),
        );
        sessionStorage.setItem('seeded', '1');
      }
    },
    [PHONE],
  );

async function pickServiceAndDate(page: Page, day = date) {
  await page.getByRole('radio', { name: /Identity Service/ }).click();
  // The public page shows the service's standard duration.
  await expect(page.getByText('Service: Identity Service (30m)')).toBeVisible();
  await page.getByRole('radiogroup').getByRole('radio').first().click();
  await page.locator('#booking-date').fill(day);
  await expect(page.getByRole('button', { name: '22:30', exact: true })).toBeVisible();
}

const lastStandardSlot = (page: Page) => page.getByRole('button', { name: '23:00', exact: true });

test.beforeEach(async ({ context }) => {
  await context.addCookies([{ name: 'lang', value: 'en', url: E2E.webUrl }]);
});

test('saved details: "yes" offers their own times, "no" the standard ones', async ({ page }) => {
  await saveDetails(page);
  await page.goto(`/${E2E.shop.slug}`);

  // The question comes before anything else.
  await expect(page.getByText('Continue as Ida Returning?')).toBeVisible();
  await expect(page.getByRole('radiogroup')).toHaveCount(0);

  await page.getByRole('button', { name: 'Yes, continue' }).click();
  await expect(page.getByText('Booking as Ida Returning')).toBeVisible();
  await pickServiceAndDate(page);
  await expect(lastStandardSlot(page)).toHaveCount(0);

  // The booking itself runs the customer's 60 minutes.
  await page.getByRole('button', { name: '22:30', exact: true }).click();
  await page.getByRole('button', { name: /continue/i }).click();
  await expect(page.locator('#b-phone')).toHaveValue(PHONE);
  await page.locator('.public-wizard-actions').getByRole('button').last().click();
  await expect(page.getByRole('heading', { name: /confirmed/i })).toBeVisible();
  const [booking] = await query<{ minutes: number }>(
    `select extract(epoch from ("endTime" - "startTime")) / 60 as minutes from "Booking" where "serviceId" = 'sv-ident'`,
  );
  expect(Number(booking.minutes)).toBe(60);

  // Same browser, someone else booking: standard times and an empty form.
  await page.goto(`/${E2E.shop.slug}`);
  await page.getByRole('button', { name: 'No, someone else' }).click();
  await pickServiceAndDate(page, nextDate);
  await expect(lastStandardSlot(page)).toBeVisible();
  await lastStandardSlot(page).click();
  await page.getByRole('button', { name: /continue/i }).click();
  await expect(page.locator('#b-name')).toHaveValue('');
  await expect(page.locator('#b-phone')).toHaveValue('');
});

test('nothing saved: the phone is optional, and entering it offers their own times', async ({ page }) => {
  await page.goto(`/${E2E.shop.slug}`);
  // Services are offered straight away.
  await expect(page.getByRole('radio', { name: /Identity Service/ })).toBeVisible();

  await page.getByRole('button', { name: /Booked with us before/ }).click();
  const use = page.getByRole('button', { name: 'Use this number' });
  await page.getByLabel('Your phone').fill('12');
  await expect(use).toBeDisabled();
  await page.getByLabel('Your phone').fill(PHONE);
  await use.click();
  await expect(page.getByText(`Booking as ${PHONE}`)).toBeVisible();

  await pickServiceAndDate(page, nextDate);
  await expect(lastStandardSlot(page)).toHaveCount(0);
});

test('shop wizard: picking the customer first shows their duration and times', async ({ page }) => {
  await page.goto('/login');
  await page.locator('#email').fill(E2E.owner.email);
  await page.locator('#password').fill(E2E.owner.password);
  await page.locator('button[type=submit]').click();
  await waitForLanding(page);
  await page.goto(`/shops/${E2E.shop.slug}/bookings/new`);

  await page.getByLabel('Customer').fill('Ida');
  await page.getByRole('button', { name: /Ida Returning/ }).click();
  await expect(page.getByText('Booking for Ida Returning')).toBeVisible();

  const service = page.getByRole('radio', { name: /Identity Service/ });
  await expect(service).toContainText('1h');
  await expect(service).toContainText('Custom duration');
  await service.click();
  await page.getByRole('radiogroup').getByRole('radio').first().click();
  // The steps after it keep showing the service with the customer's duration.
  await expect(page.getByText('Service: Identity Service (1h)')).toBeVisible();
  await page.locator('#booking-date').fill(nextDate);
  await expect(page.getByRole('button', { name: '21:30', exact: true })).toBeVisible();
  // In-hours 23:00 no longer fits a 60-minute booking.
  await expect(page.getByRole('button', { name: '23:00', exact: true })).toHaveCount(0);

  await page.getByRole('button', { name: '21:30', exact: true }).click();
  await page.getByRole('button', { name: /continue/i }).click();
  await expect(page.locator('#b-phone')).toHaveValue(PHONE);
  await expect(page.locator('#b-name')).toHaveValue('Ida Returning');
});
