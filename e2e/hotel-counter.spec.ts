import { expect, test } from '@playwright/test';
import { mockHotel } from './support/hotelApi';
import { hotelBranchId, hotelWaiters } from '../src/test/hotelFixtures';
import { testUser } from '../src/test/fixtures';

async function addFoodItem(page: import('@playwright/test').Page, name = 'Lunch') {
  await page
    .getByRole('complementary', { name: 'Menu categories' })
    .getByRole('button', { name: 'Food menu' })
    .click();
  const picker = page.getByRole('list', { name: 'Item results' });
  await page.getByRole('searchbox', { name: 'Search food or products' }).fill(name);
  await picker.getByRole('button', { name: `Add ${name}`, exact: true }).click();
}

test('admin manages waiter names and receipt details; one sale prints two complete copies', async ({
  page,
}, testInfo) => {
  const data = await mockHotel(page);
  await page.goto('/hotel/service-settings');
  await page.getByLabel('Waiter name', { exact: true }).fill('Carol');
  await page.getByRole('button', { name: 'Add waiter', exact: true }).click();
  await expect(page.getByRole('cell', { name: 'Carol', exact: true })).toBeVisible();
  await page.getByLabel('Hotel name on receipts').fill('Test Hotel Restaurant');
  await page.getByLabel('Till number', { exact: true }).fill('772211');
  await page.getByLabel('Phone for complaints and orders').fill('+254700000222');
  await page.getByRole('button', { name: 'Save receipt details', exact: true }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Receipt details saved.' }),
  ).toBeVisible();
  await page
    .getByRole('navigation', { name: 'Hotel workspaces' })
    .getByRole('link', { name: 'Hotel checkout' })
    .click();
  await addFoodItem(page);
  await page
    .getByRole('combobox', { name: 'Served by', exact: true })
    .selectOption({ label: 'Carol' });
  await page.getByLabel('Table number (optional)').fill('7');
  await page.getByLabel('Payment / room charge').selectOption('MPESA');
  await page.getByLabel('Payment transaction reference').fill('TEST-RECEIPT-01');
  await page.getByRole('button', { name: 'Create Order' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('article')).toHaveCount(2);
  for (const name of ['Chef copy', 'Customer copy']) {
    const copy = dialog.getByRole('article', { name });
    await expect(copy).toContainText('Carol');
    await expect(copy).toContainText('Test Hotel Restaurant');
    await expect(copy).toContainText('772211');
    await expect(copy).toContainText('+254700000222');
    await expect(copy).toContainText('Lunch');
    await expect(copy).toContainText('250.00');
    await expect(copy).toContainText('Paid by MPESA');
    await expect(copy).toContainText('TEST-RECEIPT-01');
  }
  await expect
    .poll(() =>
      page.evaluate(() => (window as unknown as { hotelPrintCount: number }).hotelPrintCount),
    )
    .toBe(1);
  expect(data.orders).toHaveLength(1);
  const overflowingReceiptCells = () =>
    dialog.getByRole('article').evaluateAll((copies) =>
      copies.flatMap((copy) => {
        const bounds = copy.getBoundingClientRect();
        return Array.from(copy.querySelectorAll('th,td')).flatMap((cell) => {
          const rect = cell.getBoundingClientRect();
          return rect.left < bounds.left - 1 ||
            rect.right > bounds.right + 1 ||
            cell.scrollWidth > cell.clientWidth + 1
            ? [cell.textContent]
            : [];
        });
      }),
    );
  expect(await overflowingReceiptCells()).toEqual([]);
  await page.emulateMedia({ media: 'print' });
  expect(await overflowingReceiptCells()).toEqual([]);
  await page.locator('.hotel-double-receipts').screenshot({
    path: testInfo.outputPath('hotel-double-receipts.png'),
  });
  const pdf = await page.pdf({
    path: testInfo.outputPath('hotel-double-receipts.pdf'),
    width: '80mm',
    height: '200mm',
    printBackground: true,
  });
  expect(pdf.toString('latin1').match(/\/Type \/Page\b/g)).toHaveLength(2);
  const paperSizes = Array.from(
    pdf.toString('latin1').matchAll(/\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)\s*\]/g),
  );
  expect(paperSizes.length).toBeGreaterThan(0);
  for (const [, width, height] of paperSizes) {
    expect(Number(width)).toBeCloseTo((80 / 25.4) * 72, 0);
    expect(Number(height)).toBeCloseTo((200 / 25.4) * 72, 0);
  }
  await expect(page.getByRole('button', { name: 'Print both copies' })).toBeHidden();
});

test('hotel sales manager opens checkout only and can collect payment without kitchen steps', async ({
  page,
}) => {
  await mockHotel(page);
  await page.route('**/api/v1/me', (route) =>
    route.fulfill({
      json: {
        ...testUser,
        displayName: 'Hotel Counter',
        roleKeys: ['HOTEL_SALES_MANAGER'],
        roleNames: ['Hotel Sales Manager'],
        permissionCodes: ['hotel:sell'],
        branchIds: [hotelBranchId],
      },
    }),
  );
  await page.goto('/');
  await expect(page).toHaveURL(/\/hotel\/restaurant$/);
  await page.getByRole('button', { name: 'Hotel workspaces', exact: true }).click();
  const nav = page.getByRole('navigation', { name: 'Hotel workspaces' });
  await expect(nav.getByRole('link', { name: 'Waiters & receipts' })).toHaveCount(0);
  await expect(nav.getByRole('link', { name: 'Hotel reports' })).toHaveCount(0);
  await expect(nav.getByRole('link', { name: 'Kitchen orders' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Hotel workspaces', exact: true }).click();
  await addFoodItem(page);
  await page
    .getByRole('combobox', { name: 'Served by', exact: true })
    .selectOption(hotelWaiters[0].id);
  await page.getByLabel('Table number (optional)').fill('2');
  await page.getByRole('button', { name: 'Create Order' }).click();
  await expect(page.getByRole('dialog').getByRole('article', { name: 'Chef copy' })).toContainText(
    'Alice Waiter',
  );
  await page.getByRole('dialog').getByRole('button', { name: 'Close dialog' }).click();
  await page.getByRole('button', { name: /Orders/ }).click();
  await expect(
    page.getByRole('button', { name: /Mark ready|Start preparing|Mark served/ }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Take payment', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm payment', exact: true }).click();
  await expect(
    page.getByRole('dialog').getByRole('article', { name: 'Customer copy' }),
  ).toContainText('Paid by CASH');
  await page.goto('/hotel/service-settings');
  await expect(page).toHaveURL(/\/hotel\/restaurant$/);
});

test('each new order requires its waiter and printing copies never duplicates the sale', async ({
  page,
}) => {
  const data = await mockHotel(page);
  await page.goto('/apps/hotel');
  for (let index = 0; index < 2; index++) {
    await addFoodItem(page);
    await expect(page.getByRole('button', { name: 'Create Order' })).toBeDisabled();
    await page
      .getByRole('combobox', { name: 'Served by', exact: true })
      .selectOption(hotelWaiters[index].id);
    await page.getByLabel('Table number (optional)').fill(String(index + 1));
    await page.getByRole('button', { name: 'Create Order' }).click();
    await expect(
      page.getByRole('dialog').getByRole('article', { name: 'Customer copy' }),
    ).toContainText(hotelWaiters[index].name);
    await page.getByRole('dialog').getByRole('button', { name: 'Close dialog' }).click();
  }
  expect(data.orders).toHaveLength(2);
  expect(data.orders[0].servedByName).toBe('Brian Waiter');
  expect(data.orders[1].servedByName).toBe('Alice Waiter');
});
