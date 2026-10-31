import { expect, test, type Page } from '@playwright/test';
import { mockApi } from './support/mockApi';
import { testBranches, testProducts } from '../src/test/fixtures';

const adjustments = Array.from({ length: 8 }, (_, index) => {
  const variance = [-2, 3, 0][index % 3];
  return {
    id: `adjustment-${index}`,
    branchId: testBranches[0].id,
    branchName: testBranches[0].name,
    productId: testProducts[0].id,
    productName:
      index === 1
        ? 'Extended seasonal clothing collection with several packaging options and product variants'
        : testProducts[0].name,
    sku: `ADJUSTMENT-SHIRT-${index}`,
    systemQuantity: 12,
    countedQuantity: 12 + variance,
    varianceQuantity: variance,
    unitCost: 900,
    lossValue: variance < 0 ? Math.abs(variance) * 900 : 0,
    excessValue: variance > 0 ? variance * 900 : 0,
    reason: 'Physical count confirmed during the end of month inventory reconciliation.',
    adjustedAt: `2026-10-${30 - index}T10:00:00Z`,
  };
});

async function setup(page: Page, width: number) {
  await page.setViewportSize({ width, height: 844 });
  await mockApi(page);
  await page.route('**/api/v1/stock-adjustments', (route) => route.fulfill({ json: adjustments }));
  await page.goto('/inventory');
  return page.getByRole('table', { name: 'Recent variance adjustments', exact: true });
}

for (const width of [320, 390, 768, 900]) {
  test(`recent adjustments show product and signed variance with details behind three dots at ${width}px`, async ({
    page,
  }) => {
    const table = await setup(page, width);
    const rows = table.locator('tbody tr');
    await expect(rows).toHaveCount(8);
    for (const [index, variance] of ['-2', '+3', '0'].entries()) {
      const row = rows.nth(index);
      await expect(row.locator('td:visible')).toHaveCount(3);
      await expect(row.locator('td:visible').first()).toHaveAttribute('data-label', 'Product');
      await expect(row.locator('[data-label="Variance"]')).toHaveText(variance);
      await expect(row.locator('[data-label="Date"]')).toBeHidden();
      await expect(row.locator('[data-label="Reason"]')).toBeHidden();
      expect((await row.boundingBox())?.height).toBeLessThanOrEqual(60);
    }

    const row = rows.first();
    const more = row.getByRole('button', { name: /Adjustment details for/ });
    await more.scrollIntoViewIfNeeded();
    const box = await more.boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(44);
    expect(box?.height).toBeGreaterThanOrEqual(44);
    await expect(more).toHaveAttribute('aria-expanded', 'false');
    await more.click();
    await expect(more).toHaveAttribute('aria-expanded', 'true');
    await expect(row.locator('[data-label="Date"]')).toBeVisible();
    await expect(row.locator('.mobile-row-name small')).toHaveText(adjustments[0].sku);
    await expect(row.locator('.mobile-row-name small')).toBeVisible();
    await expect(row.locator('[data-label="System"]')).toHaveText('12');
    await expect(row.locator('[data-label="Counted"]')).toHaveText('10');
    await expect(row.locator('[data-label="Loss"]')).toBeVisible();
    await expect(row.locator('[data-label="Excess"]')).toBeVisible();
    await expect(row.locator('[data-label="Reason"]')).toHaveText(adjustments[0].reason);
    await expect(row.locator('[data-label="Reason"]')).toBeVisible();
    await more.focus();
    await page.keyboard.press('Enter');
    await expect(more).toHaveAttribute('aria-expanded', 'false');
    await expect(row.locator('td:visible')).toHaveCount(3);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
    ).toBeLessThanOrEqual(1);
  });
}

test('recent adjustments retain all eight columns on desktop', async ({ page }) => {
  const table = await setup(page, 1440);
  const row = table.locator('tbody tr').first();
  await expect(row.locator('td:visible')).toHaveCount(8);
  await expect(table.getByRole('columnheader', { name: 'Date', exact: true })).toBeVisible();
  await expect(table.getByRole('columnheader', { name: 'Reason', exact: true })).toBeVisible();
  await expect(row.getByRole('button', { name: /Adjustment details for/ })).toBeHidden();
});
