import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import * as XLSX from 'xlsx';
import type { Sale } from '../src/data/types';
import { testBranches, testProducts } from '../src/test/fixtures';
import { mockApi } from './support/mockApi';

test.use({ timezoneId: 'Africa/Nairobi' });

const branch = testBranches[0];
const product = testProducts[0];
const sales: Sale[] = [
  ['2025-12-31T23:59:59.999+03:00', 9000],
  ['2026-01-01T00:00:00.000+03:00', 100],
  ['2026-03-31T23:59:59.999+03:00', 200],
  ['2026-04-01T00:00:00.000+03:00', 300],
  ['2026-06-30T23:59:59.999+03:00', 400],
  ['2026-07-01T00:00:00.000+03:00', 500],
  ['2026-09-30T23:59:59.999+03:00', 600],
  ['2026-10-01T00:00:00.000+03:00', 700],
  ['2026-12-31T23:59:59.999+03:00', 800],
  ['2027-01-01T00:00:00.000+03:00', 10000],
  ['2024-02-29T12:00:00.000+03:00', 1200],
  ['2024-03-31T23:59:59.999+03:00', 1300],
].map(([soldAt, amount], index) => ({
  id: `report-sale-${index}`,
  saleNumber: `REPORT-${index}`,
  branchId: branch.id,
  branchName: branch.name,
  subtotalAmount: Number(amount),
  discountAmount: 0,
  taxAmount: 0,
  totalAmount: Number(amount),
  status: 'COMPLETED',
  soldAt: String(soldAt),
  lines: [
    {
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      categoryName: product.categoryName,
      quantity: 1,
      unitPrice: Number(amount),
      costPrice: Number(amount) / 2,
      lineTotal: Number(amount),
    },
  ],
  payments: [{ id: `payment-${index}`, method: 'CASH', amount: Number(amount), status: 'SETTLED' }],
}));

const presets = [
  { name: 'Q1 (Jan–Mar)', from: '2026-01-01', to: '2026-03-31', amount: 300 },
  { name: 'Q2 (Apr–Jun)', from: '2026-04-01', to: '2026-06-30', amount: 700 },
  { name: 'Q3 (Jul–Sep)', from: '2026-07-01', to: '2026-09-30', amount: 1100 },
  { name: 'Q4 (Oct–Dec)', from: '2026-10-01', to: '2026-12-31', amount: 1500 },
  { name: 'Whole year', from: '2026-01-01', to: '2026-12-31', amount: 3600 },
];

