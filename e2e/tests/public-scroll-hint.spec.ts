import { test, expect } from '@playwright/test';
import { E2E } from '../support/env';
import { pickServiceAndProvider } from '../support/booking';
import { addDays, athensDate } from '../support/dates';

// The public page's Back / Continue bar is stuck to the bottom of the window.
// When the step continues underneath it, a small "Scroll for more" hint sits
// above the bar until the bottom is reached.

test('a hint above the footer says when the step continues below, and goes at the bottom', async ({ page, context }) => {
  await context.addCookies([{ name: 'lang', value: 'en', url: E2E.webUrl }]);
  await page.setViewportSize({ width: 1280, height: 320 });
  await page.goto(`/${E2E.shop.slug}`);
  await expect(page.getByRole('heading', { name: 'Choose a service' })).toBeVisible();

  const hint = page.getByRole('button', { name: 'Scroll for more' });
  await expect(hint).toBeVisible();
  // It sits just above the footer bar, inside the window.
  await expect(hint).toBeInViewport();
  await expect(page.locator('.booking-card__foot')).toBeInViewport();

  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect(hint).toHaveCount(0);

  // A window tall enough for the whole step needs no hint.
  await page.setViewportSize({ width: 1280, height: 2400 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(hint).toHaveCount(0);
});

test('the last step is confirmed only after it has been scrolled to the bottom', async ({ page, context }) => {
  await context.addCookies([{ name: 'lang', value: 'en', url: E2E.webUrl }]);
  await page.setViewportSize({ width: 1280, height: 420 });
  await page.goto(`/${E2E.shop.slug}`);
  await pickServiceAndProvider(page);
  await page.locator('#booking-date').evaluate((el, v) => {
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
    set.call(el, v);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, addDays(athensDate(), 37));
  await page.getByRole('button', { name: '12:00', exact: true }).click();
  await page.getByRole('button', { name: /continue/i }).click();

  await page.locator('#b-name').fill('Scroll Tester');
  await page.locator('#b-phone').fill('6900000999');
  await page.evaluate(() => window.scrollTo(0, 0));
  const confirm = page.getByRole('button', { name: /confirm booking/i });
  await expect(confirm).toBeDisabled();

  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect(confirm).toBeEnabled();
  // Scrolling back up does not take it away again.
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(confirm).toBeEnabled();
});

test('360px: the hint fits and a tap scrolls down', async ({ page, context }) => {
  await context.addCookies([{ name: 'lang', value: 'en', url: E2E.webUrl }]);
  await page.setViewportSize({ width: 360, height: 320 });
  await page.goto(`/${E2E.shop.slug}`);
  const hint = page.getByRole('button', { name: 'Scroll for more' });
  await expect(hint).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
  await hint.click();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
});
