import { expect, test, type Locator, type Page } from '@playwright/test';
import { mockApi } from './support/mockApi';
import { testProducts } from '../src/test/fixtures';
import { testCrmRecords, testCrmStorageKey } from '../src/test/crmFixtures';

const routes = [
  '/login',
  '/apps',
  '/favorites',
  '/recent',
  '/dashboard',
  '/apps/pos',
  '/apps/sales',
  '/apps/inventory',
  '/apps/products',
  '/apps/warehouse',
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

async function setup(page: Page, width = 390, height = 844) {
  await page.setViewportSize({ width, height });
  await mockApi(page);
  await page.addInitScript(
    ({ key, records }) => {
      localStorage.setItem(key, JSON.stringify(records));
    },
    { key: testCrmStorageKey, records: testCrmRecords },
  );
}

async function expectTappable(locator: Locator) {
  await expect(locator).toBeVisible();
  const result = await locator.evaluate((element) => {
    const box = element.getBoundingClientRect();
    return {
      width: box.width,
      height: box.height,
      left: box.left,
      right: box.right,
      top: box.top,
      bottom: box.bottom,
      viewportWidth: innerWidth,
      viewportHeight: innerHeight,
      uncovered: element.contains(
        document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2),
      ),
    };
  });
  expect(result.height).toBeGreaterThanOrEqual(44);
  expect(result.left).toBeGreaterThanOrEqual(0);
  expect(result.right).toBeLessThanOrEqual(result.viewportWidth + 1);
  expect(result.top).toBeGreaterThanOrEqual(0);
  expect(result.bottom).toBeLessThanOrEqual(result.viewportHeight + 1);
  expect(result.uncovered).toBe(true);
}

for (const width of [320, 390, 768]) {
  test(`all workspaces fit and controls remain readable at ${width}px`, async ({ page }) => {
    test.setTimeout(120_000);
    await setup(page, width, width === 320 ? 640 : 1024);
    for (const route of routes) {
      await page.goto(route);
      await page.locator('h1,h2').first().waitFor();
      await expect(page.getByText('Unexpected Application Error!', { exact: true })).toHaveCount(0);
      const layout = await page.evaluate(() => {
        const visible = (element: Element) => {
          const box = element.getBoundingClientRect();
          return (
            box.width > 0 && box.height > 0 && getComputedStyle(element).visibility !== 'hidden'
          );
        };
        return {
          overflow: document.documentElement.scrollWidth - innerWidth,
          inputs: [
            ...document.querySelectorAll(
              'input:not([type="checkbox"]):not([type="radio"]):not([type="hidden"]), select, textarea',
            ),
          ]
            .filter(visible)
            .map((element) => ({
              font: parseFloat(getComputedStyle(element).fontSize),
              height: element.getBoundingClientRect().height,
            })),
          workspaceEdges: [
            ...document.querySelectorAll('.platform-workspace-header,.platform-workspace-tools'),
          ]
            .filter(visible)
            .map((element) => element.getBoundingClientRect().right - innerWidth),
        };
      });
      expect(layout.overflow, route).toBeLessThanOrEqual(1);
      expect(
        layout.workspaceEdges.every((edge) => edge <= 1),
        route,
      ).toBe(true);
      expect(
        layout.inputs.every((input) => input.font >= 16 && input.height >= 44),
        route,
      ).toBe(true);
    }
  });
}

test('phone menu traps focus, closes on the current route and restores navigation focus', async ({
  page,
}) => {
  await setup(page);
  await page.goto('/apps');
  const menu = page.getByRole('button', { name: 'Open menu', exact: true });
  await expectTappable(menu);
  await expectTappable(page.getByRole('button', { name: 'Log out', exact: true }));
  await expectTappable(page.getByLabel('Business branch', { exact: true }));
  await menu.click();
  const navigation = page.getByRole('complementary', { name: 'Primary navigation' });
  await expect(navigation).toBeVisible();
  expect(await navigation.evaluate((element) => element.contains(document.activeElement))).toBe(
    true,
  );
  await page.keyboard.press('Shift+Tab');
  expect(await navigation.evaluate((element) => element.contains(document.activeElement))).toBe(
    true,
  );
  await page.keyboard.press('Escape');
  await expect(menu).toBeFocused();
  await menu.click();
  await page
    .getByRole('navigation', { name: 'Platform navigation' })
    .getByRole('link', { name: 'Apps', exact: true })
    .click();
  await expect(navigation).toBeHidden();
  await expect(menu).toBeFocused();
  await page.getByRole('button', { name: 'Open app launcher', exact: true }).click();
  const launcher = page.getByRole('dialog', { name: 'Switch application' });
  await launcher.getByLabel('Find an application').fill('inventory');
  await launcher.getByRole('link', { name: 'Inventory', exact: true }).click();
  await expect(page).toHaveURL(/\/apps\/inventory$/);
  await expectTappable(page.getByRole('link', { name: 'Back to Apps', exact: true }));
  await page.getByRole('link', { name: 'Back to Apps', exact: true }).click();
  await expect(page).toHaveURL(/\/apps$/);
});