async function setup(page: Page, width: number) {
  await page.setViewportSize({ width, height: 900 });
  await page.clock.setFixedTime(new Date('2026-11-01T12:00:00+03:00'));
  await mockApi(page);
  const records = sales.map((sale) => ({
    id: sale.id,
    branchId: branch.id,
    branchName: branch.name,
    productId: product.id,
    productName: product.name,
    sku: product.sku,
  }));
  await page.route('**/api/v1/sales', (route) => route.fulfill({ json: sales }));
  await page.route('**/api/v1/expenses', (route) =>
    route.fulfill({
      json: records.map((record, index) => ({
        ...record,
        expenseNumber: `EXP-${index}`,
        category: 'Transport',
        description: 'Delivery',
        amount: sales[index].totalAmount / 10,
        paymentMethod: 'CASH',
        status: 'PAID',
        incurredAt: sales[index].soldAt,
      })),
    }),
  );
  await page.route('**/api/v1/stock-intakes', (route) =>
    route.fulfill({
      json: records.map((record, index) => ({
        ...record,
        supplierName: 'Report supplier',
        quantity: 1,
        unitCost: sales[index].totalAmount / 2,
        receivedAt: sales[index].soldAt,
      })),
    }),
  );
  await page.route('**/api/v1/stock-adjustments', (route) =>
    route.fulfill({
      json: records.map((record, index) => ({
        ...record,
        systemQuantity: 2,
        countedQuantity: 1,
        varianceQuantity: -1,
        unitCost: sales[index].totalAmount / 20,
        lossValue: sales[index].totalAmount / 20,
        excessValue: 0,
        reason: 'DAMAGE',
        adjustedAt: sales[index].soldAt,
      })),
    }),
  );
  await page.goto('/reports');
  await expect(page.getByRole('heading', { name: 'Business reports' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Excel', exact: true })).toBeEnabled();
  if (width <= 820) {
    await page.getByRole('button', { name: 'Toggle report date filters' }).click();
  }
}

async function expectAmount(page: Page, label: string, amount: number) {
  const formatted = `KSh ${new Intl.NumberFormat('en-KE', {
    maximumFractionDigits: 2,
  }).format(amount)}`;
  await expect(
    page
      .locator('.report-kpi-card')
      .filter({ has: page.getByText(label, { exact: true }) })
      .locator('strong'),
  ).toHaveText(formatted);
}

async function expectPreset(page: Page, preset: (typeof presets)[number]) {
  if (preset.name.startsWith('Q')) {
    await page.getByRole('button', { name: 'Today', exact: true }).click();
  }
  const button = page.getByRole('button', { name: preset.name, exact: true });
  await button.click();
  await expect(button).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByLabel('Report from date', { exact: true })).toHaveValue(preset.from);
  await expect(page.getByLabel('Report to date', { exact: true })).toHaveValue(preset.to);
  await expectAmount(page, 'Sales amount', preset.amount);
  await expectAmount(page, 'Cash expenses', preset.amount / 10);
  await expectAmount(page, 'Inventory received', preset.amount / 2);
  await expectAmount(page, 'Stock variance net', -preset.amount / 20);
}

async function expectQuarterCombination(page: Page, mask: number) {
  const quarters = presets.slice(0, 4);
  for (const [index, quarter] of quarters.entries()) {
    if (!(mask & (1 << index))) continue;
    const button = page.getByRole('button', { name: quarter.name, exact: true });
    if ((await button.getAttribute('aria-pressed')) !== 'true') await button.click();
  }
  for (const [index, quarter] of quarters.entries()) {
    const button = page.getByRole('button', { name: quarter.name, exact: true });
    if (!(mask & (1 << index)) && (await button.getAttribute('aria-pressed')) === 'true') {
      await button.click();
    }
    await expect(button).toHaveAttribute('aria-pressed', String(Boolean(mask & (1 << index))));
  }
  const amount = quarters.reduce(
    (total, quarter, index) => total + (mask & (1 << index) ? quarter.amount : 0),
    0,
  );
  await expectAmount(page, 'Sales amount', amount);
  await expectAmount(page, 'Cash expenses', amount / 10);
  await expectAmount(page, 'Inventory received', amount / 2);
  await expectAmount(page, 'Stock variance net', -amount / 20);
  await expect(page.getByLabel('Sales trend totals').locator('strong').first()).toHaveText(
    `KSh ${amount.toLocaleString('en-KE')}`,
  );
}

test('all fifteen quarter combinations include only their selected periods, including the export', async ({
  page,
}) => {
  await setup(page, 1440);
  for (let mask = 1; mask < 16; mask += 1) await expectQuarterCombination(page, mask);

  await expectQuarterCombination(page, 5);
  const ranges = page.getByRole('list', { name: 'Selected quarter date ranges' });
  await expect(ranges.getByRole('listitem')).toHaveCount(2);
  await expect(ranges).toContainText('1 Jan 2026 to 31 Mar 2026');
  await expect(ranges).toContainText('1 Jul 2026 to 30 Sept 2026');
  await expect(page.getByLabel('Report from date', { exact: true })).toBeHidden();
  await expect(page.getByRole('tab', { name: /^Receipts/ })).toContainText('4');
  await expect(page.getByRole('tab', { name: /^Variances/ })).toContainText('4');
  const xAxis = page.getByLabel('Sales and gross profit trend').locator('.recharts-xAxis');
  await expect(xAxis).not.toContainText(/Apr|May|Jun/);

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Excel', exact: true }).click();
  const workbook = XLSX.read(await readFile((await (await downloadPromise).path())!));
  const rows = XLSX.utils.sheet_to_json<(string | number)[]>(workbook.Sheets.Reports, {
    header: 1,
  });
  expect(rows).toContainEqual(['Q1', '1 Jan 2026', '31 Mar 2026']);
  expect(rows).toContainEqual(['Q3', '1 Jul 2026', '30 Sept 2026']);
  expect(rows).not.toContainEqual(['From date', '1 Jan 2026']);
  expect(rows).toContainEqual(['Sales amount', '1400.00']);
  expect(rows).toContainEqual(['Cash expenses', '140.00']);
  expect(rows).toContainEqual(['Inventory received value', '700.00']);
  expect(rows).toContainEqual(['Stock variance net', '-70.00']);

  await page.getByLabel('Report year', { exact: true }).selectOption('2024');
  await expectAmount(page, 'Sales amount', 2500);
  await expect(ranges).toContainText('1 Jan 2024 to 31 Mar 2024');
  await expect(ranges).toContainText('1 Jul 2024 to 30 Sept 2024');
  await page.getByRole('button', { name: 'Q3 (Jul–Sep)', exact: true }).click();
  await expect(page.getByLabel('Report from date', { exact: true })).toHaveValue('2024-01-01');
  await expect(page.getByLabel('Report to date', { exact: true })).toHaveValue('2024-03-31');
  await page.getByRole('button', { name: 'Q1 (Jan–Mar)', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Q1 (Jan–Mar)', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expectAmount(page, 'Sales amount', 2500);
});

test('quarters and whole year filter all report data and the Excel export at calendar boundaries', async ({
  page,
}) => {
  await setup(page, 1440);
  for (const preset of presets) await expectPreset(page, preset);
  await expect(page.getByLabel('Sales trend totals')).toContainText('3,600');

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Excel', exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('keen-reports-center.xlsx');
  const workbook = XLSX.read(await readFile((await download.path())!));
  const rows = XLSX.utils.sheet_to_json<(string | number)[]>(workbook.Sheets.Reports, {
    header: 1,
  });
  expect(rows).toContainEqual(['From date', '1 Jan 2026']);
  expect(rows).toContainEqual(['Date to', '31 Dec 2026']);
  expect(rows).toContainEqual(['Sales amount', '3600.00']);
  expect(rows).toContainEqual(['Cash expenses', '360.00']);
  expect(rows).toContainEqual(['Inventory received value', '1800.00']);
  expect(rows).toContainEqual(['Stock variance net', '-180.00']);

  await page.getByLabel('Report year', { exact: true }).selectOption('2024');
  await expect(page.getByLabel('Report from date', { exact: true })).toHaveValue('2024-01-01');
  await expect(page.getByLabel('Report to date', { exact: true })).toHaveValue('2024-12-31');
  await expectAmount(page, 'Sales amount', 2500);
  await page.getByRole('button', { name: 'Q1 (Jan–Mar)', exact: true }).click();
  await expect(page.getByLabel('Report to date', { exact: true })).toHaveValue('2024-03-31');
  await expectAmount(page, 'Sales amount', 2500);

  await page.getByRole('button', { name: 'Yesterday', exact: true }).click();
  await expect(page.getByLabel('Report from date', { exact: true })).toHaveValue('2026-10-31');
  await expect(page.getByLabel('Report to date', { exact: true })).toHaveValue('2026-10-31');
  await page.getByRole('button', { name: 'This Week', exact: true }).click();
  await expect(page.getByLabel('Report from date', { exact: true })).toHaveValue('2026-10-26');
  await page.getByRole('button', { name: 'This Month', exact: true }).click();
  await expect(page.getByLabel('Report from date', { exact: true })).toHaveValue('2026-11-01');
});

for (const width of [320, 390, 768, 1024]) {
  test(`all report presets, years and custom dates are usable at ${width}px`, async ({
    page,
  }, testInfo) => {
    await setup(page, width);
    for (const preset of presets) await expectPreset(page, preset);
    await page.getByLabel('Report year', { exact: true }).selectOption('2024');
    await expectAmount(page, 'Sales amount', 2500);
    await page.getByLabel('Report year', { exact: true }).selectOption('2026');
    await expectQuarterCombination(page, 5);
    const controls = page.locator('#report-date-filters');
    const layout = await controls.evaluate((element) => ({
      overflow: document.documentElement.scrollWidth - innerWidth,
      controls: [...element.querySelectorAll('button,input,select')].map((control) => {
        const bounds = control.getBoundingClientRect();
        return { left: bounds.left, right: bounds.right, height: bounds.height };
      }),
    }));
    expect(layout.overflow).toBeLessThanOrEqual(1);
    for (const control of layout.controls) {
      if (control.height === 0) continue;
      expect(control.height).toBeGreaterThanOrEqual(44);
      expect(control.left).toBeGreaterThanOrEqual(0);
      expect(control.right).toBeLessThanOrEqual(width);
    }
    await controls.screenshot({ path: testInfo.outputPath('report-filters.png') });
    await page.getByRole('button', { name: 'Custom', exact: true }).click();
    await page.getByLabel('Report from date', { exact: true }).fill('2026-06-30');
    await page.getByLabel('Report to date', { exact: true }).fill('2026-07-01');
    await page.getByRole('button', { name: 'Apply', exact: true }).click();
    await expectAmount(page, 'Sales amount', 900);
    await expect(page.getByRole('button', { name: 'Custom', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    if (width <= 820) {
      const toggle = page.getByRole('button', { name: 'Toggle report date filters' });
      await toggle.click();
      await expect(controls).toBeHidden();
      await toggle.click();
      await expect(controls).toBeVisible();
    }
  });
}
