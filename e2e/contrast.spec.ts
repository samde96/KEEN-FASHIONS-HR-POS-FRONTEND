import { expect, test, type Page } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { mockApi } from './support/mockApi';
import { auditTextContrast } from './support/contrast';

const routes = [
  '/login',
  '/apps',
  '/favorites',
  '/recent',
  '/dashboard',
  '/apps/pos',
  '/apps/inventory',
  '/apps/inventory/activity',
  '/apps/inventory/adjustments',
  '/apps/products',
  '/apps/warehouse',
  '/apps/warehouse/receipts',
  '/apps/sales',
  '/apps/purchases',
  '/apps/crm',
  '/apps/finance',
  '/apps/reports',
  '/apps/administration',
  '/pos',
  '/shifts',
  '/sales',
  '/commercial',
  '/inventory',
  '/low-stock',
  '/add-stock',
  '/product-catalog',
  '/product-categories',
  '/suppliers',
  '/procurement',
  '/customers',
  '/crm',
  '/expenses',
  '/reports',
  '/accounting',
  '/users',
  '/roles',
  '/settings',
  '/notifications',
  '/audit',
  '/help',
];

test('text stays fully opaque and readable across application pages', async ({
  page,
}, testInfo) => {
  test.setTimeout(120_000);
  await mockApi(page);
  await page.setViewportSize({ width: 1536, height: 1080 });
  const failures: Record<string, unknown> = {};
  const summary: { route: string; textElements: number; minimumRatio: number }[] = [];
  for (const route of routes) {
    await page.goto(route);
    await page.locator('h1, h2').first().waitFor();
    await expect(page.getByText('Unexpected Application Error!', { exact: true })).toHaveCount(0);
    await page.waitForTimeout(250);
    const measurements = await auditTextContrast(page);
    summary.push({
      route,
      textElements: measurements.length,
      minimumRatio: Math.min(...measurements.map((item) => item.ratio)),
    });
    const failed = measurements.filter((item) => item.ratio < 7 || item.opacity < 0.99);
    if (failed.length) failures[route] = failed;
    expect(measurements.length, `${route} must render text`).toBeGreaterThan(5);
  }
  await testInfo.attach('contrast-measurements', {
    body: JSON.stringify({ summary, failures }, null, 2),
    contentType: 'application/json',
  });
  await writeFile(
    testInfo.outputPath('contrast-measurements.json'),
    JSON.stringify({ summary, failures }, null, 2),
  );
  expect(
    Object.entries(failures).map(
      ([route, items]) => `${route}: ${(items as unknown[]).length} low-contrast text elements`,
    ),
  ).toEqual([]);
});

async function expectReadable(page: Page, root = 'body') {
  const measurements = await auditTextContrast(page, root);
  expect(measurements.length).toBeGreaterThan(0);
  expect(measurements.filter((item) => item.ratio < 7 || item.opacity < 0.99)).toEqual([]);
  if (root === '[role="dialog"]') {
    const surfaces = await page.locator(root).evaluateAll((dialogs) =>
      dialogs.map((dialog) => {
        const style = getComputedStyle(dialog);
        return { background: style.backgroundColor, opacity: style.opacity };
      }),
    );
    for (const surface of surfaces) {
      expect(surface).toEqual({ background: 'rgb(255, 255, 255)', opacity: '1' });
    }
  }
}

for (const width of [1536, 390]) {
  test(`cards, forms and dialogs stay readable at ${width}px`, async ({ page }, testInfo) => {
    await mockApi(page);
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1080 });
    await page.goto('/apps');
    await expect(
      page.getByRole('heading', { name: /All your business on one platform/ }),
    ).toBeVisible();
    await expectReadable(page);
    await page.screenshot({ path: testInfo.outputPath('apps-contrast.png'), fullPage: true });
    await page.locator('.platform-launcher-trigger').click();
    await expect(page.getByRole('dialog', { name: 'Switch application' })).toBeVisible();
    await expectReadable(page, '[role="dialog"]');
    await page.getByRole('button', { name: 'Close app launcher', exact: true }).click();

    await page.goto('/inventory');
    for (const name of ['Category Mix', 'Branch Stock', 'Stock Alerts']) {
      await page.getByRole('button', { name, exact: true }).click();
      await expect(page.getByRole('dialog', { name, exact: true })).toBeVisible();
      await expectReadable(page, '[role="dialog"]');
      await page.getByRole('button', { name: new RegExp(`^Close ${name}$`, 'i') }).click();
    }

    await page.goto('/roles');
    await page.getByRole('button', { name: 'Permissions', exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'Permissions', exact: true })).toBeVisible();
    await expectReadable(page, '[role="dialog"]');
    await page.getByRole('button', { name: 'Close permissions dialog', exact: true }).click();

    await page.goto('/add-stock');
    await expect(page.getByRole('dialog', { name: 'Supplier Receipt' })).toBeVisible();
    await expectReadable(page, '[role="dialog"]');
    await page.screenshot({
      path: testInfo.outputPath('stock-dialog-contrast.png'),
      fullPage: true,
    });
    await page.getByLabel(/^Quantity$/i).fill('5');
    await expect(page.getByLabel(/^Quantity$/i)).toHaveValue('5');
    await page.getByRole('button', { name: /^Add Line$/i }).click();
    await expectReadable(page);
    // Changing apps with unsaved stock opens the draft protection dialog.
    await page.getByRole('button', { name: /log out/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expectReadable(page, '[role="dialog"]');
    await page.getByRole('button', { name: 'Continue entering stock', exact: true }).click();

    await page.goto('/pos');
    await page.getByRole('textbox', { name: /search product/i }).fill('oxford');
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await page.getByRole('button', { name: /Pay KSh 3,248/i }).click();
    await expect(page.getByRole('dialog', { name: 'Payment', exact: true })).toBeVisible();
    await expectReadable(page, '[role="dialog"]');
    const title = await page.getByRole('heading', { name: 'Payment', exact: true }).boundingBox();
    const close = await page
      .getByRole('button', { name: 'Close payment', exact: true })
      .boundingBox();
    expect(title!.x + title!.width).toBeLessThanOrEqual(close!.x);
    await page.screenshot({
      path: testInfo.outputPath('payment-dialog-contrast.png'),
      fullPage: true,
    });
    await page.getByLabel(/payment method/i).selectOption('MPESA');
    await page.getByRole('button', { name: /Complete Sale/i }).click();
    await expect(page.getByRole('dialog', { name: 'Receipt', exact: true })).toBeVisible();
    await expectReadable(page, '[role="dialog"]');

    await page.goto('/crm');
    await page.getByRole('button', { name: 'Add Contact', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Save Lead', exact: true })).toBeVisible();
    await expectReadable(page);
  });
}
