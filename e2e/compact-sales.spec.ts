import { expect, test, type Page } from '@playwright/test';
import { mockApi } from './support/mockApi';
import { testBranches, testProducts } from '../src/test/fixtures';
import type { PaymentMethod, Sale } from '../src/data/types';

const methods: PaymentMethod[] = ['CASH', 'MPESA', 'CARD', 'BANK_TRANSFER'];
const sales: Sale[] = Array.from({ length: 12 }, (_, index) => ({
  id: `compact-sale-${index}`,
  saleNumber: `SALE-2026-10-${String(index + 1).padStart(4, '0')}`,
  branchId: testBranches[0].id,
  branchName: testBranches[0].name,
  customerName: 'Customer with a long name for the seasonal clothing collection',
  subtotalAmount: 2800,
  discountAmount: 0,
  taxAmount: 448,
  totalAmount: 3248,
  status: 'COMPLETED',
  soldAt: '2026-10-30T10:00:00Z',
  lines: [
    {
      productId: testProducts[0].id,
      productName: testProducts[0].name,
      sku: testProducts[0].sku,
      categoryName: testProducts[0].categoryName,
      quantity: 1,
      unitPrice: 2800,
      lineTotal: 2800,
    },
  ],
  payments:
    index === 4
      ? [
          { id: 'split-cash', method: 'CASH', amount: 1000, status: 'SETTLED' },
          { id: 'split-mpesa', method: 'MPESA', amount: 2248, status: 'SETTLED' },
        ]
      : [
          {
            id: `payment-${index}`,
            method: methods[index % methods.length],
            amount: 3248,
            status: 'SETTLED',
          },
        ],
}));

async function setup(page: Page, width: number) {
  await page.setViewportSize({ width, height: 844 });
  await mockApi(page);
  await page.route('**/api/v1/sales?*', (route) => route.fulfill({ json: sales }));
  await page.goto('/sales');
  return page.getByRole('table', { name: 'Sales history', exact: true });
}

for (const width of [320, 390, 768, 900]) {
  test(`mobile sales show date, payment and amount with receipt and reversal actions behind three dots at ${width}px`, async ({
    page,
  }) => {
    const table = await setup(page, width);
    const rows = table.locator('tbody tr');
    await expect(rows).toHaveCount(12);
    for (const [index, payment] of [
      'Cash',
      'M-Pesa',
      'Card',
      'Bank Transfer',
      'Split: Cash + M-Pesa',
    ].entries()) {
      const row = rows.nth(index);
      await expect(row.locator('td:visible')).toHaveCount(4);
      await expect(row.locator('[data-label="Sold At"] time')).toHaveAttribute(
        'datetime',
        sales[index].soldAt,
      );
      await expect(row.locator('.sales-date-compact')).toHaveText('30 Oct 2026');
      await expect(row.locator('.sales-date-full')).toBeHidden();
      await expect(row.locator('[data-label="Payment"]')).toHaveText(payment);
      await expect(row.locator('[data-label="Total"]')).toContainText('3,248');
      await expect(row.locator('[data-label="Receipt"]')).toBeHidden();
      await expect(row.locator('[data-label="Customer"]')).toBeHidden();
      await expect(row.locator('[data-label="Status"]')).toBeHidden();
      await expect(row.getByRole('button', { name: 'Receipt', exact: true })).toBeHidden();
    }

    const row = rows.first();
    const more = row.getByRole('button', {
      name: `Details and actions for ${sales[0].saleNumber}`,
    });
    await more.scrollIntoViewIfNeeded();
    const box = await more.boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(44);
    expect(box?.height).toBeGreaterThanOrEqual(44);
    await expect(more).toHaveAttribute('aria-expanded', 'false');
    await more.click();
    await expect(more).toHaveAttribute('aria-expanded', 'true');
    await expect(row.locator('[data-label="Receipt"]')).toContainText(sales[0].saleNumber);
    await expect(row.locator('[data-label="Customer"]')).toHaveText(sales[0].customerName!);
    await expect(row.locator('[data-label="Items"]')).toHaveText('1 item');
    await expect(row.locator('[data-label="Status"]')).toHaveText('Completed');
    await expect(row.locator('[data-label="Payment"]')).toBeVisible();
    await expect(row.locator('.sales-date-full')).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
    ).toBeLessThanOrEqual(1);

    await row.getByRole('button', { name: 'Receipt', exact: true }).click();
    const receipt = page.getByRole('dialog', { name: 'Receipt', exact: true });
    await expect(receipt).toBeVisible();
    await expect(receipt).toContainText(sales[0].saleNumber);
    await receipt.getByRole('button', { name: 'Close receipt', exact: true }).click();
    for (const action of ['Refund', 'Cancel sale']) {
      await row.getByRole('button', { name: action, exact: true }).click();
      const reversal = page.getByRole('dialog', { name: 'Confirm sale reversal' });
      await expect(reversal).toBeVisible();
      await reversal.getByRole('button', { name: 'Keep sale', exact: true }).click();
    }

    await more.focus();
    await page.keyboard.press('Enter');
    await expect(more).toHaveAttribute('aria-expanded', 'false');
    await expect(row.locator('td:visible')).toHaveCount(4);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
    ).toBeLessThanOrEqual(1);
  });
}

for (const width of [1024, 1440]) {
  test(`desktop sales retain all eight columns at ${width}px`, async ({ page }) => {
    const table = await setup(page, width);
    const row = table.locator('tbody tr').first();
    await expect(row.locator('td:visible')).toHaveCount(8);
    await expect(table.getByRole('columnheader', { name: 'Sold At', exact: true })).toBeVisible();
    await expect(row.locator('.sales-date-full')).toBeVisible();
    await expect(row.locator('.sales-date-compact')).toBeHidden();
    await expect(row.getByRole('button', { name: 'Receipt', exact: true })).toBeVisible();
    await expect(row.getByRole('button', { name: /Details and actions for/ })).toBeHidden();
  });
}
