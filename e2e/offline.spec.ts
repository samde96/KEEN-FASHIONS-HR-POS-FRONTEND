import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { mockApi } from './support/mockApi';
import { testBranches, testProducts } from '../src/test/fixtures';

async function ready(page: Page) {
  await expect(page.getByText(/Offline ready ·/)).toBeVisible();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller)
      await new Promise<void>((resolve) =>
        navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), {
          once: true,
        }),
      );
  });
}
async function pay(page: Page, method = 'CASH') {
  await page.getByRole('textbox', { name: /search product/i }).fill('oxford');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await page.getByRole('button', { name: /Pay KSh 3,248/i }).click();
  await page.getByLabel('Payment method', { exact: true }).selectOption(method);
  if (method === 'CASH') await page.getByLabel('Cash received', { exact: true }).fill('3248');
  await page.getByRole('button', { name: /Complete Sale/ }).click();
  await expect(page.getByRole('dialog', { name: 'Receipt', exact: true })).toBeVisible();
}
test('preloads unvisited POS products, completes cash and manual M-Pesa offline, reloads, then synchronizes once', async ({
  page,
  context,
}) => {
  const server = await mockApi(page);
  let apiAvailable = true;
  await page.route('**/api/v1/**', async (route) => {
    if (!apiAvailable) await route.abort('internetdisconnected');
    else await route.fallback();
  });
  await page.goto('/apps');
  await ready(page);
  apiAvailable = false;
  await context.setOffline(true);
  await page.goto('/pos');
  await expect(page.getByText('Working offline', { exact: true })).toBeVisible();
  await pay(page);
  await expect(page.getByText(/Completed on this device · Pending backend/)).toBeVisible();
  await page.getByRole('button', { name: 'Close receipt', exact: true }).click();
  await pay(page, 'MPESA');
  await page.getByRole('button', { name: 'Close receipt', exact: true }).click();
  await page.reload();
  await expect(page.getByText('2 saved transactions awaiting sync')).toBeVisible();
  expect(server.operations.size).toBe(0);
  apiAvailable = true;
  await context.setOffline(false);
  await expect.poll(() => server.operations.size).toBe(2);
  await page.getByRole('button', { name: 'Offline & sync', exact: true }).click();
  await expect(page.getByText('Saved transactions (0 pending)')).toBeVisible();
  expect(server.inventory[0].quantityAvailable).toBe(0);
  await page.getByRole('button', { name: 'Sync now', exact: true }).click();
  expect(server.operations.size).toBe(2);
  await page.screenshot({ path: 'test-results/offline-sync-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('dialog', { name: 'Offline & sync', exact: true })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    ),
  ).toBeLessThanOrEqual(1);
  await page.screenshot({ path: 'test-results/offline-sync-mobile.png', fullPage: true });
});
test('offline password login works after sign-out on a prepared device', async ({
  page,
  context,
}) => {
  await mockApi(page);
  let online = true;
  await page.route('**/api/v1/**', async (route) => {
    if (!online) await route.abort('internetdisconnected');
    else await route.fallback();
  });
  await page.goto('/login');
  await page.getByLabel(/Email or username/).fill('admin@example.com');
  await page.getByLabel(/^Password$/i).fill('offline-browser-test-password');
  await page.getByRole('button', { name: /sign in|login/i }).click();
  await ready(page);
  online = false;
  await context.setOffline(true);
  await page.goto('/pos');
  await page.getByRole('button', { name: /Log Out/i }).click();
  await expect(page.getByRole('heading', { name: 'User Login' })).toBeVisible();
  await page.goto('/pos');
  await expect(page.getByRole('heading', { name: 'User Login' })).toBeVisible();
  await page.getByLabel(/Email or username/).fill('admin@example.com');
  await page.getByLabel(/^Password$/i).fill('offline-browser-test-password');
  await page.getByRole('button', { name: /sign in|login/i }).click();
  await expect(page.getByText('Working offline', { exact: true })).toBeVisible();
  await page.goto('/pos');
  await pay(page);
});
test('a committed sale with a lost acknowledgement is recovered without a second stock movement', async ({
  page,
}) => {
  const server = await mockApi(page, { loseFirstOperationResponse: true });
  await page.goto('/pos');
  await ready(page);
  await pay(page);
  await expect(page.getByText(/Completed on this device · Pending backend/)).toBeVisible();
  expect(server.operations.size).toBe(1);
  expect(server.inventory[0].quantityAvailable).toBe(1);
  await page.getByRole('button', { name: 'Close receipt' }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Offline & sync' }).click();
  await page.getByRole('button', { name: 'Sync now', exact: true }).click();
  await expect(page.getByText('Saved transactions (0 pending)')).toBeVisible();
  expect(server.operations.size).toBe(1);
  expect(server.inventory[0].quantityAvailable).toBe(1);
});
test('receives stock and transfers between locations offline, then synchronizes both in order', async ({
  page,
  context,
}) => {
  const warehouse = {
    ...testBranches[0],
    id: '00000000-0000-4000-8000-000000000102',
    name: 'Warehouse',
    code: 'WH',
  };
  const server = await mockApi(page, { branches: [...testBranches, warehouse] });
  let online = true;
  await page.route('**/api/v1/**', async (route) => {
    if (!online) await route.abort('internetdisconnected');
    else await route.fallback();
  });
  await page.goto('/apps');
  await ready(page);
  online = false;
  await context.setOffline(true);
  await page.goto('/add-stock');
  await expect(page.getByRole('dialog', { name: 'Supplier Receipt' })).toBeVisible();
  await page.getByLabel(/^Quantity$/i).fill('5');
  await page.getByRole('button', { name: /^Add Line$/i }).click();
  await page.getByRole('button', { name: /Post.*receipt|Receive.*stock|Post.*stock/i }).click();
  await expect(page.getByText(/Posted 1 stock line/)).toBeVisible();
  await page.goto('/stock-transfers');
  await page.getByLabel('To location', { exact: true }).selectOption(warehouse.id);
  await page.getByLabel('Transfer product', { exact: true }).selectOption(testProducts[0].id);
  await page.getByLabel('Transfer quantity', { exact: true }).fill('4');
  await page.getByRole('button', { name: 'Complete transfer', exact: true }).click();
  await expect(page.getByText('2 saved transactions awaiting sync')).toBeVisible();
  await page.reload();
  await expect(page.getByText('2 saved transactions awaiting sync')).toBeVisible();
  online = true;
  await context.setOffline(false);
  await expect.poll(() => server.operations.size).toBe(2);
  expect(server.inventory.find((i) => i.branchId === testBranches[0].id)?.quantityAvailable).toBe(
    3,
  );
  expect(server.inventory.find((i) => i.branchId === warehouse.id)?.quantityAvailable).toBe(4);
});
