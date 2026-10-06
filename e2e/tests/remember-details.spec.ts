import { test, expect, type Page } from '@playwright/test';
import { E2E } from '../support/env';
import { addDays, athensDate } from '../support/dates';
import { pickServiceAndProvider } from '../support/booking';

/**
 * "Remember my details on this device" is the customer's opt-in: nothing is
 * stored until they tick it and book, the next visit is prefilled, and
 * unticking removes the stored copy at once.
 */

// A day no other spec books on.
const date = addDays(athensDate(), 14);

const STORAGE_KEY = 'booking-details';
const storedDetails = (page: Page) => page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY);

async function goToDetailsStep(page: Page, time: string, returning = false) {
  await page.goto(`/${E2E.shop.slug}`);
  // With saved details the wizard first asks whether to continue as that customer.
  if (returning) await page.getByRole('button', { name: 'Yes, continue' }).click();
  await pickServiceAndProvider(page);
  await page.locator('#booking-date').fill(date);
  await page.getByRole('button', { name: time, exact: true }).click();
  await page.getByRole('button', { name: /continue/i }).click();
}

test('details are remembered only after the customer opts in, and forgotten when they untick', async ({
  page,
  context,
}) => {
  await context.addCookies([{ name: 'lang', value: 'en', url: E2E.webUrl }]);
  await goToDetailsStep(page, '10:00');

  // First visit: nothing prefilled, nothing stored, and the box is off by default.
  const remember = page.getByRole('checkbox', { name: /remember my details/i });
  // The native input is visually hidden under the drawn box, so toggle it the way a customer does: by its label.
  const rememberLabel = page.getByText(/remember my details/i);
  await expect(remember).not.toBeChecked();
  await expect(page.locator('#b-name')).toHaveValue('');
  expect(await storedDetails(page)).toBeNull();

  await page.locator('#b-name').fill('Remember Tester');
  await page.locator('#b-phone').fill('6900007777');
  await page.locator('#b-email').fill('remember@example.com');
  await page.locator('#b-notes').fill('Window seat');
  await rememberLabel.click();
  await expect(remember).toBeChecked();
  // Ticking alone stores nothing; only a completed booking does.
  expect(await storedDetails(page)).toBeNull();

  await page.locator('.booking-card__actions').getByRole('button').last().click();
  await expect(page.getByRole('heading', { name: /confirmed/i })).toBeVisible();

  // Notes are per booking and never kept.
  const stored = JSON.parse((await storedDetails(page)) ?? '{}');
  expect(stored).toMatchObject({ name: 'Remember Tester', phone: '6900007777', email: 'remember@example.com' });
  expect(stored).not.toHaveProperty('notes');

  // Next visit: prefilled, box already ticked.
  await goToDetailsStep(page, '11:00', true);
  await expect(page.locator('#b-name')).toHaveValue('Remember Tester');
  await expect(page.locator('#b-phone')).toHaveValue('6900007777');
  await expect(page.locator('#b-email')).toHaveValue('remember@example.com');
  await expect(page.locator('#b-notes')).toHaveValue('');
  await expect(remember).toBeChecked();

  // Unticking forgets at once but leaves what is typed.
  await rememberLabel.click();
  await expect(remember).not.toBeChecked();
  expect(await storedDetails(page)).toBeNull();
  await expect(page.locator('#b-name')).toHaveValue('Remember Tester');

  await goToDetailsStep(page, '11:00');
  await expect(page.locator('#b-name')).toHaveValue('');
  await expect(remember).not.toBeChecked();
});
