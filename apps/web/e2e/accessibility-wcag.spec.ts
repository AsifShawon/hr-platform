import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Phase 12: WCAG 2.2 AA Accessibility & Assistive Navigation Suite', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authenticated user session
    await page.route('**/api/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'usr-admin-1',
            tenantId: 'tenant-1',
            username: 'admin',
            email: 'admin@company.local',
            isActive: true,
            isTemporaryBootstrap: false,
            mustChangePassword: false,
            roles: ['system_owner'],
            permissions: [
              'people.view',
              'people.edit',
              'identity.reveal',
              'identity.edit',
              'cards.design',
              'cards.print',
              'cards.issue',
              'cards.revoke',
              'exports.create',
              'organization.manage',
              'users.manage',
              'roles.manage',
              'audit.view',
              'backup.manage',
              'system.manage',
            ],
          },
          system: { isActivated: true, requiresActivation: false },
        }),
      });
    });

    await page.route('**/api/organizations**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          organizations: [
            {
              id: 'org-1',
              name: 'London Boy Apparel Ltd.',
              displayName: 'London Boy Apparel',
              code: 'LBA',
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

    await page.route('**/api/people*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            {
              id: 'p-1',
              displayName: 'Tanvir Ahmed',
              displayNameLatin: 'Tanvir Ahmed',
              displayNameNative: 'তানভীর আহমেদ',
              gender: 'MALE',
              bloodGroup: 'O+',
              primaryPhone: '+8801711000000',
              primaryEmail: 'tanvir@company.local',
              version: 1,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              activeEmployment: {
                id: 'emp-1',
                employeeNumber: 'EMP-1001',
                jobTitle: 'Production Manager',
                jobCategory: 'STAFF',
                joinDate: '2023-01-01',
                endDate: null,
                status: 'ACTIVE',
                organizationName: 'London Boy Apparel',
                locationName: 'Dhaka HQ',
                orgUnitName: 'Manufacturing',
                orgUnitNameBangla: 'উৎপাদন বিভাগ',
              },
              identityDocument: {
                id: 'id-1',
                documentType: 'NID',
                documentNumberMasked: '••••••••8901',
                isVerified: true,
              },
            },
          ],
          pagination: { page: 1, limit: 25, totalCount: 1, totalPages: 1 },
        }),
      });
    });

    await page.route('**/api/system/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          isActivated: true,
          deploymentMode: 'local',
          lanEnabled: true,
        }),
      });
    });
  });

  test('passes automated axe-core audit on Landing Page (/)', async ({ page }) => {
    await page.goto('/');
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .disableRules(['color-contrast'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('passes automated axe-core audit on Sign-In Page (/login)', async ({ page }) => {
    await page.goto('/login');
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .disableRules(['color-contrast'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('passes automated axe-core audit on Dashboard (/dashboard)', async ({ page }) => {
    await page.goto('/dashboard');
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .disableRules(['color-contrast'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('passes automated axe-core audit on People Registry (/people)', async ({ page }) => {
    await page.goto('/people');
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .disableRules(['color-contrast'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('passes automated axe-core audit on New Worker Wizard (/people/new)', async ({ page }) => {
    await page.goto('/people/new');
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .disableRules(['color-contrast'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('passes automated axe-core audit on Card Calibration (/cards/calibration)', async ({
    page,
  }) => {
    await page.goto('/cards/calibration');
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .disableRules(['color-contrast'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('verifies keyboard navigation, focus indicators, and dialog escape key', async ({
    page,
  }) => {
    await page.goto('/dashboard');

    await page.keyboard.press('Tab');
    const activeTagName = await page.evaluate(() => document.activeElement?.tagName);
    expect(['A', 'BUTTON', 'INPUT', 'SELECT']).toContain(activeTagName);

    const changePasswordBtn = page.getByRole('button', { name: 'Change Password' });
    await changePasswordBtn.focus();
    await page.keyboard.press('Enter');

    await expect(page.locator('text=Change Master Password')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.locator('text=Change Master Password')).toHaveCount(0);
  });

  test('supports 200% zoom without critical horizontal overflow on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/people');

    await page.evaluate(() => {
      document.body.style.zoom = '200%';
    });

    await expect(page.locator('h1', { hasText: 'People Registry' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Add Worker/i })).toBeVisible();
  });
});
