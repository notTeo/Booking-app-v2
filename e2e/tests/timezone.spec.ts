import { test, expect, type Page } from '@playwright/test';
import { E2E } from '../support/env';
import { latestBookingStart } from '../support/db';
import { addDays, athensDate, athensWallClockToUtc, testDates } from '../support/dates';
import { pickServiceAndProvider } from '../support/booking';

/**
 * The public booking page must work in the SHOP's timezone (Europe/Athens)
 * no matter where the visitor's browser is. The API runs with TZ=UTC (like
 * Railway). For each browser timezone we book "10:00" and assert the exact
 * UTC instant stored in the database against an independent Intl oracle.
 */

const dates = testDates();

const CASES = [
  { browserTz: 'America/New_York', kind: 'winter', date: dates.winter },
  { browserTz: 'Pacific/Auckland', kind: 'dstStart', date: dates.dstStart },
  { browserTz: 'UTC', kind: 'dstEnd', date: dates.dstEnd },
  { browserTz: 'Asia/Tokyo', kind: 'summer', date: dates.summer },
] as const;

async function pickDate(page: Page, date: string) {
  await page.locator('#booking-date').evaluate((el, v) => {
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
    set.call(el, v);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, date);
}

async function startPublicBooking(page: Page, date: string) {
  await page.context().addCookies([{ name: 'lang', value: 'en', url: E2E.webUrl }]);
  await page.goto(`/${E2E.shop.slug}`);
  await pickServiceAndProvider(page);
  await expect(page.locator('#booking-date')).toBeVisible();
  // Wait for THIS date's slots: the grid shows the default date's until they
  // arrive, and reading it before then asserts against the wrong day.
  const slotsLoaded = page.waitForResponse(
    (r) => r.url().includes('/slots') && r.url().includes(`date=${date}`) && r.ok(),
  );
  await pickDate(page, date);
  await slotsLoaded;
  // 10:00 is open on every date the suite uses, so it marks the new grid.
  await expect(page.getByRole('button', { name: '10:00', exact: true })).toBeVisible();
}

for (const c of CASES) {
  test.describe(`browser in ${c.browserTz}`, () => {
    test.use({
      timezoneId: c.browserTz,
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });

    test(`books 10:00 shop time on ${c.kind} (${c.date})`, async ({ page }) => {
      // Sanity: the browser really is in a different zone than the shop.
      expect(await page.evaluate(() => Intl.DateTimeFormat().resolvedOptions().timeZone)).toBe(
        c.browserTz,
      );

      await startPublicBooking(page, c.date);

      // The date picker follows the SHOP's calendar, capped by maxAdvanceDays.
      await expect(page.locator('#booking-date')).toHaveAttribute('min', athensDate());
      await expect(page.locator('#booking-date')).toHaveAttribute('max', addDays(athensDate(), 730));

      // Retrying assertions: they wait for the grid to settle on this date.
      const slot = (time: string) => page.getByRole('button', { name: time, exact: true });
      if (c.kind === 'dstStart') {
        // 03:00–03:59 does not exist in Athens on the spring-forward day.
        await expect(slot('03:00')).toHaveCount(0);
        await expect(slot('03:30')).toHaveCount(0);
      }
      if (c.kind === 'dstEnd') {
        // The repeated hour is offered once, not twice.
        await expect(slot('03:00')).toHaveCount(1);
        await expect(slot('03:30')).toHaveCount(1);
      }
      const labels = await page.getByRole('button', { pressed: false }).allTextContents();
      expect(new Set(labels).size).toBe(labels.length); // no duplicate slots

      await page.getByRole('button', { name: '10:00', exact: true }).click();
      await page.getByRole('button', { name: /continue|συνέχεια/i }).click();
      await page.locator('#b-name').fill('E2E Tester');
      await page.locator('#b-phone').fill(`69${String(Date.now()).slice(-8)}`);
      await page.getByRole('button', { name: /confirm booking/i }).click();
      await expect(page.locator('.booking-card__body .card--center')).toBeVisible();

      expect(await latestBookingStart()).toBe(athensWallClockToUtc(c.date, '10:00').toISOString());
    });
  });
}
