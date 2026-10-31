import { expect, test, type Locator, type Page } from '@playwright/test';
import { mockApi } from './support/mockApi';
import { testProducts, testSuppliers } from '../src/test/fixtures';

const products = [
  {
    ...testProducts[0],
    name: 'Seasonal Oxford Shirt With Extended Packaging Options And Several Product Variants',
  },
  { ...testProducts[0], id: 'procurement-second-product', name: 'Cotton Trousers' },
];
const supplier = {
  ...testSuppliers[0],
  name: 'Keen Fashions Wholesale Clothing And Seasonal Collections Supplier',
  email: 'seasonal-collections-and-wholesale@example.com',
  address: 'Main wholesale warehouse, Nairobi, Kenya. Deliveries by appointment.',
};

async function setup(page: Page, width: number) {
  await page.setViewportSize({ width, height: width === 812 ? 375 : 844 });
  await mockApi(page);
  await page.route('**/api/v1/catalog/products', (route) => route.fulfill({ json: products }));
  await page.route('**/api/v1/suppliers', (route) => route.fulfill({ json: [supplier] }));
  await page.goto('/procurement');
  const builder = page.locator('.procurement-builder-panel');
  await builder.getByRole('combobox', { name: 'Supplier', exact: true }).selectOption(supplier.id);
  return builder;
}

async function expectNoOverlap(container: Locator, children: string) {
  const issues = await container.evaluate((element, selector) => {
    const parent = element.getBoundingClientRect();
    const items = [...element.querySelectorAll<HTMLElement>(selector)]
      .filter((item) => item.getClientRects().length > 0)
      .map((item) => ({
        name: item.getAttribute('aria-label') || item.textContent?.trim(),
        box: item.getBoundingClientRect(),
      }));
    const issues: string[] = [];
    for (let index = 0; index < items.length; index++) {
      const item = items[index];
      if (item.box.left < parent.left - 1 || item.box.right > parent.right + 1) {
        issues.push(`Outside parent: ${item.name}`);
      }
      for (const other of items.slice(index + 1)) {
        const overlapX =
          Math.min(item.box.right, other.box.right) - Math.max(item.box.left, other.box.left);
        const overlapY =
          Math.min(item.box.bottom, other.box.bottom) - Math.max(item.box.top, other.box.top);
        if (overlapX > 1 && overlapY > 1) issues.push(`${item.name} overlaps ${other.name}`);
      }
    }
    return issues;
  }, children);
  expect(issues).toEqual([]);
}

async function expectTappable(control: Locator) {
  await expect(control).toBeInViewport();
  const bounds = await control.evaluate((element) => {
    const box = element.getBoundingClientRect();
    return {
      width: box.width,
      height: box.height,
      right: box.right - innerWidth,
      bottom: box.bottom - innerHeight,
      uncovered: element.contains(
        document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2),
      ),
    };
  });
  expect(bounds.width).toBeGreaterThanOrEqual(44);
  expect(bounds.height).toBeGreaterThanOrEqual(44);
  expect(bounds.right).toBeLessThanOrEqual(1);
  expect(bounds.bottom).toBeLessThanOrEqual(1);
  expect(bounds.uncovered).toBe(true);
}

