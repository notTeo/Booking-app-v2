import { test, expect, type Page } from '@playwright/test';
import { E2E } from '../support/env';
import { query } from '../support/db';
import { addDays, athensDate } from '../support/dates';
import { confirmBooking, pickServiceAndProvider } from '../support/booking';

/**
 * The shop knows a returning customer by the browser they booked from (a
 * cookie), not by the phone they type: their next booking is filled in and
 * goes on their record. Anyone else booking from that browser ("Change") is a
 * new customer, even with the same phone. Nothing is kept in the browser's own
 * storage any more.
 */

// A day no other spec books on.
const date = addDays(athensDate(), 14);
const PHONE = '+306900007777';

const customers = () =>
  query<{ name: string; bookings: string }>(
    `select c.name, count(b.id) as bookings from "Customer" c left join "Booking" b on b."customerId" = c.id
     where c.phone = $1 group by c.id order by c."createdAt"`,
    [PHONE],
  );

async function goToDetailsStep(page: Page, time: string) {
  await pickServiceAndProvider(page);
  await page.locator('#booking-date').fill(date);
  await page.getByRole('button', { name: time, exact: true }).click();
  await page.getByRole('button', { name: /continue/i }).click();
}

const confirm = async (page: Page) => {
  await confirmBooking(page);
  await expect(page.getByRole('heading', { name: /confirmed/i })).toBeVisible();
};

test.afterAll(async () => {
  await query(`delete from "Customer" where phone = $1`, [PHONE]);
});

test('the browser a customer booked from is them the next time, and "Change" books as someone else', async ({
  page,
  context,
}) => {
  await context.addCookies([{ name: 'lang', value: 'en', url: E2E.webUrl }]);
  // What an earlier version of the page kept in this browser is removed.
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('seeded')) {
      localStorage.setItem('booking-details', JSON.stringify({ name: 'Old', phone: '1', email: '', savedAt: Date.now() }));
      sessionStorage.setItem('seeded', '1');
    }
  });

  // First visit: nobody yet, an empty form.
  await page.goto(`/${E2E.shop.slug}`);
  await expect(page.getByText(/Booking as/)).toHaveCount(0);
  await goToDetailsStep(page, '10:00');
  await expect(page.locator('#b-name')).toHaveValue('');
  expect(await page.evaluate(() => localStorage.getItem('booking-details'))).toBeNull();
  await expect(page.getByRole('checkbox', { name: /remember/i })).toHaveCount(0);
  await page.locator('#b-name').fill('Remember Tester');
  await page.locator('#b-phone').fill('6900007777');
  await page.locator('#b-email').fill('remember@example.com');
  await page.locator('#b-notes').fill('Window seat');
  await confirm(page);

  // Next visit: recognised, and filled in from what the shop has. Notes are per booking.
  await page.goto(`/${E2E.shop.slug}`);
  await expect(page.getByText('Booking as Remember Tester')).toBeVisible();
  await goToDetailsStep(page, '11:00');
  await expect(page.locator('#b-name')).toHaveValue('Remember Tester');
  await expect(page.locator('#b-phone')).toHaveValue('690 000 7777');
  await expect(page.locator('#b-email')).toHaveValue('remember@example.com');
  await expect(page.locator('#b-notes')).toHaveValue('');
  await confirm(page);
  expect(await customers()).toEqual([{ name: 'Remember Tester', bookings: '2' }]);

  // Someone else at the same browser: an empty form, and a customer of their
  // own even with the same phone number.
  await page.goto(`/${E2E.shop.slug}`);
  await page.getByRole('button', { name: 'Change' }).click();
  await expect(page.getByText(/Booking as/)).toHaveCount(0);
  await goToDetailsStep(page, '12:00');
  await expect(page.locator('#b-name')).toHaveValue('');
  await expect(page.locator('#b-phone')).toHaveValue('');
  await page.locator('#b-name').fill('Other Person');
  await page.locator('#b-phone').fill('6900007777');
  await confirm(page);
  expect(await customers()).toEqual([
    { name: 'Remember Tester', bookings: '2' },
    { name: 'Other Person', bookings: '1' },
  ]);

  // The browser is still who it was.
  await page.goto(`/${E2E.shop.slug}`);
  await expect(page.getByText('Booking as Remember Tester')).toBeVisible();
});
