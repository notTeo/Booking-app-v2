import { test, expect, type Locator, type Page } from '@playwright/test';
import { E2E } from '../support/env';
import { waitForLanding } from '../support/auth';
import { query } from '../support/db';

/** Invites are merged into Team: add a member from a modal, login-invite actions on the rows. */
const TEAM = `/shops/${E2E.shop.slug}/team`;

async function login(page: Page) {
  await page.context().addCookies([{ name: 'lang', value: 'en', url: E2E.webUrl }]);
  await page.goto('/login');
  await page.locator('#email').fill(E2E.owner.email);
  await page.locator('#password').fill(E2E.owner.password);
  await page.locator('button[type=submit]').click();
  await waitForLanding(page);
}

// The switch's input sits under its track, so click the label (as member-reactivate.spec does).
const toggleSwitch = (page: Page, dialog: Locator, name: string) =>
  dialog.locator('label.switch').filter({ has: page.getByRole('switch', { name, exact: true }) }).click();

test.afterEach(async () => {
  await query(`delete from "UserShop" where name = 'Modal Member'`);
});

test('the old shop invites page is gone', async ({ page }) => {
  await login(page);
  await page.goto(`/shops/${E2E.shop.slug}/invites`);
  await expect(page.getByRole('heading', { name: 'Add Team Member' })).toHaveCount(0);
  await expect(page.locator('aside.sidebar').getByRole('link', { name: 'Invites' })).toHaveCount(0);
});

test('Add member modal creates a member without sending an email, and the row offers Send invite', async ({ page }) => {
  await login(page);
  await page.goto(TEAM);
  await page.getByRole('button', { name: 'Add Team Member' }).click();
  const dialog = page.getByRole('dialog', { name: 'Add Team Member' });
  await expect(dialog).toBeVisible();

  await dialog.getByLabel('Name').fill('Modal Member');
  await toggleSwitch(page, dialog, 'Send login invite now');
  await dialog.getByRole('button', { name: 'Add Team Member' }).click();

  await expect(dialog).toHaveCount(0);
  await expect(page.getByText('Team member created. No login invite was sent.')).toBeVisible();
  const row = page.getByRole('row').filter({ hasText: 'Modal Member' });
  await expect(row.getByText('No login yet')).toBeVisible();
  await expect(row.getByRole('button', { name: 'Send Invite' })).toBeVisible();
  await expect(row.getByRole('button', { name: 'Remove' })).toBeVisible();
});

test('choosing the owner role asks for confirmation first, and Esc closes only the top dialog', async ({ page }) => {
  await login(page);
  await page.goto(TEAM);
  await page.getByRole('button', { name: 'Add Team Member' }).click();
  const dialog = page.getByRole('dialog', { name: 'Add Team Member' });
  await dialog.getByLabel('Name').fill('Modal Member');
  await toggleSwitch(page, dialog, 'Send login invite now');
  await dialog.getByLabel('Role').selectOption('owner');
  await dialog.getByRole('button', { name: 'Add Team Member' }).click();

  const confirm = page.getByRole('alertdialog');
  await expect(confirm).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(confirm).toHaveCount(0);
  await expect(dialog).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('row').filter({ hasText: 'Modal Member' })).toHaveCount(0);
});
