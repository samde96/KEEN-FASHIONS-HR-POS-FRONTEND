import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/offline.spec.ts',
  timeout: 45_000,
  expect: { timeout: 10_000 },
  use: { baseURL: 'http://127.0.0.1:4174', serviceWorkers: 'allow', trace: 'retain-on-failure' },
  webServer: {
    command: 'node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 4174 --strictPort',
    url: 'http://127.0.0.1:4174',
    reuseExistingServer: false,
    timeout: 20_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
