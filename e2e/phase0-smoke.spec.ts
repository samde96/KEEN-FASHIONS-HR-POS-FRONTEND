import { expect, test, type Page } from '@playwright/test';
import {
  testBranches,
  testExpenses,
  testInventory,
  testOrganization,
  testPermissions,
  testProductCategories,
  testProducts,
  testRoles,
  testSuppliers,
  testUser,
} from '../src/test/fixtures';

test('owner can open login screen and enter the dashboard', async ({ page }) => {
  await mockApi(page);
  await page.goto('/login');

  await expect(page.getByRole('heading', { name: 'User Login' })).toBeVisible();
  await page.getByLabel(/Email or username/i).fill('admin@example.com');
  await page.getByLabel('Password').fill('keenpos125');
  await page.getByRole('button', { name: /login/i }).click();

  await expect(page.getByRole('heading', { name: "Today's Dashboard" })).toBeVisible();
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

test('dashboard metric cards use compact two by two mobile layout', async ({ page }) => {
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
  expect(metricsLayout.labelFontSize).toBeLessThanOrEqual(11);
  expect(metricsLayout.valueFontSize).toBeLessThanOrEqual(17);
});

test('cashier can search, add an item, and open payment shell', async ({ page }) => {
  await mockApi(page);
  await page.goto('/pos');

  await expect(page.getByAltText('KEEN HR and POS')).toBeVisible();
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

test('product catalog fits mobile viewports and downloads Excel', async ({ page }) => {
  await mockApi(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/product-catalog');

  await expect(page.getByRole('heading', { name: 'Product Catalog' })).toBeVisible();
  await expect(page.getByText('Oxford Shirt')).toBeVisible();

  const overflow = await page.evaluate(() => {
    const catalogTable = document.querySelector('.catalog-table-scroll');
    return {
      page: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      catalog:
        catalogTable instanceof HTMLElement
          ? catalogTable.scrollWidth - catalogTable.clientWidth
          : 0,
    };
  });

  expect(overflow.page).toBeLessThanOrEqual(1);
  expect(overflow.catalog).toBeLessThanOrEqual(1);

  const download = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /download excel/i }).click(),
  ]).then(([downloadEvent]) => downloadEvent);

  expect(download.suggestedFilename()).toBe('keen-product-catalog.xlsx');
});

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
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Branch Stock' })).toHaveCount(0);

  await page.getByRole('button', { name: 'Stock Alerts' }).click();
  const alertsDialog = page.getByRole('dialog', { name: 'Stock Alerts' });
  await expect(alertsDialog).toBeVisible();
  await expect(alertsDialog.getByText('No stock alerts')).toBeVisible();
});

