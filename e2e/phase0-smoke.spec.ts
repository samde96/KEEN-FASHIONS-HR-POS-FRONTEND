import { expect, test } from '@playwright/test';
import { testCrmRecords, testCrmStorageKey } from '../src/test/crmFixtures';
import { mockApi } from './support/mockApi';
import { testProducts, testProductCategories } from '../src/test/fixtures';
import { auditTextContrast } from './support/contrast';

test('owner lands on Apps Home and can open Business Overview', async ({ page }, testInfo) => {
  await mockApi(page);
  await page.setViewportSize({ width: 1536, height: 1080 });
  await page.goto('/login');

  await expect(page.getByRole('heading', { name: 'User Login' })).toBeVisible();
  await page.getByLabel(/Email or username/i).fill('admin@example.com');
  await page.getByLabel('Password').fill(process.env.E2E_ADMIN_PASSWORD ?? 'mock-login-password');
  await page.getByRole('button', { name: /login/i }).click();

  await expect(
    page.getByRole('heading', { name: /All your business on one platform/ }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Business Overview', exact: true }).click();
  await expect(page.getByRole('heading', { name: "Today's Dashboard" })).toBeVisible();
  await expect(page.locator('.payment-panel .donut-layout')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Export', exact: true })).toBeEnabled();
  await page.screenshot({ path: testInfo.outputPath('dashboard-desktop.png'), fullPage: true });
  await page.getByRole('button', { name: /log out/i }).click();
  await expect(page.getByRole('heading', { name: 'User Login' })).toBeVisible();
});

test('mobile back office menu opens above the page chrome', async ({ page }) => {
  await mockApi(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/dashboard');

  await expect(page.getByRole('heading', { name: "Today's Dashboard" })).toBeVisible();
  await page.getByRole('button', { name: /menu/i }).click();
  await expect(page.locator('.sidebar')).toHaveClass(/menu-open/);

  const menuState = await page.evaluate(() => {
    const sidebar = document.querySelector('.sidebar');
    const topbar = document.querySelector('.topbar');

    if (!(sidebar instanceof HTMLElement) || !(topbar instanceof HTMLElement)) {
      throw new Error('Expected back office navigation elements to exist.');
    }

    const sidebarRect = sidebar.getBoundingClientRect();
    const topbarRect = topbar.getBoundingClientRect();
    const topbarPoint = document.elementFromPoint(
      Math.min(window.innerWidth - 1, Math.max(0, topbarRect.left + 8)),
      Math.min(window.innerHeight - 1, Math.max(0, topbarRect.top + 8)),
    );
    const bottomPoint = document.elementFromPoint(
      Math.floor(window.innerWidth / 2),
      window.innerHeight - 8,
    );

    return {
      coversViewport:
        sidebarRect.top <= 0 &&
        sidebarRect.left <= 0 &&
        sidebarRect.right >= window.innerWidth &&
        sidebarRect.bottom >= window.innerHeight,
      ownsBottomPoint: bottomPoint != null && sidebar.contains(bottomPoint),
      ownsTopbarPoint: topbarPoint != null && sidebar.contains(topbarPoint),
      position: window.getComputedStyle(sidebar).position,
    };
  });

  expect(menuState.position).toBe('fixed');
  expect(menuState.coversViewport).toBe(true);
  expect(menuState.ownsTopbarPoint).toBe(true);
  expect(menuState.ownsBottomPoint).toBe(true);
});

test('dashboard metric cards use a readable two by two mobile layout', async ({
  page,
}, testInfo) => {
  await mockApi(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/dashboard');

  await expect(page.getByRole('heading', { name: "Today's Dashboard" })).toBeVisible();
  await expect(page.locator('.dashboard-grid .metric-card')).toHaveCount(4);

  const metricsLayout = await page.locator('.dashboard-grid .metric-card').evaluateAll((cards) => {
    const rects = cards.map((card) => card.getBoundingClientRect());
    const rowTops = [...new Set(rects.map((rect) => Math.round(rect.top)))].sort((a, b) => a - b);
    const rows = rowTops.map((rowTop) => rects.filter((rect) => Math.abs(rect.top - rowTop) <= 2));
    const firstValue = cards[0]?.querySelector('strong');
    const firstLabel = cards[0]?.querySelector('div > span');

    return {
      maxHeight: Math.max(...rects.map((rect) => rect.height)),
      rowCount: rows.length,
      rowSizes: rows.map((row) => row.length),
      labelFontSize:
        firstLabel instanceof HTMLElement
          ? parseFloat(window.getComputedStyle(firstLabel).fontSize)
          : 0,
      valueFontSize:
        firstValue instanceof HTMLElement
          ? parseFloat(window.getComputedStyle(firstValue).fontSize)
          : 0,
    };
  });

  expect(metricsLayout.rowCount).toBe(2);
  expect(metricsLayout.rowSizes).toEqual([2, 2]);
  expect(metricsLayout.maxHeight).toBeLessThanOrEqual(96);
  expect(metricsLayout.labelFontSize).toBeGreaterThanOrEqual(12);
  expect(metricsLayout.labelFontSize).toBeLessThanOrEqual(14);
  expect(metricsLayout.valueFontSize).toBeGreaterThanOrEqual(16);
  expect(metricsLayout.valueFontSize).toBeLessThanOrEqual(20);
  await expect(page.locator('.payment-panel .donut-layout')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Export', exact: true })).toBeEnabled();
  await page.screenshot({ path: testInfo.outputPath('dashboard-mobile.png'), fullPage: true });
});

test('cashier can search, add an item, and open payment shell', async ({ page }) => {
  await mockApi(page);
  await page.goto('/pos');

  await expect(page.getByAltText('KEEN ERP')).toBeVisible();
  await page.getByRole('textbox', { name: /search product/i }).fill('oxford');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await page.getByRole('button', { name: /Pay KSh 3,248/i }).click();

  await expect(page.getByRole('dialog', { name: 'Payment' })).toBeVisible();
  await page.getByLabel(/payment method/i).selectOption('MPESA');
  await page.getByRole('button', { name: /Complete Sale/i }).click();

  await expect(page.getByRole('dialog', { name: 'Receipt' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Print Receipt/i })).toBeVisible();
});

test('owner can open expenses register', async ({ page }) => {
  await mockApi(page);
  await page.goto('/expenses');

  await expect(page.getByRole('heading', { name: 'Expenses' })).toBeVisible();
  await expect(page.getByText('Shop rent')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Expense Register' })).toBeVisible();
});

for (const width of [1536, 1024, 390]) {
  test(`product catalog modules use full width without clipping at ${width}px`, async ({
    page,
  }, testInfo) => {
    await mockApi(page);
    const category = {
      ...testProductCategories[0],
      name: 'Extended product category for shirts and seasonal clothing collections',
      code: 'CATEGORY-' + 'A'.repeat(31),
    };
    const product = {
      ...testProducts[0],
      name: 'Oxford Shirt with a long product description for seasonal clothing collections, packaging options and product variants',
      sku: 'SKU-LONG' + 'X'.repeat(72),
      barcode: '99123456789012345678'.repeat(4),
      categoryName: category.name,
      department: 'Clothing and accessories for customers across all retail branches',
    };
    await page.route('**/api/v1/catalog/categories', (route) =>
      route.fulfill({ json: [category] }),
    );
    await page.route('**/api/v1/catalog/products', (route) => route.fulfill({ json: [product] }));
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1080 });
    await page.goto('/product-catalog');
    await expect(page.getByRole('heading', { name: 'Product Catalog', exact: true })).toBeVisible();
    await expect(page.getByRole('table', { name: 'Products', exact: true })).toBeVisible();
    await expect(page.getByText(product.name, { exact: true })).toBeVisible();
    await expect(page.getByRole('table', { name: 'Product categories', exact: true })).toHaveCount(
      0,
    );

    const assertFullWidthAndUnclipped = async () => {
      const layout = await page.locator('.catalog-module-panel').evaluate((panel) => {
        const workspace = panel.closest('.product-catalog-workspace')!;
        return {
          widthGap: Math.abs(
            workspace.getBoundingClientRect().width - panel.getBoundingClientRect().width,
          ),
          pageOverflow: document.documentElement.scrollWidth - window.innerWidth,
          clippedCells: [...panel.querySelectorAll('td, .catalog-product-label, .table-label')]
            .filter(
              (cell) =>
                cell.scrollWidth > cell.clientWidth + 1 ||
                cell.scrollHeight > cell.clientHeight + 1,
            )
            .map((cell) => cell.textContent),
        };
      });
      expect(layout.widthGap).toBeLessThanOrEqual(1);
      expect(layout.pageOverflow).toBeLessThanOrEqual(1);
      expect(layout.clippedCells).toEqual([]);
      const contrast = await auditTextContrast(page, '.product-catalog-workspace');
      expect(contrast.filter((item) => item.ratio < 7 || item.opacity < 0.99)).toEqual([]);
    };
    await assertFullWidthAndUnclipped();
    await page.screenshot({ path: testInfo.outputPath('products-full-width.png'), fullPage: true });
    const download = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /download excel/i }).click(),
    ]).then(([event]) => event);
    expect(download.suggestedFilename()).toBe('keen-product-catalog.xlsx');

    await page
      .getByRole('navigation', { name: 'Product modules' })
      .getByRole('link', { name: 'Product Categories', exact: true })
      .click();
    await expect(page).toHaveURL(/\/product-categories$/);
    await expect(
      page.getByRole('table', { name: 'Product categories', exact: true }),
    ).toBeVisible();
    await expect(page.getByRole('table', { name: 'Products', exact: true })).toHaveCount(0);
    await expect(page.getByText(category.code, { exact: true })).toBeVisible();
    await assertFullWidthAndUnclipped();
    await page.screenshot({
      path: testInfo.outputPath('categories-full-width.png'),
      fullPage: true,
    });
    await page.getByRole('button', { name: 'New Category', exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'New Category', exact: true })).toBeVisible();
    await expect(page.getByLabel('Category Name', { exact: true })).toBeFocused();
    const dialogContrast = await auditTextContrast(page, '[role="dialog"]');
    expect(dialogContrast.filter((item) => item.ratio < 7 || item.opacity < 0.99)).toEqual([]);
    await page.getByRole('button', { name: 'Close category dialog', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.reload();
    await expect(
      page.getByRole('table', { name: 'Product categories', exact: true }),
    ).toBeVisible();
    await page.goBack();
    await expect(page.getByRole('table', { name: 'Products', exact: true })).toBeVisible();
  });
}

test('inventory insight panels open from top buttons', async ({ page }) => {
  await mockApi(page);
  await page.goto('/inventory');

  await expect(page.getByRole('heading', { name: 'Inventory', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Product Inventory' })).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Category Mix' })).toHaveCount(0);
  await expect(page.getByRole('dialog', { name: 'Branch Stock' })).toHaveCount(0);
  await expect(page.getByRole('dialog', { name: 'Stock Alerts' })).toHaveCount(0);

  await page.getByRole('button', { name: 'Category Mix' }).click();
  const categoryDialog = page.getByRole('dialog', { name: 'Category Mix' });
  await expect(categoryDialog).toBeVisible();
  await expect(categoryDialog.getByText('Shirts')).toBeVisible();
  await page.getByRole('button', { name: /close category mix/i }).click();
  await expect(page.getByRole('dialog', { name: 'Category Mix' })).toHaveCount(0);

  await page.getByRole('button', { name: 'Branch Stock' }).click();
  const branchDialog = page.getByRole('dialog', { name: 'Branch Stock' });
  await expect(branchDialog).toBeVisible();
  await expect(branchDialog.getByText('Flagship Branch')).toBeVisible();
  await page.getByRole('button', { name: 'Close branch stock', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Branch Stock' })).toHaveCount(0);

  await page.getByRole('button', { name: 'Stock Alerts' }).click();
  const alertsDialog = page.getByRole('dialog', { name: 'Stock Alerts' });
  await expect(alertsDialog).toBeVisible();
  await expect(alertsDialog.getByText('No stock alerts')).toBeVisible();
});

test('roles page shows the managed roles and opens the permission catalog', async ({ page }) => {
  await mockApi(page);
  await page.setViewportSize({ width: 1536, height: 960 });
  await page.goto('/roles');

  await expect(page.getByRole('heading', { name: 'Roles', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Registered Roles' })).toBeVisible();
  await expect(
    page.locator('.roles-list-panel strong').filter({ hasText: 'Shop Manager' }),
  ).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Register Role' })).toHaveCount(0);
  await expect(page.getByRole('dialog', { name: 'Permissions' })).toHaveCount(0);

  const overflow = await page.evaluate(() => {
    const rolesTable = document.querySelector('.roles-table-scroll');

    return {
      page: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      roles:
        rolesTable instanceof HTMLElement ? rolesTable.scrollWidth - rolesTable.clientWidth : 0,
    };
  });

  expect(overflow.page).toBeLessThanOrEqual(1);
  expect(overflow.roles).toBeLessThanOrEqual(1);

  await expect(page.getByRole('button', { name: 'New Role' })).toHaveCount(0);

  await page.getByRole('button', { name: 'Permissions' }).click();
  const permissionsDialog = page.getByRole('dialog', { name: 'Permissions' });
  await expect(permissionsDialog).toBeVisible();
  await expect(permissionsDialog.getByText('pos:sell')).toBeVisible();
  await page.getByRole('button', { name: /close permissions/i }).click();
  await expect(page.getByRole('dialog', { name: 'Permissions' })).toHaveCount(0);
});

test('add stock keeps receipt dialog on top and tables within the page width', async ({ page }) => {
  await mockApi(page);
  await page.setViewportSize({ width: 1536, height: 960 });
  await page.goto('/add-stock');

  const receiptDialog = page.getByRole('dialog', { name: 'Supplier Receipt' });
  await expect(receiptDialog).toBeVisible();

  const dialogLayer = await page.locator('.stock-receipt-dialog-backdrop').evaluate((element) => {
    const styles = window.getComputedStyle(element);
    const bounds = element.getBoundingClientRect();
    const topElement = document.elementFromPoint(bounds.width / 2, 20);

    return {
      isFixed: styles.position === 'fixed',
      isTopElementInsideDialogLayer: topElement == null ? false : element.contains(topElement),
      zIndex: Number(styles.zIndex),
    };
  });

  expect(dialogLayer.isFixed).toBe(true);
  expect(dialogLayer.isTopElementInsideDialogLayer).toBe(true);
  expect(dialogLayer.zIndex).toBeGreaterThanOrEqual(2000);

  await page.getByRole('button', { name: /close supplier receipt/i }).click();
  await expect(receiptDialog).toBeHidden();
  await page.getByRole('button', { name: 'Supplier Receipt' }).click();
  await expect(receiptDialog).toBeVisible();

  await page.getByLabel(/^Quantity$/i).fill('5');
  await expect(page.getByLabel(/^Quantity$/i)).toHaveValue('5');
  await page.getByRole('button', { name: /^Add Line$/i }).click();

  await expect(receiptDialog).toBeHidden();
  await expect(page.getByRole('heading', { name: 'Supplier Invoice' })).toBeVisible();
  await expect(page.getByText('KSh 6,000').first()).toBeVisible();

  const overflow = await page.evaluate(() => {
    const invoiceTable = document.querySelector('.receipt-lines-table');
    const stockIntakesTable = document.querySelector('.stock-intakes-table');

    return {
      invoice:
        invoiceTable instanceof HTMLElement
          ? invoiceTable.scrollWidth - invoiceTable.clientWidth
          : 0,
      page: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      stockIntakes:
        stockIntakesTable instanceof HTMLElement
          ? stockIntakesTable.scrollWidth - stockIntakesTable.clientWidth
          : 0,
    };
  });

  expect(overflow.page).toBeLessThanOrEqual(1);
  expect(overflow.invoice).toBeLessThanOrEqual(1);
  expect(overflow.stockIntakes).toBeLessThanOrEqual(1);
});

test('CRM contact becomes an opportunity and survives a reload', async ({ page }) => {
  await mockApi(page);
  await page.goto('/crm');
  await expect(page.getByRole('heading', { name: 'CRM', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Add Contact', exact: true }).click();
  await page.getByLabel('Name', { exact: true }).fill('Amina Kimani');
  await page.getByLabel('Company', { exact: true }).fill('Amina Studio');
  await page.getByLabel('Email', { exact: true }).fill('amina@example.com');
  await page.getByLabel('Estimated Value').fill('12500');
  await page.getByRole('button', { name: 'Save Lead' }).click();
  await page
    .getByRole('row', { name: /Amina Kimani/ })
    .getByRole('button', { name: 'Convert', exact: true })
    .click();
  await page.getByRole('tab', { name: 'Opportunities', exact: true }).click();
  await page.getByLabel('Stage for Amina Studio opportunity').selectOption('WON');
  await expect(page.locator('.stage-won')).toContainText('Amina Studio opportunity');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'CRM', exact: true })).toBeVisible();
  await expect(page.getByRole('img', { name: '100% win rate, 1 won and 0 lost' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Amina Kimani/ })).toBeVisible();
  const download = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export CSV' }).click(),
  ]).then(([event]) => event);
  expect(download.suggestedFilename()).toMatch(/^keen-crm-.*\.csv$/);
});

test('CRM overview shows live insights on desktop', async ({ page }, testInfo) => {
  await mockApi(page);
  await page.setViewportSize({ width: 1536, height: 1100 });
  await page.addInitScript(
    ({ key, records }) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(records));
    },
    { key: testCrmStorageKey, records: testCrmRecords },
  );
  await page.goto('/crm');
  await expect(page.getByRole('heading', { name: 'Pipeline performance' })).toBeVisible();
  await expect(page.getByRole('img', { name: '50% win rate, 1 won and 1 lost' })).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
  ).toBeLessThanOrEqual(1);
  await page.screenshot({ path: testInfo.outputPath('crm-desktop.png'), fullPage: true });
});

test('CRM stays within mobile viewports and supports moving opportunities', async ({
  page,
}, testInfo) => {
  await mockApi(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(
    ({ key, records }) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(records));
    },
    { key: testCrmStorageKey, records: testCrmRecords },
  );
  await page.goto('/crm');
  await expect(page.getByRole('heading', { name: 'Pipeline performance' })).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
  ).toBeLessThanOrEqual(1);
  await page.screenshot({ path: testInfo.outputPath('crm-mobile.png'), fullPage: true });
  await page.getByRole('tab', { name: 'Opportunities', exact: true }).click();
  await page.getByLabel('Stage for Atelier Nairobi seasonal order').selectOption('WON');
  await expect(page.locator('.stage-won')).toContainText('Atelier Nairobi seasonal order');
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
  ).toBeLessThanOrEqual(1);
});

