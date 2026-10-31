import { expect, test, type Page } from '@playwright/test';
import { mockApi } from './support/mockApi';
import { testBranches, testUser } from '../src/test/fixtures';
import type { AccountingJournal, AccountingJournalRequest } from '../src/data/types';
import { auditTextContrast } from './support/contrast';

async function accountingApi(page: Page, readOnly = false) {
  await mockApi(page);
  if (readOnly)
    await page.route('**/api/v1/me', (route) =>
      route.fulfill({
        json: { ...testUser, roleKeys: ['SHOP_MANAGER'], permissionCodes: ['accounting:view'] },
      }),
    );
  const accounts = [
    {
      id: 'cash',
      accountCode: '1000',
      accountName: 'Shop Cash',
      accountType: 'ASSET',
      active: true,
    },
    {
      id: 'revenue',
      accountCode: '4000',
      accountName: 'Sales Revenue',
      accountType: 'REVENUE',
      active: true,
    },
  ];
  const periods = [
    {
      id: 'fy2026',
      name: 'FY 2026',
      periodStart: '2026-01-01',
      periodEnd: '2026-12-31',
      status: 'OPEN',
    },
  ];
  const taxRules = [
    {
      id: 'vat',
      taxCode: 'VAT16',
      name: 'Standard VAT',
      taxCategory: 'VAT',
      rate: 16,
      inclusive: true,
      active: true,
      effectiveFrom: '2026-01-01',
    },
  ];
  let journals: AccountingJournal[] = [
    {
      id: 'draft',
      branchId: testBranches[0].id,
      financialPeriodId: periods[0].id,
      journalNumber: 'JN-0001',
      entryDate: '2026-10-29',
      description: 'Opening shop cash',
      status: 'DRAFT',
      totalDebit: 100,
      totalCredit: 100,
      createdAt: '2026-10-29T08:00:00Z',
      updatedAt: '2026-10-29T08:00:00Z',
      lines: accounts.map((a, i) => ({
        ...a,
        id: `line-${i}`,
        accountId: a.id,
        accountType: i === 0 ? 'ASSET' : 'REVENUE',
        debitAmount: i === 0 ? 100 : 0,
        creditAmount: i === 1 ? 100 : 0,
      })),
    },
  ];
  const saved: AccountingJournalRequest[] = [];
  await page.route('**/api/v1/accounting/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace('/api/v1/accounting/', '');
    if (/^journals\/[^/]+\/post$/.test(path)) {
      const entry = journals.find((j) => j.id === path.split('/')[1])!;
      entry.status = 'POSTED';
      await route.fulfill({ json: entry });
      return;
    }
    if (path.startsWith('journals') && ['POST', 'PUT'].includes(request.method())) {
      const body = request.postDataJSON() as AccountingJournalRequest;
      saved.push(body);
      const id = path.split('/')[1] || `journal-${journals.length + 1}`;
      const entry: AccountingJournal = {
        ...body,
        id,
        journalNumber: body.journalNumber || `JN-000${journals.length + 1}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        totalDebit: body.lines.reduce((total, line) => total + line.debitAmount, 0),
        totalCredit: body.lines.reduce((total, line) => total + line.creditAmount, 0),
        lines: body.lines.map((line, i) => ({
          ...accounts.find((a) => a.id === line.accountId)!,
          ...line,
          id: `${id}-${i}`,
          accountType: line.accountId === 'cash' ? 'ASSET' : 'REVENUE',
        })),
      };
      journals = [...journals.filter((j) => j.id !== id), entry];
      await route.fulfill({ status: request.method() === 'POST' ? 201 : 200, json: entry });
      return;
    }
    const rows = accounts.map((a) => ({
      ...a,
      accountId: a.id,
      debitAmount: 100,
      creditAmount: 100,
      netDebit: 0,
      netCredit: 0,
      amount: 100,
    }));
    const data: Record<string, unknown> = {
      summary: {
        moduleKey: 'accounting',
        title: 'Accounting',
        description: 'Business accounts and financial statements',
        metrics: [],
        workItems: [],
      },
      accounts,
      periods,
      'tax-rules': taxRules,
      journals,
      ledger: [
        {
          ...rows[0],
          lineId: 'line-0',
          journalEntryId: 'draft',
          journalNumber: 'JN-0001',
          entryDate: '2026-10-29',
          journalDescription: 'Opening shop cash',
          runningBalance: 100,
        },
      ],
      'reports/trial-balance': { totalDebit: 200, totalCredit: 200, difference: 0, rows },
      'reports/profit-and-loss': {
        revenue: 100,
        costOfGoodsSold: 0,
        expenses: 0,
        netIncome: 100,
        revenueRows: [rows[1]],
        costOfGoodsSoldRows: [],
        expenseRows: [],
      },
      'reports/balance-sheet': {
        assets: 100,
        totalLiabilitiesAndEquity: 100,
        difference: 0,
        retainedEarnings: 100,
        assetRows: [rows[0]],
        liabilityRows: [],
        equityRows: [],
      },
      'reports/cash-flow': {
        cashIn: 100,
        cashOut: 0,
        closingCash: 100,
        rows: [{ ...rows[0], openingBalance: 0, cashIn: 100, cashOut: 0, closingBalance: 100 }],
      },
    };
    if (!(path in data)) throw new Error(`Unexpected accounting API request: ${path}`);
    await route.fulfill({ json: data[path] });
  });
  return saved;
}

async function expectFullWidth(page: Page) {
  const layout = await page.locator('.accounting-workspace').evaluate((workspace) => {
    const width = workspace.getBoundingClientRect().width;
    const panels = [...workspace.querySelectorAll('.panel-card')].filter(
      (panel) => panel.getBoundingClientRect().width > 0,
    );
    return {
      pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      panels: panels.map((panel) => Math.abs(panel.getBoundingClientRect().width - width)),
      tables: [...workspace.querySelectorAll('.responsive-table')].map(
        (table) => table.scrollWidth - table.clientWidth,
      ),
    };
  });
  expect(layout.panels.length).toBeGreaterThan(0);
  expect(layout.pageOverflow).toBeLessThanOrEqual(1);
  expect(layout.panels.every((gap) => gap <= 2)).toBe(true);
  expect(layout.tables.every((overflow) => overflow <= 1)).toBe(true);
}

for (const width of [1920, 1024, 390]) {
  test(`accounting uses full-width registers, editors and statements at ${width}px`, async ({
    page,
  }, testInfo) => {
    const saved = await accountingApi(page);
    await page.setViewportSize({ width, height: 1080 });
    await page.goto('/accounting');
    await expect(page.getByRole('heading', { name: 'Journal Register' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'What are journals for?' })).toBeVisible();
    await expect(
      page.getByText(
        /POS sales and registered expenses do not automatically create journal entries/,
      ),
    ).toBeVisible();
    await page.getByText('Example: move money from Bank to Shop Cash', { exact: true }).click();
    await expect(
      page.locator('.accounting-journal-help').getByText('Bank', { exact: true }),
    ).toBeVisible();
    await expectFullWidth(page);
    await page.screenshot({ path: testInfo.outputPath('journal-guide.png'), fullPage: true });
    await page.getByRole('button', { name: 'Edit Draft', exact: true }).click();
    await expect(page.getByLabel('Description', { exact: true })).toHaveValue('Opening shop cash');
    await page.getByLabel('Description', { exact: true }).fill('Updated opening shop cash');
    await expectFullWidth(page);
    const editorContrast = await auditTextContrast(page, '.accounting-form-panel');
    expect(editorContrast.filter((item) => item.ratio < 7 || item.opacity < 0.99)).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath('journal-entry.png'), fullPage: true });
    await page.getByRole('button', { name: 'Save Draft', exact: true }).click();
    await expect(page.getByText('Updated opening shop cash', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'New Journal', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'New Journal Entry' })).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'Period', exact: true })).toBeHidden();
    await page.getByLabel('Description', { exact: true }).fill('Daily shop cash');
    const lines = page.locator('.accounting-line-row');
    await lines.nth(0).getByRole('combobox', { name: 'Account', exact: true }).selectOption('cash');
    await lines.nth(0).getByLabel('Debit', { exact: true }).fill('150');
    await lines
      .nth(1)
      .getByRole('combobox', { name: 'Account', exact: true })
      .selectOption('revenue');
    await lines.nth(1).getByLabel('Credit', { exact: true }).fill('150');
    await page.getByRole('button', { name: 'Save Draft', exact: true }).click();
    await expect(page.getByText('Daily shop cash', { exact: true })).toBeVisible();
    expect(saved).toHaveLength(2);
    expect(saved[1]).toMatchObject({
      description: 'Daily shop cash',
      status: 'DRAFT',
      financialPeriodId: null,
      lines: [
        { accountId: 'cash', debitAmount: 150 },
        { accountId: 'revenue', creditAmount: 150 },
      ],
    });
    const draftRow = page.getByRole('row').filter({ hasText: 'Daily shop cash' });
    await draftRow.getByRole('button', { name: 'Post to Ledger', exact: true }).click();
    await expect(draftRow.getByText('Posted', { exact: true })).toBeVisible();
    await expect(draftRow.getByRole('button', { name: 'Edit Draft', exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'New Journal', exact: true }).click();
    await page.getByLabel('Description', { exact: true }).fill('Account adjustment');
    await lines.nth(0).getByRole('combobox', { name: 'Account', exact: true }).selectOption('cash');
    await lines.nth(0).getByLabel('Debit', { exact: true }).fill('30');
    await lines.nth(1).getByRole('combobox', { name: 'Account', exact: true }).selectOption('cash');
    await lines.nth(1).getByLabel('Credit', { exact: true }).fill('30');
    await page.getByRole('button', { name: 'Save Draft', exact: true }).click();
    await expect(
      page.getByText('Choose at least two different accounts for the journal entry.'),
    ).toBeVisible();
    expect(saved).toHaveLength(2);
    await lines
      .nth(1)
      .getByRole('combobox', { name: 'Account', exact: true })
      .selectOption('revenue');
    await lines.nth(1).getByLabel('Credit', { exact: true }).fill('30');
    await page.getByRole('button', { name: 'Save & Post to Ledger', exact: true }).click();
    await expect(page.getByText('Account adjustment', { exact: true })).toBeVisible();
    expect(saved[2]).toMatchObject({ description: 'Account adjustment', status: 'POSTED' });
    await page.getByRole('tab', { name: 'Ledger', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'General Ledger' })).toBeVisible();
    await expectFullWidth(page);
    await page.getByRole('tab', { name: 'Reports', exact: true }).click();
    const reports = page.getByRole('group', { name: 'Financial reports' });
    for (const name of ['Trial Balance', 'Profit & Loss', 'Balance Sheet', 'Cash Flow']) {
      await reports.getByRole('button', { name, exact: true }).click();
      await expect(reports.getByRole('button', { name, exact: true })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
      await expect(page.locator('.accounting-reports-grid > .panel-card')).toHaveCount(2);
      await expectFullWidth(page);
    }
    const contrast = await auditTextContrast(page, '.accounting-workspace');
    expect(contrast.filter((item) => item.ratio < 7 || item.opacity < 0.99)).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath('accounting-report.png'), fullPage: true });
    for (const [tab, heading, action, back] of [
      ['Accounts', 'Chart of Accounts', 'New Account', 'Back to Accounts'],
      ['Periods', 'Periods', 'New Period', 'Back to Periods'],
      ['Tax Rules', 'Tax Rules', 'New Tax Rule', 'Back to Tax Rules'],
    ]) {
      await page.getByRole('tab', { name: tab, exact: true }).click();
      await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
      await expectFullWidth(page);
      await page.getByRole('button', { name: 'Edit', exact: true }).first().click();
      await expect(page.getByRole('button', { name: back, exact: true })).toBeVisible();
      await expectFullWidth(page);
      await page.getByRole('button', { name: back, exact: true }).click();
      await page.getByRole('button', { name: action, exact: true }).click();
      await expectFullWidth(page);
      await page.getByRole('button', { name: back, exact: true }).click();
      await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
    }
  });
}

test('read-only accounting users see registers and reports without entry actions', async ({
  page,
}) => {
  await accountingApi(page, true);
  await page.goto('/accounting');
  for (const tab of ['Journals', 'Accounts', 'Periods', 'Tax Rules', 'Ledger', 'Reports']) {
    await page.getByRole('tab', { name: tab, exact: true }).click();
    await expect(
      page.getByRole('button', { name: /^New (Journal|Account|Period|Tax Rule)$/ }),
    ).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: /^(Edit|Edit Draft|Post to Ledger|Void Entry)$/ }),
    ).toHaveCount(0);
    await expect(page.locator('.accounting-form-panel')).toHaveCount(0);
  }
});
