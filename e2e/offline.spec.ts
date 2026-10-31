import { expect, test } from '@playwright/test';
import { mockApi } from './support/mockApi';

test('reopens the production app offline, recovers its cart, and reconnects without posting an offline sale', async ({
  page,
  context,
}) => {
  await mockApi(page);
  let apiAvailable = true;
  let salePosts = 0;
  await page.route('**/api/v1/**', async (route) => {
    if (
      route.request().method() === 'POST' &&
      new URL(route.request().url()).pathname === '/api/v1/sales'
    )
      salePosts += 1;
    if (!apiAvailable) await route.abort('internetdisconnected');
    else await route.fallback();
  });
  await page.goto('/pos');
  await page.getByRole('textbox', { name: /search product/i }).fill('oxford');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.getByRole('button', { name: /Pay KSh 3,248/i })).toBeVisible();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise<void>((resolve) =>
        navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), {
          once: true,
        }),
      );
    }
  });
  apiAvailable = false;
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByText('Working offline', { exact: true })).toBeVisible();
  await expect(page.getByText(/Saved cart restored from this device/)).toBeVisible();
  await expect(page.getByRole('button', { name: /Pay KSh 3,248/i })).toBeVisible();
  await page.getByRole('button', { name: /Pay KSh 3,248/i }).click();
  await expect(
    page.getByText(
      'Keep this cart as a draft. Reconnect before taking payment or completing the sale.',
    ),
  ).toBeVisible();
  expect(salePosts).toBe(0);
  await expect(page.getByRole('dialog', { name: 'Payment' })).toHaveCount(0);
  apiAvailable = true;
  await context.setOffline(false);
  await expect(page.getByText('Working offline', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Pay KSh 3,248/i })).toBeVisible();
  expect(salePosts).toBe(0);
});

test('offline sign-out prevents reopening a cached account', async ({ page, context }) => {
  await mockApi(page);
  let apiAvailable = true;
  await page.route('**/api/v1/**', async (route) => {
    if (!apiAvailable) await route.abort('internetdisconnected');
    else await route.fallback();
  });
  await page.goto('/pos');
  await expect(page.getByAltText('KEEN ERP')).toBeVisible();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise<void>((resolve) =>
        navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), {
          once: true,
        }),
      );
    }
  });
  apiAvailable = false;
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByText('Working offline', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /Log Out/i }).click();
  await expect(page.getByRole('heading', { name: 'User Login' })).toBeVisible();
  await page.goto('/pos');
  await expect(page.getByRole('heading', { name: 'User Login' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Pay KSh/i })).toHaveCount(0);
});
