import { test, expect, type Page } from '@playwright/test';
import { join } from 'path';
import { E2E } from '../support/env';
import { waitForLanding } from '../support/auth';
import { query } from '../support/db';
import { addDays, athensDate } from '../support/dates';
import { confirmBooking, pickServiceAndProvider } from '../support/booking';

/**
 * Customers added by hand, customer photos and the shop's public sign-up page
 * (the one its QR code opens): the owner turns both settings on, a customer
 * signs up with a photo at /<slug>/profile, the photo shows in the shop and
 * the owner removes it. Changes to a customer the shop already has wait for
 * the owner to accept them.
 */
const PHOTO = join(__dirname, '../fixtures/photo.jpg');
const PHONE = '6947770001';
const HAND_PHONE = '6947770002';
const NEW_PHONE = '6947770004';
const BOOK_PHONE = '6947770003';
// A day no other spec books on.
const bookDate = addDays(athensDate(), 23);
const profileUrl = `/${E2E.shop.slug}/profile`;

const noHorizontalScroll = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);

const loaded = (img: ReturnType<Page['locator']>) =>
  expect.poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0));

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

const enable = (page: boolean, photos: boolean) =>
  query(`update "Shop" set "customerProfilePageEnabled" = $1, "customerPhotosEnabled" = $2 where slug = $3`, [
    page,
    photos,
    E2E.shop.slug,
  ]);

const customer = async (phone: string) =>
  (await query(`select id, name, email, "photoUrl" from "Customer" where phone = $1`, [phone]))[0];

test.afterEach(async () => {
  await query(`delete from "Customer" where phone = any($1)`, [[PHONE, HAND_PHONE, BOOK_PHONE, NEW_PHONE]]);
  await enable(false, false);
});

test('the sign-up page is off until the owner turns it on, then shows its QR code', async ({ page }) => {
  await page.context().addCookies([{ name: 'lang', value: 'en', url: E2E.webUrl }]);
  await page.goto(profileUrl);
  await expect(page.getByText('This page is not available')).toBeVisible();

  await signIn(page);
  await page.goto(`/shops/${E2E.shop.slug}/settings`);
  await page.getByRole('switch', { name: 'Customers can add a profile photo' }).check({ force: true });
  await page.getByRole('switch', { name: 'Customer sign-up page' }).check({ force: true });
  await expect(page.getByText('Save your changes to show the link and the QR code.')).toBeVisible();
  await page.locator('.save-bar').getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByText('Shop updated successfully.')).toBeVisible();

  // The link has its own card; its QR button opens the code in a dialog.
  const card = page.locator('.card', { hasText: 'Customer sign-up link' });
  await expect(card.getByText(`${E2E.webUrl}${profileUrl}`)).toBeVisible();
  await card.getByRole('button', { name: 'Show QR code' }).click();
  const dialog = page.getByRole('dialog', { name: 'QR code' });
  await loaded(dialog.getByRole('img', { name: 'QR code for the customer sign-up page' }));
  await expect(dialog.getByRole('link', { name: 'Download PNG' })).toHaveAttribute(
    'download',
    `${E2E.shop.slug}-signup-qr.png`,
  );
  await dialog.getByRole('button', { name: 'Close' }).click();
  await expect(dialog).toBeHidden();

  // The layout settles a moment after the resize (the sidebar becomes a drawer).
  await page.setViewportSize({ width: 360, height: 740 });
  await expect.poll(() => noHorizontalScroll(page)).toBe(true);
});

