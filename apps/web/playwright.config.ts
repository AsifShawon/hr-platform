import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'], viewport: { width: 360, height: 640 } },
    },
    {
      name: 'Tablet Chrome',
      use: { viewport: { width: 768, height: 1024 } },
    },
    {
      name: 'Desktop Standard',
      use: { viewport: { width: 1280, height: 800 } },
    },
    {
      name: 'Desktop Wide',
      use: { viewport: { width: 1440, height: 900 } },
    },
  ],
  webServer: {
    command: 'pnpm --filter @hr/web dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120000,
  },
});
