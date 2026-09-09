import { test, expect } from '@playwright/test';

test('homepage renders application shell', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toContainText('employee ID cards');
  await expect(page.locator('text=Local-First • On-Premises Card Engine').first()).toBeVisible();
});

test('health api returns ok status', async ({ request }) => {
  const response = await request.get('/api/health');
  expect(response.ok()).toBeTruthy();
  const data = await response.json();
  expect(data.status).toBe('ok');
});
