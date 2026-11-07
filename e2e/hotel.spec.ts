import { expect, test } from '@playwright/test';
import { mockHotel } from './support/hotelApi';
import { hotelWorkspace, hotelWaiters } from '../src/test/hotelFixtures';
import { testUser } from '../src/test/fixtures';

async function addCheckoutItem(
  page: import('@playwright/test').Page,
  name: string,
  type: 'Food menu' | 'Products' = 'Food menu',
) {
  const categories = page.getByRole('complementary', { name: 'Menu categories' });
  await categories.getByRole('button', { name: type, exact: true }).click();
  const picker = page.getByRole('list', { name: 'Item results' });
  await page.getByRole('searchbox', { name: 'Search food or products' }).fill(name);
  await picker.getByRole('button', { name: `Add ${name}`, exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Add items to order' })).toHaveCount(0);
}

test('prepared food and products have separate revenue and stock; calendar opens a free room', async ({
  page,
}, testInfo) => {
  const data = await mockHotel(page);
  await page.goto('/apps/hotel');
  await addCheckoutItem(page, 'Lunch');
  await addCheckoutItem(page, 'Bottled water', 'Products');
  await page.getByLabel('Table number (optional)').fill('4');
  await page.getByLabel('Served by').selectOption(hotelWaiters[0].id);
  await page.getByRole('button', { name: 'Create Order' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Close dialog' }).click();
  expect(data.items[0].stock).toBe(9);
  await page.getByRole('button', { name: 'Hotel workspaces', exact: true }).click();
  await page
    .getByRole('navigation', { name: 'Hotel workspaces' })
    .getByRole('link', { name: 'Hotel reports' })
    .click();
  await expect(
    page.locator('.hotel-metric').filter({ hasText: 'Prepared food revenue' }),
  ).toContainText('250.00');
  await expect(
    page.locator('.hotel-metric').filter({ hasText: 'Stocked product revenue' }),
  ).toContainText('250.00');
  await expect(page.locator('.hotel-metric').filter({ hasText: 'Total revenue' })).toContainText(
    '500.00',
  );
  await page.screenshot({ path: testInfo.outputPath('hotel-reports.png'), fullPage: true });
  await page
    .getByRole('navigation', { name: 'Hotel workspaces' })
    .getByRole('link', { name: 'Booking calendar' })
    .click();
  await expect(
    page
      .locator('.hotel-calendar')
      .getByRole('button', { name: /Jane Guest.*Reserved/ })
      .first(),
  ).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('hotel-calendar.png'), fullPage: true });
  await expect(
    page
      .getByRole('navigation', { name: 'Hotel Management navigation' })
      .getByRole('link', { name: 'Hotel dashboard', exact: true }),
  ).not.toHaveAttribute('aria-current', 'page');
  await page.getByRole('button', { name: 'Reserve room 102 on 2026-11-06', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('combobox', { name: 'Room', exact: true })).toHaveValue(
    data.rooms[1].id,
  );
  await expect(dialog.getByLabel('Arrival', { exact: true })).toHaveValue('2026-11-06');
  await expect(
    dialog
      .getByRole('combobox', { name: 'Room', exact: true })
      .locator(`option[value="${data.rooms[0].id}"]`),
  ).toHaveAttribute('disabled', '');
});

test('checkout top bar is blue and F9 returns to Home', async ({ page }) => {
  await mockHotel(page);
  await page.goto('/hotel/restaurant');
  const topbar = page.locator('.hotel-pos-topbar');
  await expect(topbar).toHaveCSS('background-color', 'rgb(36, 86, 215)');
  await expect(topbar.getByRole('button', { name: /Home.*F9/ })).toBeVisible();
  await page.keyboard.press('F9');
  await expect(page).toHaveURL(/\/home$/);
});

test('checkout top bar shows and opens reservation, calendar, and inventory F-key shortcuts', async ({
  page,
}) => {
  await mockHotel(page);
  await page.goto('/hotel/restaurant');
  const shortcuts = page.getByRole('navigation', { name: 'Hotel shortcuts' });
  await expect(shortcuts.getByRole('button', { name: /Reservations.*F1/ })).toBeVisible();
  await expect(shortcuts.getByRole('button', { name: /Calendar.*F2/ })).toBeVisible();
  await expect(shortcuts.getByRole('button', { name: /Inventory.*F3/ })).toBeVisible();

  for (const [shortcut, path] of [
    ['F1', '/hotel/reservations'],
    ['F2', '/hotel/calendar'],
    ['F3', '/hotel/inventory'],
  ]) {
    await page.keyboard.press(shortcut);
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    if (path === '/hotel/reservations') {
      const backToPos = page.getByRole('link', { name: 'Back to POS' });
      await expect(backToPos).toBeVisible();
      await backToPos.click();
      await expect(page).toHaveURL(/\/hotel\/restaurant$/);
      continue;
    }
    await page.goto('/hotel/restaurant');
    await expect(page.locator('.hotel-pos-topbar')).toBeVisible();
  }
});

test('hotel reports in Reports use the complete hotel report layout', async ({ page }) => {
  await mockHotel(page);
  await page.goto('/reports');
  const hotelReports = page.locator('#hotel-report-section');
  await expect(hotelReports.getByRole('heading', { name: 'Hotel reports' })).toBeVisible();
  await expect(hotelReports.getByText('Total revenue')).toBeVisible();
  await expect(hotelReports.locator('.hotel-reports-embedded .hotel-report-filters')).toBeVisible();
  await expect(hotelReports.getByRole('heading', { name: 'Revenue by day' })).toBeVisible();
  await expect(hotelReports.getByRole('heading', { name: 'Room performance' })).toBeVisible();
  expect(
    await hotelReports
      .locator('.hotel-metrics')
      .first()
      .evaluate((element) => {
        const style = getComputedStyle(element);
        return style.display === 'grid' && style.gap !== 'normal';
      }),
  ).toBe(true);
});

for (const [width, height] of [
  [768, 900],
  [900, 900],
  [1100, 768],
  [1024, 768],
  [1280, 800],
  [1280, 1024],
  [1366, 768],
  [1536, 960],
  [390, 844],
  [570, 800],
]) {
  test(`hotel touch checkout fits ${width}x${height}`, async ({ page }, testInfo) => {
    const data = structuredClone(hotelWorkspace);
    data.menuItems = Array.from({ length: 12 }, (_, i) => ({
      ...data.menuItems[0],
      id: `dish-${i}`,
      name: [
        'Rice & beef stew',
        'Pilau',
        'Chapati & beans',
        'Chicken & chips',
        'Vegetable rice',
        'Ugali & greens',
        'Breakfast plate',
        'Omelette',
        'Tea',
        'Coffee',
        'Fresh juice',
        'Soup',
      ][i],
      category: i < 6 ? 'Main meals' : i < 8 ? 'Breakfast' : 'Drinks',
    }));
    await mockHotel(page, data);
    await page.setViewportSize({ width, height });
    await page.goto(width === 1024 ? '/hotel/restaurant/' : '/apps/hotel');
    await expect(page.getByText('Hotel point of sale')).toBeVisible();
    expect(
      await page.locator('.hotel-pos-topbar').evaluate((topbar) => {
        const groups = [
          '.hotel-pos-brand',
          '.hotel-pos-topbar-center',
          '.hotel-pos-quicklinks',
          '.hotel-pos-tools',
        ].map((selector) => topbar.querySelector(selector)?.getBoundingClientRect());
        if (topbar.scrollWidth > topbar.clientWidth) return false;
        const visible = groups.filter(
          (rect): rect is DOMRect => !!rect && rect.width > 0 && rect.height > 0,
        );
        return visible.every((rect, index) =>
          visible.slice(index + 1).every((other) => {
            const overlapsX = rect.left < other.right && rect.right > other.left;
            const overlapsY = rect.top < other.bottom && rect.bottom > other.top;
            return !overlapsX || !overlapsY;
          }),
        );
      }),
    ).toBe(true);
    if (width >= 1201 && width <= 1400) {
      expect(
        await page.locator('.hotel-pos-quicklinks').evaluate((shortcuts) => {
          const right = shortcuts.getBoundingClientRect().right;
          const topbarRight = shortcuts.parentElement!.getBoundingClientRect().right;
          return topbarRight - right;
        }),
      ).toBeLessThanOrEqual(20);
    }
    await expect(page.locator('.hotel-food-card')).toHaveCount(0);
    await addCheckoutItem(page, 'Rice & beef stew');
    if (width <= 900) {
      await page.getByRole('button', { name: /View order/ }).click();
      const cart = page.getByRole('region', { name: 'Current order' });
      await expect(cart).toBeVisible();
      expect(
        await cart.evaluate((element) => {
          const bounds = element.getBoundingClientRect();
          return bounds.left >= 0 && bounds.right <= window.innerWidth;
        }),
      ).toBe(true);
    }
    await expect(page.getByLabel('Quantity for Rice & beef stew')).toHaveValue('1');
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
    ).toBeLessThanOrEqual(1);
    expect(
      await page
        .getByRole('searchbox', { name: 'Search food or products' })
        .evaluate((el) => el.getBoundingClientRect().height),
    ).toBeGreaterThanOrEqual(44);
    await page.screenshot({
      path: testInfo.outputPath(`hotel-checkout-${width}.png`),
      fullPage: true,
    });
  });
}

test('waiter can send an order and print a bill from a phone', async ({ page }, testInfo) => {
  const data = await mockHotel(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/apps/hotel');
  await addCheckoutItem(page, 'Lunch');
  await page.getByRole('button', { name: /View order/ }).click();
  await page.getByRole('button', { name: 'Choose table (optional)', exact: true }).click();
  await page.getByRole('button', { name: 'Table 2', exact: true }).click();
  await page.getByRole('button', { name: 'Increase Lunch' }).click();
  await expect(page.getByLabel('Quantity for Lunch')).toHaveValue('2');
  await page.screenshot({ path: testInfo.outputPath('hotel-mobile-order.png'), fullPage: true });
  await page.getByLabel('Served by').selectOption(hotelWaiters[0].id);
  await page.getByRole('button', { name: 'Create Order' }).click();
  await expect(page.getByRole('dialog')).toContainText('TABLE: 2');
  await expect(page.getByRole('dialog')).toContainText('Cashier: Alice Waiter');
  expect(data.items[0].stock).toBe(10);
});

test('guest deposit, check-in, room food charge, final payment and check-out', async ({ page }) => {
  const data = await mockHotel(page);
  await page.goto('/hotel/reservations');
  await page.getByRole('button', { name: 'Guest bill', exact: true }).click();
  let dialog = page.getByRole('dialog');
  await dialog.getByLabel('Amount', { exact: true }).fill('1000');
  await dialog.getByRole('button', { name: 'Record payment', exact: true }).click();
  await expect(dialog.locator('.hotel-totals')).toContainText('5,000.00');
  await dialog.getByRole('button', { name: 'Check in guest' }).click();
  await expect(dialog.getByRole('button', { name: 'Check out guest' })).toBeDisabled();
  await dialog.getByRole('button', { name: 'Close dialog' }).click();
  await page
    .getByRole('navigation', { name: 'Hotel workspaces' })
    .getByRole('link', { name: 'Hotel checkout' })
    .click();
  await addCheckoutItem(page, 'Lunch');
  await page.getByLabel('Quantity for Lunch').fill('2');
  await page.getByLabel('Table number (optional)').fill('3');
  await page.getByLabel('Payment / room charge').selectOption('ROOM');
  await page.getByLabel('Checked-in guest').selectOption(data.bookings[0].id);
  await page.getByLabel('Served by').selectOption(hotelWaiters[0].id);
  await page.getByRole('button', { name: 'Create Order' }).click();
  dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('Payable with the guest bill');
  await dialog.getByRole('button', { name: 'Close dialog' }).click();
  await page.getByRole('button', { name: 'Hotel workspaces', exact: true }).click();
  await page
    .getByRole('navigation', { name: 'Hotel workspaces' })
    .getByRole('link', { name: 'Reservations & guests' })
    .click();
  await page.getByRole('button', { name: 'Guest bill', exact: true }).click();
  dialog = page.getByRole('dialog');
  await expect(dialog.locator('.hotel-totals')).toContainText('5,500.00');
  await dialog.getByRole('button', { name: 'Record payment', exact: true }).click();
  await expect(dialog.getByRole('button', { name: 'Check out guest' })).toBeEnabled();
  await dialog.getByRole('button', { name: 'Check out guest' }).click();
  await dialog.getByRole('button', { name: 'View stay receipt' }).click();
  await expect(page.getByRole('dialog').locator('.hotel-receipt-print')).toContainText('6,500.00');
  expect(data.rooms[0].status).toBe('CLEANING');
  expect(data.items[0].stock).toBe(10);
});
