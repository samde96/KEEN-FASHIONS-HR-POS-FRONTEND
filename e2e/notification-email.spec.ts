import { expect, test } from '@playwright/test';
import { mockApi } from './support/mockApi';

for (const width of [320, 390, 768, 1440]) {
  test(`notification email settings and multiline inbox fit at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await mockApi(page);
    let preferences = {
      dailySummaryEnabled: true,
      inAppEnabled: true,
      emailEnabled: false,
      recipientIds: [],
      inactivityMinutes: 2880,
      longEntryMinutes: 10,
      timeZone: 'Africa/Nairobi',
      notificationEmail: '',
    };
    await page.route('**/api/v1/pos-preferences', async (route) => {
      if (route.request().method() === 'PUT') preferences = route.request().postDataJSON();
      await route.fulfill({ json: preferences });
    });
    await page.goto('/settings');
    await expect(page.getByText(/Resend/i)).toHaveCount(0);
    await page.getByLabel('Email a copy of system notifications').check();
    await page.getByLabel('Notification recipient email').fill('reports@example.com');
    await page.getByRole('button', { name: 'Save reminder settings' }).click();
    await expect(page.getByText('Reminder settings saved.', { exact: true })).toBeVisible();
    expect(preferences.emailEnabled).toBe(true);
    expect(preferences.inAppEnabled).toBe(true);
    expect(preferences.notificationEmail).toBe('reports@example.com');
    await page.reload();
    await expect(page.getByLabel('Notification recipient email')).toHaveValue(
      'reports@example.com',
    );
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
    ).toBeLessThanOrEqual(1);

    await page.route('**/api/v1/notifications', (route) =>
      route.fulfill({
        json: [
          {
            id: 'paired-notification',
            notificationType: 'DAILY_SALES_SUMMARY',
            title: 'Daily Sales Summary',
            message:
              'Transactions: 12\nTotal revenue: KSh 24,000\nEmail contains this same message.',
            sourceModule: 'reports',
            status: 'UNREAD',
            createdAt: '2026-11-01T18:00:00Z',
          },
        ],
      }),
    );
    await page.goto('/notifications');
    const message = page.locator('.notification-message');
    await expect(message).toHaveText(
      'Transactions: 12\nTotal revenue: KSh 24,000\nEmail contains this same message.',
    );
    await expect(message).toHaveCSS('white-space', 'pre-wrap');
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
    ).toBeLessThanOrEqual(1);
  });
}