test('roles page keeps registered roles primary and opens management dialogs from top buttons', async ({
  page,
}) => {
  await mockApi(page);
  await page.setViewportSize({ width: 1536, height: 960 });
  await page.goto('/roles');

  await expect(page.getByRole('heading', { name: 'Roles', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Registered Roles' })).toBeVisible();
  await expect(
    page.locator('.roles-list-panel strong').filter({ hasText: 'Cashier' }),
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

  await page.getByRole('button', { name: 'New Role' }).click();
  const roleDialog = page.getByRole('dialog', { name: 'Register Role' });
  await expect(roleDialog).toBeVisible();
  await expect(roleDialog.getByLabel('Role Name')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Register Role' })).toHaveCount(0);

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

async function mockApi(page: Page) {
  const inventory =
    testInventory.length > 0
      ? testInventory
      : [
          {
            id: 'inventory-001',
            branchId: testBranches[0].id,
            branchName: testBranches[0].name,
            productId: testProducts[0].id,
            productName: testProducts[0].name,
            sku: testProducts[0].sku,
            categoryName: testProducts[0].categoryName,
            unitPrice: testProducts[0].unitPrice,
            quantityOnHand: 2,
            quantityReserved: 0,
            quantityAvailable: 2,
            reorderLevel: 0,
            stockHealth: 'HEALTHY',
          },
        ];
  let sales: unknown[] = [];
  let stockIntakes: unknown[] = [
    {
      id: 'stock-intake-001',
      branchId: testBranches[0].id,
      branchName: testBranches[0].name,
      productId: testProducts[0].id,
      productName: 'Berrykey Mens Trench Coats Casual Blazers With Extended Seasonal Label',
      sku: 'BLAZER-EXT-001',
      supplierName: 'Keen Fashions Wholesale Department',
      referenceNumber: 'REFERENCE-2026-0001',
      quantity: 12,
      unitCost: 1500,
      notes: '',
      receivedAt: '2026-09-08T12:10:00Z',
    },
    {
      id: 'stock-intake-002',
      branchId: testBranches[0].id,
      branchName: testBranches[0].name,
      productId: testProducts[0].id,
      productName: 'White T-Shirt Essential Logo Soft Cotton Stop Top For Men',
      sku: 'TS003',
      supplierName: 'Keen Fashions',
      referenceNumber: '',
      quantity: 11,
      unitCost: 1000,
      notes: '',
      receivedAt: '2026-09-08T12:00:00Z',
    },
  ];

  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;

    if (path === '/api/v1/auth/logout') {
      await route.fulfill({ status: 204 });
      return;
    }

    if (path === '/api/v1/auth/login' || path === '/api/v1/me') {
      await route.fulfill({ json: testUser });
      return;
    }

    if (path === '/api/v1/organization/current') {
      await route.fulfill({ json: testOrganization });
      return;
    }

    if (path === '/api/v1/branches') {
      await route.fulfill({ json: testBranches });
      return;
    }

    if (path === '/api/v1/roles') {
      await route.fulfill({ json: testRoles });
      return;
    }

    if (path === '/api/v1/permissions') {
      await route.fulfill({ json: testPermissions });
      return;
    }

    if (path === '/api/v1/catalog/categories') {
      await route.fulfill({ json: testProductCategories });
      return;
    }

    if (path === '/api/v1/catalog/products') {
      await route.fulfill({ json: testProducts });
      return;
    }

    if (path === '/api/v1/suppliers') {
      await route.fulfill({ json: testSuppliers });
      return;
    }

    if (path === '/api/v1/inventory') {
      await route.fulfill({ json: inventory });
      return;
    }

    if (path === '/api/v1/stock-intakes') {
      if (request.method() === 'POST') {
        const postedRequest = await request.postDataJSON();
        const product = testProducts.find((item) => item.id === postedRequest.productId);
        const branch = testBranches.find((item) => item.id === postedRequest.branchId);
        const stockIntake = {
          id: `stock-intake-${stockIntakes.length + 1}`,
          branchId: postedRequest.branchId,
          branchName: branch?.name ?? 'Unknown Branch',
          productId: postedRequest.productId,
          productName: product?.name ?? 'Unknown Product',
          sku: product?.sku ?? 'N/A',
          supplierName: postedRequest.supplierName,
          referenceNumber: postedRequest.referenceNumber,
          quantity: postedRequest.quantity,
          unitCost: postedRequest.unitCost,
          notes: postedRequest.notes,
          receivedAt: '2026-09-08T12:20:00Z',
        };

        stockIntakes = [stockIntake, ...stockIntakes];
        await route.fulfill({ status: 201, json: stockIntake });
        return;
      }

      await route.fulfill({ json: stockIntakes });
      return;
    }

    if (path === '/api/v1/sales') {
      if (request.method() === 'POST') {
        const sale = {
          id: 'sale-001',
          saleNumber: 'SALE-001',
          branchId: testBranches[0].id,
          branchName: testBranches[0].name,
          customerName: null,
          subtotalAmount: 2800,
          discountAmount: 0,
          taxAmount: 448,
          totalAmount: 3248,
          status: 'COMPLETED',
          soldAt: '2026-09-08T10:00:00Z',
          lines: [
            {
              productId: testProducts[0].id,
              productName: testProducts[0].name,
              sku: testProducts[0].sku,
              categoryName: testProducts[0].categoryName,
              quantity: 1,
              unitPrice: testProducts[0].unitPrice,
              costPrice: testProducts[0].costPrice,
              lineTotal: testProducts[0].unitPrice,
            },
          ],
          payments: [
            {
              id: 'payment-001',
              method: 'MPESA',
              amount: 3248,
              status: 'SETTLED',
            },
          ],
        };
        sales = [sale, ...sales];
        await route.fulfill({ status: 201, json: sale });
        return;
      }

      await route.fulfill({ json: sales });
      return;
    }

    if (path === '/api/v1/expenses') {
      await route.fulfill({ json: testExpenses });
      return;
    }

    await route.fallback();
  });
}
