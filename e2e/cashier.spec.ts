import { expect, test } from '@playwright/test';
import { mockApi } from './support/mockApi';
import { testBranches, testUser } from '../src/test/fixtures';
import { auditTextContrast } from './support/contrast';
import type { CashierShift } from '../src/services/cashierShifts';

for (const width of [1536, 390])
  test(`cashier sells, registers expenses, and resumes and closes its shift at ${width}px`, async ({
    page,
  }, testInfo) => {
    await mockApi(page);
    const cashier = {
      ...testUser,
      userId: '00000000-0000-4000-8000-000000000303',
      displayName: 'Shop Cashier',
      roleKeys: ['CASHIER'],
      roleNames: ['Cashier'],
      branchIds: [testBranches[0].id],
      permissionCodes: ['pos:sell', 'expenses:create', 'shifts:manage'],
    };
    await page.route('**/api/v1/me', (r) => r.fulfill({ json: cashier }));
    let shifts: CashierShift[] = [];
    const expenses: Record<string, unknown>[] = [];
    await page.route('**/api/v1/shifts', async (route) => {
      if (route.request().method() === 'POST') {
        const body = route.request().postDataJSON();
        shifts = [
          {
            ...body,
            id: 'cashier-shift',
            cashierId: cashier.userId,
            cashierName: cashier.displayName,
            branchName: testBranches[0].name,
            status: 'OPEN',
            openedAt: new Date().toISOString(),
            cashSales: 0,
            cashExpenses: 0,
            totalSales: 0,
            transactionCount: 0,
            expectedCash: body.openingFloat,
          },
        ];
        await route.fulfill({ status: 201, json: shifts[0] });
        return;
      }
      await route.fulfill({ json: shifts });
    });
    await page.route('**/api/v1/shifts/cashier-shift/close', async (route) => {
      const body = route.request().postDataJSON();
      shifts = [
        {
          ...shifts[0],
          ...body,
          status: 'CLOSED',
          closedAt: new Date().toISOString(),
          variance: body.closingCash - shifts[0].expectedCash,
        },
      ];
      await route.fulfill({ json: shifts[0] });
    });
    await page.route('**/api/v1/expenses', async (route) => {
      if (route.request().method() === 'POST') {
        const expense = {
          ...route.request().postDataJSON(),
          id: 'cashier-expense',
          expenseNumber: 'EXP-CASHIER',
          branchName: testBranches[0].name,
          incurredAt: new Date().toISOString(),
        };
        expenses.push(expense);
        shifts[0].cashExpenses = 20;
        shifts[0].expectedCash = 480;
        await route.fulfill({ status: 201, json: expense });
        return;
      }
      await route.fulfill({ json: expenses });
    });
    page.on('response', (response) => {
      if (
        response.url().endsWith('/api/v1/sales') &&
        response.request().method() === 'POST' &&
        response.status() === 201
      ) {
        shifts[0].transactionCount = 1;
        shifts[0].totalSales = 3248;
      }
    });
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1080 });
    await page.goto('/roles');
    await expect(page).toHaveURL(/\/apps$/);
    await expect(page.getByRole('link', { name: 'Open Point of Sale', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Open Administration', exact: true })).toHaveCount(
      0,
    );
    await expect(page.getByRole('link', { name: 'Open Inventory', exact: true })).toHaveCount(0);
    await page.goto('/shifts');
    await page.getByLabel('Opening float', { exact: true }).fill('500');
    await page.getByRole('button', { name: 'Open My Shift', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Close My Shift', exact: true })).toBeVisible();
    await page.goto('/pos');
    await page.getByRole('textbox', { name: /search product/i }).fill('oxford');
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await page.getByRole('button', { name: /Pay KSh 3,248/i }).click();
    await page.getByLabel(/payment method/i).selectOption('MPESA');
    await page.getByRole('button', { name: /Complete Sale/i }).click();
    await expect(page.getByRole('dialog', { name: 'Receipt', exact: true })).toBeVisible();
    await page.goto('/expenses');
    await page.getByRole('combobox', { name: 'Category', exact: true }).selectOption('Transport');
    await page.getByLabel('Description', { exact: true }).fill('Shop delivery');
    await page.getByLabel('Amount', { exact: true }).fill('20');
    await page.getByLabel(/payment method/i).selectOption('CASH');
    await page.getByRole('combobox', { name: 'Status', exact: true }).selectOption('PAID');
    await page.getByRole('button', { name: 'Record Expense', exact: true }).click();
    await expect(page.getByText('EXP-CASHIER recorded.', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Void', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Mark Paid', exact: true })).toHaveCount(0);
    await page.goto('/shifts');
    await page.reload();
    await expect(page.getByRole('button', { name: 'Close My Shift', exact: true })).toBeVisible();
    const contrast = await auditTextContrast(page, '.cashier-shifts-workspace');
    expect(contrast.filter((item) => item.ratio < 7 || item.opacity < 0.99)).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath('cashier-open-shift.png'), fullPage: true });
    await page.getByLabel('Counted closing cash', { exact: true }).fill('480');
    await page.getByRole('button', { name: 'Close My Shift', exact: true }).click();
    await expect(page.getByText('Your shift is closed.', { exact: true })).toBeVisible();
    expect(shifts[0]).toMatchObject({
      status: 'CLOSED',
      closingCash: 480,
      variance: 0,
      transactionCount: 1,
    });
  });