for (const width of [320, 390, 768, 812]) {
  test(`phone checkout reaches cart and payment without traversing a long catalog at ${width}px`, async ({
    page,
  }) => {
    await setup(page, width, width === 812 ? 375 : 844);
    await page.route('**/api/v1/catalog/products', (route) =>
      route.fulfill({
        json: [
          ...testProducts,
          ...Array.from({ length: 20 }, (_, index) => ({
            ...testProducts[0],
            id: `extra-${index}`,
            name: `More product ${index}`,
          })),
        ],
      }),
    );
    let posted: Record<string, unknown> | undefined;
    page.on('request', (request) => {
      if (new URL(request.url()).pathname === '/api/v1/sales' && request.method() === 'POST')
        posted = request.postDataJSON();
    });
    await page.goto('/pos');
    const mobileBar = page.getByRole('navigation', { name: 'Mobile checkout' });
    await expectTappable(mobileBar.getByRole('button', { name: /^Checkout/ }));
    await expect(mobileBar.getByRole('button', { name: /^Checkout/ })).toBeDisabled();
    await page.getByRole('button', { name: 'Add', exact: true }).first().click();
    await expect(mobileBar.getByRole('button', { name: 'Cart (1)', exact: true })).toBeVisible();
    await mobileBar.getByRole('button', { name: 'Cart (1)', exact: true }).click();
    await expect(page.getByRole('complementary', { name: 'Current cart' })).toBeFocused();
    const removeOne = page.getByRole('button', {
      name: `Remove one ${testProducts[0].name}`,
      exact: true,
    });
    await removeOne.scrollIntoViewIfNeeded();
    await expectTappable(removeOne);
    const addOne = page.getByRole('button', {
      name: `Add one ${testProducts[0].name}`,
      exact: true,
    });
    await expectTappable(addOne);
    await addOne.click();
    await expect(mobileBar.getByRole('button', { name: 'Cart (2)', exact: true })).toBeVisible();
    await removeOne.click();
    await mobileBar.getByRole('button', { name: 'Products', exact: true }).click();
    await expect(
      page.getByRole('region', { name: 'Product catalogue', exact: true }),
    ).toBeFocused();
    await mobileBar.getByRole('button', { name: /^Checkout/ }).click();
    const payment = page.getByRole('dialog', { name: 'Payment', exact: true });
    await payment.getByLabel('Payment method', { exact: true }).selectOption('CASH');
    await payment.getByLabel('Cash received', { exact: true }).fill('3500');
    const complete = payment.getByRole('button', { name: /Complete Sale/ });
    await expectTappable(complete);
    await complete.click();
    await expect(page.getByRole('dialog', { name: 'Receipt', exact: true })).toBeVisible();
    expect(posted?.payments).toEqual([
      { method: 'CASH', amount: 3248, paymentReference: '', cashReceived: 3500 },
    ]);
  });
}

