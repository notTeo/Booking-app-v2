import { test, expect, type Page } from '@playwright/test';
import { join } from 'path';
import { E2E } from '../support/env';
import { waitForLanding } from '../support/auth';
import { query } from '../support/db';
import { pickService } from '../support/booking';

/**
 * Photos: the owner adds a photo for a team member (zoom, move, crop in the
 * editor) and for the shop. The member's shows in the public provider picker,
 * the shop's on the booking page and in the settings preview. Both can be
 * adjusted again, replaced and removed; without a photo the initial is back.
 */
const PHOTO = join(__dirname, '../fixtures/photo.jpg');
const memberUrl = `/shops/${E2E.shop.slug}/team/us1`;

const noHorizontalScroll = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);

const signIn = async (page: Page, theme: 'light' | 'dark' = 'light') => {
  await page.context().addCookies([
    { name: 'lang', value: 'en', url: E2E.webUrl },
    { name: 'theme', value: theme, url: E2E.webUrl },
  ]);
  await page.goto('/login');
  await page.locator('#email').fill(E2E.owner.email);
  await page.locator('#password').fill(E2E.owner.password);
  await page.locator('button[type=submit]').click();
  await waitForLanding(page);
};

const loaded = (img: ReturnType<Page['locator']>) =>
  expect.poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0));

test.afterEach(async () => {
  await query(
    `update "UserShop" set "photoUrl" = null, "photoOriginalUrl" = null, "photoCrop" = null where id = 'us1'`,
  );
  await query(`update "Shop" set "photoUrl" = null, "photoOriginalUrl" = null, "photoCrop" = null`);
});

test('a team member photo is edited, shown to customers, adjusted and removed', async ({ page }) => {
  await signIn(page);
  await page.goto(memberUrl);

  const card = page.locator('.team-member-card');
  await expect(card.locator('.avatar img')).toHaveCount(0);
  await expect(card.locator('.avatar')).toHaveText('E');

  // Only JPEG, PNG and WebP are accepted, before anything is uploaded.
  await card.locator('input[type=file]').setInputFiles({
    name: 'notes.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('not a photo'),
  });
  await expect(card.getByText('The photo must be a JPEG, PNG or WebP image.')).toBeVisible();

  await card.locator('input[type=file]').setInputFiles(PHOTO);
  const editor = page.getByRole('dialog', { name: 'Edit photo' });
  await expect(editor).toBeVisible();
  await expect(editor.locator('.photo-editor__area')).toBeVisible();
  await editor.getByLabel('Zoom').fill('2');
  await editor.getByRole('button', { name: 'Save' }).click();
  await expect(editor).toBeHidden();

  await expect(card.locator('.avatar img')).toBeVisible();
  await loaded(card.locator('.avatar img'));
  const saved = await query(`select "photoUrl", "photoOriginalUrl", "photoCrop" from "UserShop" where id = 'us1'`);
  expect(saved[0].photoUrl).toMatch(/^\/media\/shops\/s1\/member-/);
  expect(saved[0].photoOriginalUrl).toMatch(/^\/media\/shops\/s1\/member-original-/);
  // Zoomed in: less than the whole photo is kept.
  expect(saved[0].photoCrop.width).toBeLessThan(0.9);

  // The provider picker on the public page shows it.
  await page.goto(`/${E2E.shop.slug}`);
  await pickService(page);
  const pickerImg = page.locator('.staff-card .avatar img');
  await expect(pickerImg).toBeVisible();
  await loaded(pickerImg);

  // It can be adjusted again, from the original rather than the cut-out.
  await page.goto(memberUrl);
  await card.getByRole('button', { name: 'Adjust' }).click();
  await expect(editor).toBeVisible();
  await expect(editor.getByLabel('Zoom')).toBeVisible();
  await editor.getByRole('button', { name: 'Cancel' }).click();
  await expect(editor).toBeHidden();

  // Replacing swaps the files; removing brings the initial back.
  await card.locator('input[type=file]').setInputFiles(PHOTO);
  await editor.getByRole('button', { name: 'Save' }).click();
  await expect(editor).toBeHidden();
  const replaced = await query(`select "photoUrl" from "UserShop" where id = 'us1'`);
  expect(replaced[0].photoUrl).not.toBe(saved[0].photoUrl);

  await card.getByRole('button', { name: 'Remove' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Remove' }).click();
  await expect(card.locator('.avatar img')).toHaveCount(0);
  await expect(card.locator('.avatar')).toHaveText('E');
  const removed = await query(`select "photoUrl", "photoOriginalUrl" from "UserShop" where id = 'us1'`);
  expect(removed[0]).toEqual({ photoUrl: null, photoOriginalUrl: null });
});

test('the shop photo is added in settings, previewed there and shown on the booking page', async ({ page }) => {
  await signIn(page);
  await page.goto(`/shops/${E2E.shop.slug}/settings`);

  const card = page.locator('.card', { has: page.getByRole('heading', { name: 'Shop photo' }) });
  await expect(card.getByText('No photo added')).toBeVisible();
  await card.locator('input[type=file]').setInputFiles(PHOTO);
  const editor = page.getByRole('dialog', { name: 'Edit photo' });
  await editor.getByRole('button', { name: 'Save' }).click();
  await expect(editor).toBeHidden();
  await expect(card.locator('.cover img')).toBeVisible();

  // The "Booking page look" preview now has it.
  const preview = page.frameLocator('iframe[title="Preview"]');
  await expect(preview.locator('.booking-card__head .cover img')).toBeVisible();

  await page.goto(`/${E2E.shop.slug}`);
  await expect(page.locator('.booking-card__head .cover img')).toBeVisible();
  await loaded(page.locator('.booking-card__head .cover img'));

  await page.goto(`/shops/${E2E.shop.slug}/settings`);
  await card.getByRole('button', { name: 'Remove' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Remove' }).click();
  await expect(card.getByText('No photo added')).toBeVisible();
  await page.goto(`/${E2E.shop.slug}`);
  await expect(page.locator('.booking-card__head .cover')).toHaveCount(0);
});

for (const theme of ['light', 'dark'] as const) {
  test(`the editor fits a 360px phone (${theme})`, async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await signIn(page, theme);
    await page.goto(memberUrl);
    expect(await noHorizontalScroll(page)).toBe(true);

    await page.locator('.team-member-card input[type=file]').setInputFiles(PHOTO);
    const editor = page.getByRole('dialog', { name: 'Edit photo' });
    await expect(editor.locator('.photo-editor__area')).toBeVisible();
    expect(await noHorizontalScroll(page)).toBe(true);
    const box = await editor.boundingBox();
    expect(box!.width).toBeLessThanOrEqual(360);
    await expect(editor.getByRole('button', { name: 'Save' })).toBeInViewport();
  });
}