test('apps platform desktop catalog and Inventory workspace', async ({ page }, testInfo) => {
  await mockApi(page);
  await page.setViewportSize({ width: 1536, height: 1024 });
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: /All your business on one platform/ }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open Point of Sale' })).toBeVisible();
  await expect(page.getByText('Planned · Not yet available')).toHaveCount(2);
  await page.screenshot({ path: testInfo.outputPath('apps-home-desktop.png'), fullPage: true });
  await page.getByRole('button', { name: 'Pin Inventory', exact: true }).click();
  await page.getByRole('link', { name: 'Open Inventory' }).click();
  await expect(page.getByRole('heading', { name: 'Inventory Overview' })).toBeVisible();
  await expect(
    page
      .getByRole('navigation', { name: 'Inventory navigation' })
      .getByRole('link', { name: 'Stock balances' }),
  ).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('inventory-app-desktop.png'), fullPage: true });
  await page.getByRole('button', { name: 'Open app launcher' }).click();
  const launcher = page.getByRole('dialog', { name: 'Switch application' });
  await expect(launcher).toBeVisible();
  await launcher.getByLabel('Find an application').fill('sales');
  await launcher.getByRole('link', { name: 'Sales', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Sales Overview' })).toBeVisible();
  await page.goto('/favorites');
  await expect(page.getByRole('link', { name: 'Open Inventory' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('link', { name: 'Open Inventory' })).toBeVisible();
});

test('apps platform mobile layout and accessible launcher', async ({ page }, testInfo) => {
  await mockApi(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/apps');
  await expect(
    page.getByRole('heading', { name: /All your business on one platform/ }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
  ).toBeLessThanOrEqual(1);
  await page.screenshot({ path: testInfo.outputPath('apps-home-mobile.png'), fullPage: true });
  await page.getByRole('button', { name: 'Open app launcher' }).click();
  await expect(page.getByRole('dialog', { name: 'Switch application' })).toBeVisible();
  await expect(page.getByLabel('Find an application')).toBeFocused();
  await page.getByRole('button', { name: 'Close app launcher', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Open app launcher' })).toBeFocused();
  await page.getByRole('button', { name: 'Open menu', exact: true }).click();
  await expect(page.getByRole('navigation', { name: 'Platform navigation' })).toBeVisible();
  await page
    .getByRole('navigation', { name: 'Platform navigation' })
    .getByRole('link', { name: 'Favorites' })
    .click();
  await expect(page.getByRole('heading', { name: 'Your favorite apps' })).toBeVisible();
});