test('product edit actions remain tappable with a short phone viewport and long variant form', async ({
  page,
}) => {
  await setup(page, 320, 640);
  const parent = {
    ...testProducts[0],
    id: 'variable-parent',
    productType: 'VARIABLE',
    name: 'Parent product',
  };
  const variant = {
    ...testProducts[0],
    parentProductId: parent.id,
    productType: 'SIMPLE',
    variantAttributes: Object.fromEntries(
      Array.from({ length: 8 }, (_, index) => [`Attribute ${index}`, `Value ${index}`]),
    ),
  };
  await page.route('**/api/v1/catalog/products', (route) =>
    route.fulfill({ json: [variant, parent] }),
  );
  await page.goto('/product-catalog');
  await page.getByRole('button', { name: `Details and actions for ${variant.name}` }).click();
  await page.getByRole('button', { name: 'Edit', exact: true }).first().click();
  const dialog = page.getByRole('dialog', { name: 'Edit Product', exact: true });
  await expectTappable(dialog.getByRole('button', { name: 'Save Changes', exact: true }));
  await page.setViewportSize({ width: 320, height: 420 });
  await expectTappable(dialog.getByRole('button', { name: 'Cancel', exact: true }));
  await dialog.getByLabel('Image URL', { exact: true }).scrollIntoViewIfNeeded();
  await expect(dialog.getByLabel('Image URL', { exact: true })).toBeInViewport();
  await expectTappable(dialog.getByRole('button', { name: 'Save Changes', exact: true }));
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(dialog).toHaveCount(0);
});

test('M-Pesa confirmation remains usable after a phone viewport shrinks and a refresh', async ({
  page,
}) => {
  await setup(page);
  let payment: Record<string, unknown> | undefined;
  let pushes = 0;
  let paymentKey = '';
  let saleKey = '';
  let receipt = '';
  await page.route('**/api/v1/mpesa/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path.endsWith('/config')) return route.fulfill({ json: { enabled: true } });
    if (path.endsWith('/stkpush')) {
      pushes++;
      paymentKey = request.headers()['idempotency-key'];
      payment = {
        id: 'mobile-payment',
        status: 'PENDING',
        amount: 3248,
        phoneMask: '254***5678',
        message: 'Enter your M-Pesa PIN on your phone',
        createdAt: new Date().toISOString(),
      };
      return route.fulfill({ status: 202, json: payment });
    }
    return payment
      ? route.fulfill({ json: payment })
      : route.fulfill({ status: 404, json: { detail: 'Payment not found' } });
  });
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === '/api/v1/sales' && request.method() === 'POST') {
      saleKey = request.headers()['idempotency-key'];
      receipt = request.postDataJSON().payments[0].paymentReference;
    }
  });
  await page.goto('/pos');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await page
    .getByRole('navigation', { name: 'Mobile checkout' })
    .getByRole('button', { name: /^Checkout/ })
    .click();
  const dialog = page.getByRole('dialog', { name: 'Payment', exact: true });
  await dialog.getByLabel('Payment method', { exact: true }).selectOption('MPESA');
  await dialog.getByLabel('Customer M-Pesa phone number', { exact: true }).fill('0712345678');
  await page.setViewportSize({ width: 390, height: 480 });
  await dialog.getByRole('button', { name: 'Send STK Push', exact: true }).click();
  await expect(
    dialog.getByText('Enter your M-Pesa PIN on your phone', { exact: true }),
  ).toBeVisible();
  await expect(dialog.getByRole('button', { name: /Complete Sale/ })).toBeDisabled();
  payment = {
    ...payment,
    status: 'SUCCEEDED',
    message: 'Payment confirmed',
    receiptNumber: 'TESTMOBILE01',
  };
  await expect(dialog.getByText('Receipt: TESTMOBILE01', { exact: true })).toBeVisible();
  await expectTappable(dialog.getByRole('button', { name: /Complete Sale/ }));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(dialog.getByText('Receipt: TESTMOBILE01', { exact: true })).toBeVisible();
  expect(pushes).toBe(1);
  await dialog.getByRole('button', { name: /Complete Sale/ }).click();
  await expect(page.getByRole('dialog', { name: 'Receipt', exact: true })).toBeVisible();
  expect(saleKey).toBe(paymentKey);
  expect(receipt).toBe('TESTMOBILE01');
  await page.emulateMedia({ media: 'print' });
  await expect(page.getByRole('navigation', { name: 'Mobile checkout' })).toBeHidden();
});

test('resizing an open mobile menu restores desktop scrolling', async ({ page }) => {
  await setup(page);
  await page.goto('/apps');
  await page.getByRole('button', { name: 'Open menu', exact: true }).click();
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden');
  await page.setViewportSize({ width: 1536, height: 900 });
  await expect(page.locator('.platform-rail')).not.toHaveClass(/menu-open/);
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');
  await expect(
    page
      .getByRole('navigation', { name: 'Platform navigation' })
      .getByRole('link', { name: 'Apps', exact: true }),
  ).toBeVisible();
});
