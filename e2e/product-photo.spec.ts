import { expect, test } from '@playwright/test';
import { mockApi } from './support/mockApi';
import { testProductCategories, testProducts } from '../src/test/fixtures';
import type { Product, ProductRequest } from '../src/data/types';

for (const width of [1536, 390]) {
  test(`chooses, saves, reloads and removes a product photo at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1080 });
    await mockApi(page);
    let products: Product[] = structuredClone(testProducts);
    let saved: ProductRequest | undefined;
    await page.route(/\/api\/v1\/catalog\/products(?:\/|$|\?)/, async (route) => {
      const request = route.request();
      if (request.method() === 'GET') {
        await route.fulfill({ json: products });
        return;
      }
      saved = request.postDataJSON() as ProductRequest;
      const id =
        request.method() === 'POST'
          ? '00000000-0000-4000-8000-000000000899'
          : new URL(request.url()).pathname.split('/').at(-1)!;
      const product: Product = {
        ...saved,
        id,
        categoryName: testProductCategories[0].name,
        totalStock: 0,
      };
      products = [...products.filter((item) => item.id !== id), product];
      await route.fulfill({ status: request.method() === 'POST' ? 201 : 200, json: product });
    });
    await page.goto('/product-catalog');
    await expect(page.getByText('Oxford Shirt', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: /new product/i }).click();
    const dialog = page.getByRole('dialog', { name: 'Register Product', exact: true });
    await expect(dialog.getByText('Image URL', { exact: true })).toHaveCount(0);
    await dialog.getByLabel('Product Name', { exact: true }).fill('Device Photo Shirt');
    await dialog.getByLabel('Selling Price', { exact: true }).fill('2400');
    await dialog.getByLabel('Buying Price', { exact: true }).fill('1200');
    const png = await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      canvas.width = 2000;
      canvas.height = 1200;
      const context = canvas.getContext('2d')!;
      context.fillStyle = '#267562';
      context.fillRect(0, 0, 2000, 1200);
      return canvas.toDataURL('image/png').split(',')[1];
    });
    await dialog.getByLabel('Product photo', { exact: true }).setInputFiles({
      name: 'shirt.png',
      mimeType: 'image/png',
      buffer: Buffer.from(png, 'base64'),
    });
    const preview = dialog.getByAltText('Product photo preview');
    await expect(preview).toBeVisible();
    await expect
      .poll(() => preview.evaluate((image: HTMLImageElement) => image.naturalWidth))
      .toBeGreaterThan(0);
    expect(
      await preview.evaluate((image: HTMLImageElement) =>
        Math.max(image.naturalWidth, image.naturalHeight),
      ),
    ).toBeLessThanOrEqual(960);
    const encoded = await preview.getAttribute('src');
    expect(encoded).toMatch(/^data:image\/(webp|jpeg);base64,/);
    expect(encoded!.length).toBeLessThanOrEqual(200_000);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      ),
    ).toBeLessThanOrEqual(1);
    await dialog.screenshot({ path: testInfo.outputPath('product-photo-picker.png') });
    await dialog.getByRole('button', { name: 'Register Product', exact: true }).click();
    await expect(page.getByText('Device Photo Shirt saved.', { exact: true })).toBeVisible();
    expect(saved?.imageUrl).toBe(encoded);
    await page.reload();
    const row = page.getByRole('row').filter({ hasText: 'Device Photo Shirt' });
    await expect(row.locator('.product-photo img')).toHaveAttribute('src', encoded!);
    if (width === 390) await row.getByRole('button', { name: /details and actions/i }).click();
    await row.getByRole('button', { name: 'Edit', exact: true }).click();
    const edit = page.getByRole('dialog', { name: 'Edit Product', exact: true });
    await expect(edit.getByAltText('Product photo preview')).toHaveAttribute('src', encoded!);
    // A damaged replacement must leave the saved photo intact.
    await edit.getByLabel('Product photo', { exact: true }).setInputFiles({
      name: 'broken.png',
      mimeType: 'image/png',
      buffer: Buffer.from('not an image'),
    });
    await expect(edit.getByRole('alert')).toContainText('could not be opened');
    await expect(edit.getByAltText('Product photo preview')).toHaveAttribute('src', encoded!);
    await edit.getByRole('button', { name: 'Save Changes', exact: true }).click();
    await expect(edit).toHaveCount(0);
    expect(saved?.imageUrl).toBe(encoded);
    await row.getByRole('button', { name: 'Edit', exact: true }).click();
    await edit.getByRole('button', { name: 'Remove photo', exact: true }).click();
    await expect(edit.getByAltText('Product photo preview')).toHaveCount(0);
    await edit.getByRole('button', { name: 'Save Changes', exact: true }).click();
    await expect(edit).toHaveCount(0);
    expect(saved?.imageUrl).toBe('');
    await page.reload();
    await expect(
      page.getByRole('row').filter({ hasText: 'Device Photo Shirt' }).locator('.product-photo img'),
    ).toHaveCount(0);
  });
}
