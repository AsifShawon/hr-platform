import { test, expect } from '@playwright/test';

test.describe('Phase 2: Activation Wizard Flow', () => {
  test('renders activation wizard steps, password validation, and recovery ceremony', async ({
    page,
  }) => {
    // Mock activation endpoint for E2E isolation
    await page.route('/api/system/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          isActivated: false,
          activatedAt: null,
          deploymentMode: 'local',
          lanEnabled: false,
        }),
      });
    });

    await page.route('/api/system/activate', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'System successfully activated.',
          recoveryCodes: [
            'A1B2C3D4E5',
            'F6G7H8J9K0',
            'L1M2N3P4Q5',
            'R6S7T8U9V0',
            'W1X2Y3Z4A5',
            'B6C7D8E9F0',
            'G1H2J3K4L5',
            'M6N7P8Q9R0',
          ],
          user: { id: 'usr-1', username: 'admin' },
        }),
      });
    });

    await page.goto('/activate');

    // Step 1: Replace Initial Admin Password
    await expect(page.locator('h1', { hasText: 'HR ID Platform' })).toBeVisible();
    await expect(page.locator('h2', { hasText: 'Replace Initial Admin Password' })).toBeVisible();
    await expect(page.locator('text=Security Requirements:')).toBeVisible();

    // Try short password
    await page.fill('#act-password', 'short1');
    await page.fill('#act-confirm-password', 'short1');
    await page.getByRole('button', { name: 'Continue to Recovery & Responsibilities' }).click();
    await expect(page.locator('text=Password must be at least 10 characters long.')).toBeVisible();

    // Enter matching strong password
    await page.fill('#act-password', 'SuperStrongSecret2026!');
    await page.fill('#act-confirm-password', 'SuperStrongSecret2026!');
    await page.getByRole('button', { name: 'Continue to Recovery & Responsibilities' }).click();

    // Step 2: Recovery & Responsibilities
    await expect(
      page.locator('h2', { hasText: 'Emergency Recovery & Responsibilities' }),
    ).toBeVisible();
    await expect(page.locator('text=Local Air-Gapped Data Notice')).toBeVisible();

    // Commit button disabled until both checkboxes checked
    const commitBtn = page.getByRole('button', { name: 'Commit System Activation' });
    await expect(commitBtn).toBeDisabled();

    // Check backup checkbox
    await page.locator('input[type="checkbox"]').first().check();
    await expect(commitBtn).toBeDisabled();

    // Check recovery codes checkbox
    await page.locator('input[type="checkbox"]').nth(1).check();
    await expect(commitBtn).toBeEnabled();

    // Submit activation
    await commitBtn.click();

    // Step 4: Success & Recovery Codes Reveal
    await expect(page.locator('text=System Successfully Activated!')).toBeVisible();
    await expect(page.locator('text=Emergency Recovery Codes (Save Now)')).toBeVisible();
    await expect(page.locator('text=A1B2C3D4E5')).toBeVisible();

    // Navigate to Dashboard
    await page.getByRole('button', { name: 'Go to Workspace Dashboard' }).click();
    await expect(page).toHaveURL(/.*dashboard/);
  });
});

test.describe('Phase 2: Authenticated App Shell & Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authenticated user context
    await page.route('/api/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'usr-1',
            tenantId: 't-1',
            username: 'admin',
            email: 'admin@company.local',
            isActive: true,
            isTemporaryBootstrap: false,
            mustChangePassword: false,
            roles: ['system_owner'],
            permissions: ['people.view', 'system.manage', 'audit.view'],
          },
          system: { isActivated: true, requiresActivation: false },
        }),
      });
    });

    await page.route('/api/organizations', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          organizations: [
            {
              id: 'org-1',
              name: 'London Boy Apparel Ltd.',
              displayName: 'London Boy Apparel',
              code: 'LONDON_BOY',
              primaryColor: '#134E4A',
              secondaryColor: '#0F766E',
              accentColor: '#14B8A6',
              locale: 'en-US',
              timezone: 'Asia/Dhaka',
              isDefault: true,
            },
          ],
        }),
      });
    });

    await page.route('/api/auth/sessions', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          sessions: [
            {
              id: 'sess-1',
              ipAddress: '127.0.0.1',
              userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
              isCurrent: true,
              lastActiveAt: new Date().toISOString(),
              createdAt: new Date().toISOString(),
            },
          ],
        }),
      });
    });

    await page.route('/api/audit-events*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          events: [
            {
              id: 'evt-1',
              tenantId: 't-1',
              actorId: 'usr-1',
              action: 'system.activated',
              entityType: 'SystemInstallation',
              entityId: 'inst-1',
              details: { username: 'admin', deploymentMode: 'local' },
              ipAddress: '127.0.0.1',
              createdAt: new Date().toISOString(),
            },
            {
              id: 'evt-2',
              tenantId: 't-1',
              actorId: 'usr-1',
              action: 'user.login_success',
              entityType: 'User',
              entityId: 'usr-1',
              details: { username: 'admin' },
              ipAddress: '127.0.0.1',
              createdAt: new Date().toISOString(),
            },
          ],
          pagination: { page: 1, limit: 15, totalCount: 2, totalPages: 1 },
        }),
      });
    });
  });

  test('renders dashboard status cards, user profile pill, and sessions table', async ({
    page,
  }) => {
    await page.goto('/dashboard');

    // Header & User badge
    await expect(page.locator('text=HR ID Platform').first()).toBeVisible();
    await expect(
      page.locator('h1', { hasText: 'System Security & Workspace Dashboard' }),
    ).toBeVisible();

    const mobileToggle = page.getByRole('button', { name: 'Toggle navigation menu' });
    if (await mobileToggle.isVisible()) {
      await mobileToggle.click();
      await expect(page.locator('.sm\\:hidden').getByText('system_owner')).toBeVisible();
      await mobileToggle.click();
    } else {
      await expect(page.locator('.sm\\:flex').getByText('system_owner')).toBeVisible();
    }

    // Security Foundations Cards
    await expect(page.locator('text=Authentication Layer')).toBeVisible();
    await expect(page.locator('text=Argon2id (64 MiB)')).toBeVisible();
    await expect(page.locator('text=Authorization & RBAC')).toBeVisible();
    await expect(page.locator('text=Strict Default-Deny')).toBeVisible();

    // Sessions table
    await expect(page.locator('text=Active User Sessions')).toBeVisible();
    await expect(page.locator('text=Current Session')).toBeVisible();

    // Password change modal open and close
    await page.getByRole('button', { name: 'Change Password' }).click();
    await expect(page.locator('text=Change Master Password')).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.locator('text=Change Master Password')).toHaveCount(0);
  });

  test('renders audit trail table and filtering', async ({ page }) => {
    await page.goto('/audit');

    await expect(page.locator('h1', { hasText: 'System Audit Trail' })).toBeVisible();
    await expect(page.locator('text=system.activated')).toBeVisible();
    await expect(page.locator('text=user.login_success')).toBeVisible();
  });

  test('responsive verification across mobile, tablet, and desktop', async ({ page }) => {
    // 360px mobile
    await page.setViewportSize({ width: 360, height: 640 });
    await page.goto('/dashboard');
    const isOverflowing360 = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(isOverflowing360).toBeFalsy();

    // 768px tablet
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/dashboard');
    const isOverflowing768 = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(isOverflowing768).toBeFalsy();

    // 1440px desktop
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/dashboard');
    const isOverflowing1440 = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(isOverflowing1440).toBeFalsy();
  });
});
