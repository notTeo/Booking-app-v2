import type { Page } from '@playwright/test';

/**
 * Step 1 of a new booking (public page or the shop's wizard): services are
 * picked with check circles and the step is left with Continue.
 */
export async function pickService(page: Page, name?: RegExp | string) {
  const group = page.getByRole('group', { name: 'Service', exact: true });
  const card = name ? group.getByRole('checkbox', { name }) : group.getByRole('checkbox').first();
  await card.click();
  await page.getByRole('button', { name: /^continue/i }).click();
}

/** The first service, then the first provider: the wizard is on the date step. */
export async function pickServiceAndProvider(page: Page) {
  await pickService(page);
  await page.getByRole('radiogroup').getByRole('radio').first().click();
}
