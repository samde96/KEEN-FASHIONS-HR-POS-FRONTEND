import { expect, test, type Locator, type Page } from '@playwright/test';
import { mockApi } from './support/mockApi';
import { testBranches, testProducts } from '../src/test/fixtures';

const products = Array.from({ length: 20 }, (_, index) => ({
  ...testProducts[0],
  id: `compact-product-${index}`,
  name:
    index === 1
      ? 'Extended seasonal clothing collection with several packaging options and product variants'
      : `Oxford Shirt ${index + 1}`,
  sku: `SHIRT-${index + 1}`,
}));

const inventory = products.map((product, index) => ({
  id: `compact-inventory-${index}`,
  branchId: testBranches[0].id,
  branchName: testBranches[0].name,
  productId: product.id,
  productName: product.name,
  sku: product.sku,
  categoryName: product.categoryName,
  unitPrice: product.unitPrice,
  quantityOnHand: 12,
  quantityReserved: 3,
  quantityAvailable: 9,
  reorderLevel: 2,
  stockHealth: 'HEALTHY',
}));

async function setup(page: Page, width: number) {
  await page.setViewportSize({ width, height: 844 });
  await mockApi(page);
  await page.route('**/api/v1/catalog/products', (route) => route.fulfill({ json: products }));
  await page.route('**/api/v1/inventory', (route) => route.fulfill({ json: inventory }));
}

async function expectCompactRows(table: Locator, valueLabel: string) {
  const rows = table.locator('tbody tr');
  await expect(rows).toHaveCount(20);
  for (const row of [rows.nth(0), rows.nth(1)]) {
    await expect(row.locator('td:visible')).toHaveCount(3);
    await expect(row.locator('td:visible').nth(0)).toHaveAttribute('data-label', 'Product');
    await expect(row.locator('td:visible').nth(1)).toHaveAttribute('data-label', valueLabel);
    const more = row.getByRole('button', { name: /Details and actions for/ });
    await expect(more).toHaveAttribute('aria-expanded', 'false');
    const box = await more.boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(44);
    expect(box?.height).toBeGreaterThanOrEqual(44);
    expect((await row.boundingBox())?.height).toBeLessThanOrEqual(60);
  }
}

for (const width of [320, 390, 768, 900]) {
  test(`catalog rows show name and price with details and edit behind three dots at ${width}px`, async ({
    page,
  }) => {
    await setup(page, width);
    await page.goto('/product-catalog');
    const table = page.getByRole('table', { name: 'Products', exact: true });
    await expectCompactRows(table, 'Price');
    const row = table.locator('tbody tr').first();
    const more = row.getByRole('button', { name: `Details and actions for ${products[0].name}` });
    await expect(row.getByRole('button', { name: 'Edit', exact: true })).toBeHidden();
    await more.click();
    await expect(more).toHaveAttribute('aria-expanded', 'true');
    await expect(row.locator('[data-label="SKU / Barcode"]')).toContainText(products[0].sku);
    await expect(row.locator('[data-label="Category"]')).toBeVisible();
    await expect(row.locator('[data-label="Stock"]')).toBeVisible();
    await expect(row.locator('[data-label="Status"]')).toBeVisible();
    await expect(row.getByRole('button', { name: 'Deactivate', exact: true })).toBeVisible();
    await row.getByRole('button', { name: 'Edit', exact: true }).click();
    const editDialog = page.getByRole('dialog', { name: 'Edit Product', exact: true });
    await expect(editDialog).toBeVisible();
    await expect(
      editDialog.getByRole('button', { name: 'Save Changes', exact: true }),
    ).toBeInViewport();
    await editDialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    await more.click();
    await expect(row.locator('td:visible')).toHaveCount(3);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
    ).toBeLessThanOrEqual(1);
  });

  test(`inventory rows show name and available stock with details and adjustment behind three dots at ${width}px`, async ({
    page,
  }) => {
    await setup(page, width);
    await page.goto('/inventory');
    const table = page.getByRole('table', { name: 'Product inventory', exact: true });
    await expectCompactRows(table, 'Available');
    const row = table.locator('tbody tr').first();
    await expect(row.locator('[data-label="Available"]')).toHaveText('9');
    await expect(row.getByRole('button', { name: 'Adjust Count', exact: true })).toBeHidden();
    const more = row.getByRole('button', { name: `Details and actions for ${products[0].name}` });
    await more.scrollIntoViewIfNeeded();
    await more.focus();
    await page.keyboard.press('Enter');
    await expect(more).toHaveAttribute('aria-expanded', 'true');
    await expect(row.locator('[data-label="SKU"]')).toContainText(products[0].sku);
    await expect(row.locator('[data-label="On Hand"]')).toHaveText('12');
    await expect(row.locator('[data-label="Reserved"]')).toHaveText('3');
    await expect(
      row.getByLabel(`Reorder level for ${products[0].name}`, { exact: true }),
    ).toBeVisible();
    await expect(row.locator('[data-label="Stock Health"]')).toBeVisible();
    await row.getByRole('button', { name: 'Adjust Count', exact: true }).click();
    const adjustmentDialog = page.getByRole('dialog', { name: 'Adjust Stock Count', exact: true });
    await expect(adjustmentDialog).toBeVisible();
    await adjustmentDialog.getByRole('button', { name: 'Close adjustment dialog' }).click();
    await more.click();
    await expect(row.locator('td:visible')).toHaveCount(3);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
    ).toBeLessThanOrEqual(1);
  });
}

for (const width of [1024, 1440]) {
  test(`catalog and inventory keep full table columns on desktop at ${width}px`, async ({
    page,
  }) => {
    await setup(page, width);
    for (const [path, name, columns] of [
      ['/product-catalog', 'Products', 8],
      ['/inventory', 'Product inventory', 10],
    ] as const) {
      await page.goto(path);
      const table = page.getByRole('table', { name, exact: true });
      const row = table.locator('tbody tr').first();
      await expect(row.locator('td:visible')).toHaveCount(columns);
      await expect(
        table.getByRole('columnheader', {
          name: name === 'Products' ? 'SKU / Barcode' : 'SKU',
          exact: true,
        }),
      ).toBeVisible();
      await expect(row.getByRole('button', { name: /Details and actions for/ })).toBeHidden();
    }
  });
}