for (const width of [320, 390, 620, 768, 812]) {
  test(`purchase order fields, rows, actions and preview avoid overlap at ${width}px`, async ({
    page,
  }, testInfo) => {
    const builder = await setup(page, width);
    await expectNoOverlap(builder.locator('.procurement-meta-grid'), ':scope > label');
    const quantity = builder.getByLabel('Quantity before adding product', { exact: true });
    await quantity.fill('12');
    const search = builder.getByRole('combobox', { name: 'Search products to add', exact: true });
    await search.fill('Seasonal Oxford');
    await page.getByRole('option', { name: products[0].name, exact: true }).click();
    const row = builder.locator('.procurement-line-row').first();
    await expect(
      row.getByRole('spinbutton', { name: `Quantity for ${products[0].name}`, exact: true }),
    ).toHaveValue('12');
    await row
      .getByRole('spinbutton', { name: `Quantity for ${products[0].name}`, exact: true })
      .fill('1234');
    await row
      .getByRole('spinbutton', { name: `Unit price for ${products[0].name}`, exact: true })
      .fill('123456.78');
    await expect(row.getByText('Quantity', { exact: true })).toBeVisible();
    await expect(row.getByText('Unit price', { exact: true })).toBeVisible();
    await expectNoOverlap(row, ':scope > div, :scope > label, :scope > button');
    const total = row.locator('.procurement-line-total strong');
    const totalBounds = await row.locator('.procurement-line-total').boundingBox();
    expect(totalBounds!.width).toBeGreaterThan((await row.boundingBox())!.width * 0.8);
    expect(
      await total.evaluate((element) => element.scrollWidth - element.clientWidth),
    ).toBeLessThanOrEqual(1);
    await row
      .getByRole('button', { name: `Remove ${products[0].name}`, exact: true })
      .scrollIntoViewIfNeeded();
    await expectTappable(
      row.getByRole('button', { name: `Remove ${products[0].name}`, exact: true }),
    );
    if (width === 390) {
      await row.screenshot({ path: testInfo.outputPath('purchase-item-mobile.png') });
    }
    await search.fill('Cotton Trousers');
    await page.getByRole('option', { name: products[1].name, exact: true }).click();
    await builder
      .getByRole('textbox', { name: 'Terms & Delivery Notes', exact: true })
      .fill('Deliver the specified quantities and pricing to the main warehouse. '.repeat(5));
    await expectNoOverlap(builder.locator('.form-actions'), ':scope > button');
    if (width <= 620)
      await expectNoOverlap(page.locator('.procurement-mobile-toolbar'), ':scope > button');
    const preview =
      width <= 620
        ? page
            .locator('.procurement-mobile-toolbar')
            .getByRole('button', { name: 'Preview', exact: true })
        : builder.getByRole('button', { name: 'Preview', exact: true });
    await preview.click();
    const dialog = page.getByRole('dialog', { name: 'P.O Preview', exact: true });
    const close = dialog.getByRole('button', { name: 'Close purchase order preview', exact: true });
    await expectTappable(close);
    const dialogBounds = await dialog.boundingBox();
    expect(dialogBounds!.y + dialogBounds!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
    await expectNoOverlap(
      dialog.locator('.procurement-preview-dialog-header'),
      ':scope > div, :scope > button',
    );
    await expectNoOverlap(dialog.locator('.header-actions'), ':scope > button');
    const content = dialog.locator('.procurement-document-print-root');
    if (width <= 620) {
      expect(
        await content.evaluate((element) => element.scrollWidth - element.clientWidth),
      ).toBeLessThanOrEqual(1);
    }
    await content.evaluate((element) => (element.scrollTop = element.scrollHeight));
    await expectTappable(close);
    await expect(dialog.getByRole('button', { name: 'Link', exact: true })).toBeInViewport();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
    ).toBeLessThanOrEqual(1);
    if (width === 390) {
      await page.screenshot({ path: testInfo.outputPath('purchase-preview-mobile.png') });
    }
    await close.click();
    await expect(preview).toBeFocused();
    expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');
    await builder.getByRole('button', { name: `Remove ${products[1].name}`, exact: true }).click();
    await expect(builder.locator('.procurement-line-row')).toHaveCount(1);
    await builder.getByRole('button', { name: 'Save P.O', exact: true }).click();
    await expect(page.getByText('Purchase order PO-0001 saved.', { exact: true })).toBeVisible();
    if (width <= 620) {
      await expectNoOverlap(
        page.locator('.commercial-document-card .commercial-card-actions'),
        ':scope > button',
      );
    }
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
    ).toBeLessThanOrEqual(1);
  });
}
