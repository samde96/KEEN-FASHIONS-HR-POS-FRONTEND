import { expect, test } from '@playwright/test';
import type { Branch } from '../src/data/types';
import { mockApi } from './support/mockApi';

for (const width of [1536, 390]) {
  test(`administrator adds a location without horizontal overflow at ${width}px`, async ({
    page,
  }, testInfo) => {
    await mockApi(page);
    const locations: Branch[] = [];
    await page.route('**/api/v1/branches', async (route) => {
      if (route.request().method() === 'POST') {
        const created = { id: 'new-warehouse', ...route.request().postDataJSON() } as Branch;
        locations.push(created);
        await route.fulfill({ status: 201, json: created });
        return;
      }
      await route.fulfill({ json: locations });
    });
    await page.setViewportSize({ width, height: 1080 });
    await page.goto('/branches');
    await expect(page.getByRole('heading', { name: 'Shops & warehouses' })).toBeVisible();
    await page.getByLabel('Location name', { exact: true }).fill('Central Warehouse');
    await page.getByLabel('Location code', { exact: true }).fill('WH-01');
    await page.getByRole('button', { name: 'Save location', exact: true }).click();
    await expect(page.getByRole('status')).toHaveText('Central Warehouse added successfully.');
    await expect(page.getByLabel('Business branch')).toHaveValue('new-warehouse');
    await expect(page.getByRole('table', { name: 'Registered locations' })).toContainText(
      'Central Warehouse',
    );
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
    ).toBeLessThanOrEqual(1);
    await page.screenshot({ path: testInfo.outputPath(`locations-${width}.png`), fullPage: true });
  });
}
