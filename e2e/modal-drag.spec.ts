import { expect, test, type Locator, type Page } from '@playwright/test';
import { mockApi } from './support/mockApi';

type DialogCase = {
  name: string;
  path: string;
  openButton: string;
  dialogName: string;
  closeButton: string;
  autoOpen?: boolean;
  width?: number;
  field?: { label: string; value: string };
};

const dialogs: DialogCase[] = [
  {
    name: 'product editor',
    path: '/product-catalog',
    openButton: 'New Product',
    dialogName: 'Register Product',
    closeButton: 'Close product dialog',
    field: { label: 'Product Name', value: 'Unfinished product' },
  },
  {
    name: 'category editor',
    path: '/product-categories',
    openButton: 'New Category',
    dialogName: 'New Category',
    closeButton: 'Close category dialog',
    field: { label: 'Category Name', value: 'Unfinished category' },
  },
  {
    name: 'supplier receipt',
    path: '/add-stock',
    openButton: 'Supplier Receipt',
    dialogName: 'Supplier Receipt',
    closeButton: 'Close supplier receipt',
    autoOpen: true,
    field: { label: 'Reference', value: 'UNFINISHED-RECEIPT' },
  },
  {
    name: 'supplier receipt on mobile',
    path: '/add-stock',
    openButton: 'Supplier Receipt',
    dialogName: 'Supplier Receipt',
    closeButton: 'Close supplier receipt',
    autoOpen: true,
    width: 390,
    field: { label: 'Reference', value: 'UNFINISHED-MOBILE-RECEIPT' },
  },
  {
    name: 'stock adjustment',
    path: '/inventory',
    openButton: 'Adjust Count',
    dialogName: 'Adjust Stock Count',
    closeButton: 'Close adjustment dialog',
    field: { label: 'Reason', value: 'Unfinished stock count' },
  },
  {
    name: 'inventory insight',
    path: '/inventory',
    openButton: 'Category Mix',
    dialogName: 'Category Mix',
    closeButton: 'Close category mix',
  },
  {
    name: 'role editor',
    path: '/roles',
    openButton: 'Edit',
    dialogName: 'Edit Role',
    closeButton: 'Close role dialog',
  },
  {
    name: 'permissions editor',
    path: '/roles',
    openButton: 'Permissions',
    dialogName: 'Permissions',
    closeButton: 'Close permissions dialog',
    field: { label: 'Permission Code', value: 'draft:permission' },
  },
  {
    name: 'purchase order preview',
    path: '/procurement',
    openButton: 'Preview',
    dialogName: 'P.O Preview',
    closeButton: 'Close purchase order preview',
  },
  {
    name: 'invoice preview',
    path: '/commercial',
    openButton: 'Preview invoice',
    dialogName: 'Document preview',
    closeButton: 'Close preview',
    width: 768,
  },
  {
    name: 'app launcher',
    path: '/apps',
    openButton: 'Open app launcher',
    dialogName: 'Switch application',
    closeButton: 'Close app launcher',
  },
];

async function expectDragsToKeepOpen(page: Page, dialog: Locator) {
  const title = dialog.locator('h2, header strong').first();
  await title.scrollIntoViewIfNeeded();
  const bounds = await title.boundingBox();
  expect(bounds).not.toBeNull();
  const inside = { x: bounds!.x + bounds!.width / 2, y: bounds!.y + bounds!.height / 2 };
  const outsideLeft = { x: 2, y: inside.y };
  const outsideRight = { x: page.viewportSize()!.width - 2, y: inside.y };

  // Moving away without pressing a button must also leave the view open.
  await page.mouse.move(inside.x, inside.y);
  await page.mouse.move(outsideLeft.x, outsideLeft.y);
  await expect(dialog).toBeVisible();

  for (const outside of [outsideLeft, outsideRight]) {
    await page.mouse.move(inside.x, inside.y);
    await page.mouse.down();
    await page.mouse.move(outside.x, outside.y, { steps: 8 });
    await page.mouse.up();
    await expect(dialog).toBeVisible();
  }

  // A drag starting on the background must not dismiss on press or release.
  await page.mouse.move(outsideLeft.x, outsideLeft.y);
  await page.mouse.down();
  await expect(dialog).toBeVisible();
  await page.mouse.move(outsideRight.x, outsideRight.y, { steps: 8 });
  await page.mouse.move(outsideLeft.x, outsideLeft.y, { steps: 8 });
  await page.mouse.up();
  await expect(dialog).toBeVisible();

  await page.mouse.move(outsideLeft.x, outsideLeft.y);
  await page.mouse.down();
  await page.mouse.move(inside.x, inside.y, { steps: 8 });
  await page.mouse.up();
  await expect(dialog).toBeVisible();
}

for (const scenario of dialogs) {
  test(`${scenario.name} stays open until its close button is used`, async ({ page }) => {
    await page.setViewportSize({ width: scenario.width ?? 1536, height: 960 });
    await mockApi(page);
    await page.goto(scenario.path);
    const open = () =>
      page.getByRole('button', { name: scenario.openButton, exact: true }).first().click();
    if (!scenario.autoOpen) await open();
    const dialog = page.getByRole('dialog', { name: scenario.dialogName, exact: true });
    await expect(dialog).toBeVisible();
    if (scenario.field) {
      await dialog.getByLabel(scenario.field.label, { exact: true }).fill(scenario.field.value);
    }

    await expectDragsToKeepOpen(page, dialog);
    for (const point of [
      { x: 2, y: 2 },
      { x: page.viewportSize()!.width - 2, y: 2 },
    ]) {
      await page.mouse.click(point.x, point.y);
      await expect(dialog).toBeVisible();
    }
    await page.keyboard.press('Escape');
    await expect(dialog).toBeVisible();
    if (scenario.field) {
      await expect(dialog.getByLabel(scenario.field.label, { exact: true })).toHaveValue(
        scenario.field.value,
      );
    }

    await dialog.getByRole('button', { name: scenario.closeButton, exact: true }).click();
    await expect(dialog).toBeHidden();
    await open();
    await expect(dialog).toBeVisible();
    await page.mouse.click(2, 2);
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: scenario.closeButton, exact: true }).click();
    await expect(dialog).toBeHidden();
  });
}
