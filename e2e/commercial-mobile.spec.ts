import { expect, test, type Locator, type Page } from '@playwright/test';
import { mockApi } from './support/mockApi';

async function setup(page: Page, width = 390, height = 844) {
  await page.setViewportSize({ width, height });
  await mockApi(page);
  await page.goto('/commercial');
  await expect(page.getByRole('heading', { name: 'Document Builder', exact: true })).toBeVisible();
  return page.locator('.commercial-builder-panel');
}

async function expectTappable(control: Locator) {
  await expect(control).toBeInViewport();
  const geometry = await control.evaluate((element) => {
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
  expect(geometry.width).toBeGreaterThanOrEqual(44);
  expect(geometry.height).toBeGreaterThanOrEqual(44);
  expect(geometry.left).toBeGreaterThanOrEqual(0);
  expect(geometry.right).toBeLessThanOrEqual(geometry.viewportWidth);
  expect(geometry.top).toBeGreaterThanOrEqual(0);
  expect(geometry.bottom).toBeLessThanOrEqual(geometry.viewportHeight);
  expect(geometry.uncovered).toBe(true);
}

for (const width of [320, 390, 768, 812]) {
  test(`mobile invoice preview keeps an exit visible after scrolling at ${width}px`, async ({
    page,
  }) => {
    const builder = await setup(page, width, width === 812 ? 375 : 844);
    await expect(builder.locator('input:visible')).toHaveCount(4);
    const previewButton = builder.getByRole('button', { name: 'Preview invoice', exact: true });
    const saveButton = builder.getByRole('button', { name: 'Save Invoice', exact: true });
    await expectTappable(previewButton);
    await expectTappable(saveButton);
    for (let index = 0; index < 6; index++) {
      await builder.getByRole('button', { name: 'Add Line', exact: true }).click();
    }
    await previewButton.click();
    const dialog = page.getByRole('dialog', { name: 'Document preview', exact: true });
    const close = dialog.getByRole('button', { name: 'Close preview', exact: true });
    await expect(close).toContainText('Back to editor');
    await expectTappable(close);
    const content = dialog.locator('.commercial-document-print-root');
    await content.evaluate((element) => (element.scrollTop = element.scrollHeight));
    expect(await content.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
    await expectTappable(close);
    expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden');
    await page.keyboard.press('Tab');
    expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true);
    await close.click();
    await expect(dialog).toHaveCount(0);
    await expect(previewButton).toBeFocused();
    expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');
    await previewButton.click();
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(previewButton).toBeFocused();
    await builder.getByRole('button', { name: 'Preview', exact: true }).click();
    await expectTappable(close);
    await page.mouse.click(2, 2);
    await expect(dialog).toHaveCount(0);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
    ).toBeLessThanOrEqual(1);
  });
}

test('mobile invoice sections retain optional fields and calculate the saved invoice', async ({
  page,
}) => {
  const builder = await setup(page);
  await builder.getByLabel('Customer Name', { exact: true }).fill('Jane Customer');
  await builder.getByLabel('Description', { exact: true }).fill('Oxford shirts');
  await builder.getByLabel('Qty', { exact: true }).fill('2');
  await builder.getByLabel('Rate', { exact: true }).fill('5000');
  const tax = builder.getByRole('button', { name: /Discount & tax/ });
  await expect(tax).toContainText('16% tax');
  await tax.click();
  await builder.getByLabel('Disc. %', { exact: true }).fill('10');
  await tax.click();
  const contact = builder.getByRole('button', { name: /Customer contact/ });
  await contact.click();
  await builder.getByLabel('Company', { exact: true }).fill('Jane Retail');
  await builder.getByLabel('Email', { exact: true }).fill('customer@example.com');
  await contact.click();
  const payment = builder.getByRole('button', { name: /Payment details/ });
  await payment.click();
  await builder.getByLabel('Amount Paid', { exact: true }).fill('1000');
  await builder.getByLabel('Bank Name', { exact: true }).fill('Test Bank');
  await payment.click();
  const notes = builder.getByRole('button', { name: /Notes & messages/ });
  await notes.click();
  await builder.getByLabel('Notes', { exact: true }).fill('Delivery to the flagship branch.');
  await notes.click();
  await expect(builder.locator('.commercial-mobile-total')).toContainText('9,440');
  await expectTappable(builder.getByRole('button', { name: 'Save Invoice', exact: true }));
  await builder.getByRole('button', { name: 'Save Invoice', exact: true }).click();
  await expect(page.getByText('Invoice INV-0001 saved.', { exact: true })).toBeVisible();
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('keen-commercial-documents-v1') || '[]'),
  );
  expect(saved[0]).toMatchObject({
    customerName: 'Jane Customer',
    customerCompany: 'Jane Retail',
    customerEmail: 'customer@example.com',
    amountPaid: '1000',
    bankName: 'Test Bank',
    notes: 'Delivery to the flagship branch.',
    lines: [
      {
        description: 'Oxford shirts',
        quantity: '2',
        unitPrice: '5000',
        discountRate: '10',
        taxRate: '16',
      },
    ],
  });
  await page.reload();
  await expect(page.locator('.commercial-document-card-list')).toContainText('INV-0001');
});

test('saving opens an invoice section containing an invalid hidden required field', async ({
  page,
}) => {
  const builder = await setup(page);
  await builder.getByLabel('Customer Name', { exact: true }).fill('Jane Customer');
  await builder.getByLabel('Rate', { exact: true }).fill('500');
  const details = builder.getByRole('button', { name: /Invoice details/ });
  await details.click();
  await builder.getByLabel('Title', { exact: true }).fill('');
  await details.click();
  await expect(builder.getByLabel('Title', { exact: true })).toBeHidden();
  await builder.getByRole('button', { name: 'Save Invoice', exact: true }).click();
  await expect(details).toHaveAttribute('aria-expanded', 'true');
  await expect(builder.getByLabel('Title', { exact: true })).toBeFocused();
  await builder.getByLabel('Title', { exact: true }).fill('Customer Invoice');
  await builder.getByRole('button', { name: 'Save Invoice', exact: true }).click();
  await expect(page.getByText('Invoice INV-0001 saved.', { exact: true })).toBeVisible();
});

test('invoice preview can close after resizing to desktop and desktop fields remain available', async ({
  page,
}) => {
  const builder = await setup(page);
  await builder.getByRole('button', { name: 'Preview invoice', exact: true }).click();
  await page.setViewportSize({ width: 1440, height: 1000 });
  const dialog = page.getByRole('dialog', { name: 'Document preview', exact: true });
  await expectTappable(dialog.getByRole('button', { name: 'Close preview', exact: true }));
  await dialog.getByRole('button', { name: 'Close preview', exact: true }).click();
  await expect(builder.getByLabel('Title', { exact: true })).toBeVisible();
  await expect(builder.getByLabel('Company', { exact: true })).toBeVisible();
  await expect(builder.getByLabel('Bank Name', { exact: true })).toBeVisible();
  await expect(builder.getByRole('button', { name: 'Share Link', exact: true })).toBeVisible();
  await expect(builder.getByRole('button', { name: /Invoice details/ })).toBeHidden();
});
