import { test, expect, type Page } from '@playwright/test';
import { E2E } from '../support/env';
import { waitForLanding } from '../support/auth';

/** The Help page: reached from the sidebar, one topic open at a time, topics linkable. */

async function login(page: Page, theme: 'light' | 'dark' = 'light') {
  await page.context().addCookies([
    { name: 'lang', value: 'en', url: E2E.webUrl },
    { name: 'theme', value: theme, url: E2E.webUrl },
  ]);
  await page.goto('/login');
  await page.locator('#email').fill(E2E.owner.email);
  await page.locator('#password').fill(E2E.owner.password);
  await page.locator('button[type=submit]').click();
  await waitForLanding(page);
  await page.locator('.app-shell').waitFor();
}

const topic = (page: Page, name: string) => page.getByRole('button', { name, exact: true });

test('sidebar opens Help; one topic is open at a time', async ({ page }) => {
  await login(page);
  await page.locator('aside.sidebar').getByRole('link', { name: 'Help', exact: true }).click();
  await expect(page).toHaveURL(/\/help$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Help' })).toBeVisible();

  // The first topic starts open.
  await expect(topic(page, 'Getting started')).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByText('Set when you work.')).toBeVisible();

  // Keyboard path: Enter opens another topic and closes the first.
  await topic(page, 'Bookings').focus();
  await page.keyboard.press('Enter');
  await expect(topic(page, 'Bookings')).toHaveAttribute('aria-expanded', 'true');
  await expect(topic(page, 'Getting started')).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByText('Set when you work.')).toHaveCount(0);
  // The address now links to the open topic.
  await expect(page).toHaveURL(/\/help#bookings$/);

  // Space closes it again.
  await page.keyboard.press(' ');
  await expect(topic(page, 'Bookings')).toHaveAttribute('aria-expanded', 'false');
});

test('a link to a topic opens that topic; Contact leads to the contact page', async ({ page }) => {
  await login(page);
  await page.goto('/help#team-roles');
  await expect(topic(page, /^Team and roles/)).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByText('Has every permission.')).toBeVisible();
  await expect(topic(page, 'Getting started')).toHaveAttribute('aria-expanded', 'false');

  await topic(page, 'Contact').click();
  await page.getByRole('link', { name: 'Contact us' }).click();
  await expect(page).toHaveURL(/\/contact$/);
});

for (const theme of ['light', 'dark'] as const) {
  test(`360px, ${theme}: every topic open fits with no horizontal scroll`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await login(page, theme);
    await page.goto('/help');
    for (const id of ['getting-started', 'bookings', 'team-roles', 'customers', 'products', 'plans', 'public-page', 'contact']) {
      await page.goto(`/help#${id}`);
      await expect(page.locator(`#${id} [role=button]`)).toHaveAttribute('aria-expanded', 'true');
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, id).toBeLessThanOrEqual(0);
    }
    await page.goto('/help#team-roles');
    await page.screenshot({ path: testInfo.outputPath(`help-360-${theme}.png`), fullPage: true });
  });
}