for (const theme of ['light', 'dark'] as const) {
  test(`a customer signs up with a photo, asks for changes the owner accepts, and the owner removes the photo (${theme})`, async ({ page }) => {
    await enable(true, true);
    await page.context().addCookies([
      { name: 'lang', value: 'en', url: E2E.webUrl },
      { name: 'theme', value: theme, url: E2E.webUrl },
    ]);
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto(profileUrl);

    const save = page.getByRole('button', { name: 'Save', exact: true });
    await expect(save).toBeDisabled();
    await page.getByLabel('Name').fill('Katerina Sign-Up');
    await page.getByLabel('Phone').fill('694 777 0001');
    await expect(page.locator('button', { hasText: 'Take a photo' })).toBeVisible();
    await page.getByLabel('Choose a photo').setInputFiles(PHOTO);
    const editor = page.getByRole('dialog', { name: 'Edit photo' });
    await editor.getByRole('button', { name: 'Save' }).click();
    await expect(editor).toBeHidden();
    await loaded(page.locator('.photo-field .avatar img'));
    expect(await noHorizontalScroll(page)).toBe(true);

    await save.click();
    await expect(page.getByText('Thank you!')).toBeVisible();
    const created = await customer(PHONE);
    expect(created.name).toBe('Katerina Sign-Up');
    expect(created.photoUrl).toMatch(/^\/media\/shops\/.+\/customer-/);

    // A second visit with the same phone changes nothing by itself, and says the same.
    await page.goto(profileUrl);
    await page.getByLabel('Name').fill('Katerina Papadaki');
    await page.getByLabel('Phone').fill(PHONE);
    await page.getByLabel('Email').fill('katerina@example.com');
    await page.getByRole('button', { name: 'My phone number has changed' }).click();
    await page.getByLabel('New phone number').fill(NEW_PHONE);
    expect(await noHorizontalScroll(page)).toBe(true);
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByText('Thank you!')).toBeVisible();
    expect(await customer(PHONE)).toEqual(created);

    // The owner finds the request, sees old and new, and accepts it.
    await signIn(page, theme);
    await page.goto(`/shops/${E2E.shop.slug}/customers`);
    await page.getByRole('button', { name: 'Changes waiting (1)' }).click();
    const waiting = page.locator('tr', { hasText: 'Katerina Sign-Up' });
    await expect(waiting.getByText('Changes waiting')).toBeVisible();
    expect(await noHorizontalScroll(page)).toBe(true);
    await waiting.getByRole('link', { name: 'Katerina Sign-Up' }).click();
    const changes = page.locator('.card', { hasText: 'Changes this customer asked for' });
    await expect(changes.getByText('Katerina Papadaki')).toBeVisible();
    await expect(changes.getByText('katerina@example.com')).toBeVisible();
    await expect(changes.getByText(NEW_PHONE)).toBeVisible();
    expect(await noHorizontalScroll(page)).toBe(true);
    await changes.getByRole('button', { name: 'Accept' }).click();
    await expect(changes).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Katerina Papadaki' })).toBeVisible();
    expect(await customer(NEW_PHONE)).toMatchObject({
      id: created.id,
      name: 'Katerina Papadaki',
      email: 'katerina@example.com',
      photoUrl: created.photoUrl,
    });

    // The shop sees the photo in the list and on the customer's page.
    await page.goto(`/shops/${E2E.shop.slug}/customers`);
    const row = page.locator('tr', { hasText: 'Katerina Papadaki' });
    await loaded(row.locator('.avatar img'));
    expect(await noHorizontalScroll(page)).toBe(true);
    await row.getByRole('link', { name: 'Katerina Papadaki' }).click();

    const field = page.locator('.photo-field');
    await loaded(field.locator('.avatar img'));
    expect(await noHorizontalScroll(page)).toBe(true);
    await field.getByRole('button', { name: 'Remove' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Remove' }).click();
    await expect(field.locator('.avatar img')).toHaveCount(0);
    expect((await customer(NEW_PHONE)).photoUrl).toBeNull();
  });
}

test('the owner adds a customer by hand, and is pointed to the one a phone already belongs to', async ({ page }) => {
  await signIn(page);
  await page.goto(`/shops/${E2E.shop.slug}/customers`);

  await page.getByRole('button', { name: 'New customer' }).click();
  const dialog = page.getByRole('dialog', { name: 'New customer' });
  const add = dialog.getByRole('button', { name: 'Add customer' });
  await expect(add).toBeDisabled();
  await dialog.getByLabel('Name').fill('Walk-in Yannis');
  await dialog.getByLabel('Phone').fill('694 777 0002');
  await dialog.getByLabel('Notes').fill('Came in from the street');
  await add.click();

  // Lands on the new customer's page, where a photo can be added.
  const created = await expect.poll(() => customer(HAND_PHONE)).toBeTruthy().then(() => customer(HAND_PHONE));
  await expect(page).toHaveURL(new RegExp(`/customers/${created.id}$`));
  await expect(page.getByRole('heading', { name: 'Walk-in Yannis' })).toBeVisible();
  await expect(page.locator('button', { hasText: 'Take a photo' })).toBeVisible();

  await page.goto(`/shops/${E2E.shop.slug}/customers`);
  await page.getByRole('button', { name: 'New customer' }).click();
  await dialog.getByLabel('Name').fill('Yannis Again');
  await dialog.getByLabel('Phone').fill(HAND_PHONE);
  await add.click();
  await expect(dialog.getByText('A customer with this phone number already exists.')).toBeVisible();
  await dialog.getByRole('link', { name: 'Open their page' }).click();
  await expect(page).toHaveURL(new RegExp(`/customers/${created.id}$`));
});

test('a customer adds a photo while booking, and it shows on the booking in the calendar', async ({ page }) => {
  await enable(false, true);
  await page.context().addCookies([{ name: 'lang', value: 'en', url: E2E.webUrl }]);
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto(`/${E2E.shop.slug}`);
  await pickServiceAndProvider(page);
  await page.locator('#booking-date').fill(bookDate);
  await page.getByRole('button', { name: '10:00', exact: true }).click();
  await page.getByRole('button', { name: /continue/i }).click();

  await page.locator('#b-name').fill('Photo Fotini');
  await page.locator('#b-phone').fill(BOOK_PHONE);
  await page.getByLabel('Choose a photo').setInputFiles(PHOTO);
  const editor = page.getByRole('dialog', { name: 'Edit photo' });
  await editor.getByRole('button', { name: 'Save' }).click();
  await expect(editor).toBeHidden();
  await loaded(page.locator('.photo-field .avatar img'));
  expect(await noHorizontalScroll(page)).toBe(true);
  await confirmBooking(page);
  await expect(page.getByRole('heading', { name: /confirmed/i })).toBeVisible();
  await expect.poll(async () => (await customer(BOOK_PHONE))?.photoUrl).toMatch(/^\/media\/shops\//);

  // This browser has sent its photo: the next booking does not ask again.
  await page.getByRole('button', { name: /book another/i }).click();
  await pickServiceAndProvider(page);
  await page.locator('#booking-date').fill(bookDate);
  await page.getByRole('button', { name: '11:00', exact: true }).click();
  await page.getByRole('button', { name: /continue/i }).click();
  await expect(page.locator('#b-name')).toBeVisible();
  await expect(page.getByLabel('Choose a photo')).toHaveCount(0);

  // The shop sees the photo on the booking and in its details.
  await signIn(page);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`/shops/${E2E.shop.slug}/bookings?date=${bookDate}`);
  const block = page.locator('.cal-block').filter({ hasText: 'Photo Fotini' });
  await loaded(block.locator('.avatar img'));
  await block.click();
  await loaded(page.getByRole('dialog').locator('.avatar img'));
});
