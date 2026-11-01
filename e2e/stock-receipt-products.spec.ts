import { expect, test } from '@playwright/test';
import { testBranches, testProducts } from '../src/test/fixtures';
import { mockApi } from './support/mockApi';

for (const width of [390, 1536]) {
  test(`selects, searches and receives multiple products at ${width}px`, async ({ page }) => {
    await mockApi(page, {
      inventory: [testProducts[0].id, '00000000-0000-4000-8000-000000000802'].map((productId) => ({
        id: `inventory-${productId}`,
        branchId: testBranches[0].id,
        branchName: testBranches[0].name,
        productId,
        productName: productId === testProducts[0].id ? testProducts[0].name : 'Denim Jacket',
        sku: productId === testProducts[0].id ? testProducts[0].sku : 'DNM-002',
        categoryName: testProducts[0].categoryName,
        unitPrice: testProducts[0].unitPrice,
        quantityOnHand: 0,
        quantityReserved: 0,
        quantityAvailable: 0,
        reorderLevel: 0,
        stockHealth: 'OUT_OF_STOCK',
      })),
    });
    await page.route('**/api/v1/catalog/products', (route) =>
      route.fulfill({
        json: [
          ...testProducts,
          {
            ...testProducts[0],
            id: '00000000-0000-4000-8000-000000000802',
            name: 'Denim Jacket',
            sku: 'DNM-002',
            costPrice: 900,
            colors: ['Black'],
          },
          { ...testProducts[0], id: 'inactive', name: 'Inactive shirt', status: 'INACTIVE' },
          { ...testProducts[0], id: 'parent', name: 'Parent shirt', productType: 'VARIABLE' },
        ],
      }),
    );
    await page.setViewportSize({ width, height: 960 });
    await page.goto('/add-stock');
    let dialog = page.getByRole('dialog', { name: 'Supplier Receipt' });
    const search = page.getByRole('searchbox', { name: 'Search products' });
    await expect(dialog.getByRole('checkbox', { name: /Select Oxford Shirt/ })).toBeChecked();
    await expect(dialog.getByRole('checkbox')).toHaveCount(2);
    await dialog.getByRole('button', { name: 'Clear selection' }).click();
    await expect(dialog.getByRole('button', { name: 'Add Line', exact: true })).toBeDisabled();
    await search.fill('Black');
    await dialog.getByRole('button', { name: 'Select all results' }).click();
    await expect(dialog.getByRole('checkbox', { name: /Select Denim Jacket/ })).toBeChecked();
    await search.fill('OXF-001');
    await dialog.getByRole('button', { name: 'Select all results' }).click();
    await dialog.getByRole('button', { name: 'Remove Denim Jacket (DNM-002)' }).click();
    await search.fill('DNM-002');
    await dialog.getByRole('checkbox', { name: /Select Denim Jacket/ }).check();
    await search.fill('no matching product');
    await expect(dialog.getByText('No matching products', { exact: true })).toBeVisible();
    const selected = dialog.getByRole('group', { name: 'Selected products', exact: true });
    await selected.getByLabel(/Quantity for Oxford Shirt/).fill('2');
    await selected.getByLabel(/Unit Cost for Oxford Shirt/).fill('1250');
    await dialog.getByLabel('Reference', { exact: true }).fill('INV-BATCH');
    await dialog.getByRole('button', { name: 'Add 2 Lines' }).click();
    await expect(dialog).toBeVisible();
    await expect(page.getByText('No invoice lines', { exact: true })).toBeAttached();
    await selected.getByLabel(/Quantity for Denim Jacket/).fill('3');
    await expect(dialog.getByText('KSh 5,200', { exact: true })).toBeVisible();

    // A page refresh must preserve the unfinished batch, including cost overrides.
    await page.reload();
    await page.getByText('Resume a saved stock draft', { exact: true }).click();
    await page
      .getByRole('button', { name: 'Recover entries from this device', exact: true })
      .click();
    await page.getByRole('button', { name: 'Supplier Receipt', exact: true }).click();
    dialog = page.getByRole('dialog', { name: 'Supplier Receipt' });
    await expect(dialog.getByLabel(/Quantity for Oxford Shirt/)).toHaveValue('2');
    await expect(dialog.getByLabel(/Unit Cost for Oxford Shirt/)).toHaveValue('1250');
    await expect(dialog.getByLabel(/Quantity for Denim Jacket/)).toHaveValue('3');
    await expect(dialog.getByLabel('Reference', { exact: true })).toHaveValue('INV-BATCH');

    expect(
      await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
    ).toBeLessThanOrEqual(1);
    await dialog.getByRole('button', { name: 'Add 2 Lines' }).click();
    await expect(dialog).toBeHidden();
    await expect(
      page.getByText('Added 2 stock lines (5 units) to the supplier invoice.'),
    ).toBeVisible();
    await expect(page.getByText('KSh 5,200', { exact: true }).first()).toBeVisible();
    await page.getByRole('button', { name: 'Post Receipt', exact: true }).click();
    await expect(
      page.getByText('Posted 2 stock lines (5 units). Supplier invoice total: KSh 5,200.'),
    ).toBeVisible();
  });
}
