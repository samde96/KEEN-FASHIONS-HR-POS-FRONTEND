import { expect, test, type Route } from '@playwright/test';
import { mockApi } from './support/mockApi';
import { testOrganization } from '../src/test/fixtures';

test('login is available immediately while session requests are stalled', async ({ page }) => {
  await mockApi(page);
  let sessionRequests = 0;
  await page.route('**/api/v1/me', () => {
    sessionRequests += 1;
  });
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'User Login' })).toBeVisible();
  expect(sessionRequests).toBe(0);

  await page.goto('/apps');
  await expect(page.getByLabel('Checking session', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Go to sign in' }).click();
  await expect(page.getByRole('heading', { name: 'User Login' })).toBeVisible();
});

test('a stalled session restore returns to sign-in after five seconds without automatic retries', async ({
  page,
}) => {
  let sessionRequests = 0;
  await mockApi(page);
  await page.route('**/api/v1/me', () => {
    sessionRequests += 1;
  });
  await page.goto('/apps');
  await expect(page.getByLabel('Checking session', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'User Login' })).toBeVisible({ timeout: 7000 });
  expect(sessionRequests).toBe(1);
});

test('business loading has its own status and failures can be retried without signing in again', async ({
  page,
}) => {
  await mockApi(page);
  let pendingOrganization: Route | undefined;
  let organizationRequests = 0;
  await page.route('**/api/v1/organization/current', (route) => {
    organizationRequests += 1;
    pendingOrganization = route;
  });
  await page.goto('/apps');
  await expect(page.getByLabel('Loading business data', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Checking session', { exact: true })).toHaveCount(0);
  await pendingOrganization!.fulfill({ status: 503, json: { detail: 'Temporarily unavailable' } });
  await expect(page.getByLabel('Unable to load business data')).toBeVisible();
  expect(organizationRequests).toBe(1);
  await page.route('**/api/v1/organization/current', (route) =>
    route.fulfill({ json: testOrganization }),
  );
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: /All your business on one platform/ }),
  ).toBeVisible();
});
