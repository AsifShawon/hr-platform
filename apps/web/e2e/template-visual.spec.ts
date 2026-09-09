import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Template Visual & Real CardRenderer Parity Verification', () => {
  const artifactDir = 'C:\\Users\\User\\.gemini\\antigravity\\brain\\f9b20666-74c3-4770-b9e2-0bb7b6fc5926';

  test.beforeEach(async ({ page }) => {
    await page.route('/api/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'usr-admin-1',
            tenantId: 'tenant-1',
            username: 'admin',
            email: 'admin@londonboyapparel.com',
            isActive: true,
            isTemporaryBootstrap: false,
            mustChangePassword: false,
            roles: ['system_owner'],
            permissions: [
              'people.view',
              'people.edit',
              'cards.design',
              'cards.print',
              'cards.issue',
              'cards.revoke',
              'organization.manage',
              'users.manage',
              'roles.manage',
              'audit.view',
            ],
          },
          system: { isActivated: true, requiresActivation: false },
        }),
      });
    });

    await page.route('/api/system/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ isActivated: true, deploymentMode: 'local', lanEnabled: true }),
      });
    });

    await page.route('/api/organizations', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          organizations: [
            {
              id: 'org-london-boy',
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

    // Mock Templates with real layouts
    const mockTemplates = [
      {
        id: 'tpl-1',
        name: 'Factory Standard Bilingual Badge',
        description: 'Standard 60x90mm vertical badge for plant operators',
        presetId: 'CLASSIC_VERTICAL',
        activeVersionId: 'ver-1',
        isArchived: false,
        organization: { id: 'org-london-boy', name: 'London Boy Apparel Ltd.', displayName: 'London Boy Apparel' },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        versions: [
          {
            id: 'ver-1',
            versionNumber: 1,
            status: 'PUBLISHED',
            layout: {
              version: '1.0.0',
              presetId: 'CLASSIC_VERTICAL',
              dimensions: { widthMm: 60, heightMm: 90, bleedMm: 3, safeAreaMm: 3, orientation: 'PORTRAIT', standardPreset: 'COMPANY_VERTICAL_60X90' },
              theme: { primaryColor: '#134E4A', secondaryColor: '#0F766E', accentColor: '#14B8A6', backgroundColor: '#FFFFFF', textColor: '#0F172A', fontFamilyLatin: 'Noto Sans', fontFamilyBengali: 'Noto Sans Bengali' },
              front: {
                header: { showLogo: true, showOrgName: true, customTitle: null, heightMm: 12 },
                photo: { widthMm: 24, heightMm: 32, borderRadiusMm: 2, borderColor: '#134E4A', borderWidthMm: 0.5 },
                details: { enabledFields: ['employeeNumber', 'jobTitle', 'department', 'bloodGroup'], customLabels: {} },
                barcode: { type: 'CODE128', payloadType: 'EMPLOYEE_NUMBER' },
                footer: { showIssueDate: true, showExpiryDate: false, customText: null },
              },
              back: {
                header: { showLogo: false, showOrgName: true, customTitle: 'জরুরি তথ্যাবলী', heightMm: 10 },
                photo: null,
                details: { enabledFields: ['displayName', 'emergencyContact', 'bloodGroup'], customLabels: { displayName: 'নাম', emergencyContact: 'জরুরি যোগাযোগ', bloodGroup: 'রক্তের গ্রুপ' } },
                barcode: { type: 'QR_CODE', payloadType: 'OPAQUE_CARD_SERIAL' },
                footer: { showSignatureLine: true, signatureLabel: 'স্বাক্ষর', instructionsText: 'হারিয়ে গেলে নিরাপত্তা বিভাগে জমা দিন।' },
              },
              localeConfig: { frontLocale: 'en-US', backLocale: 'bn-BD', fallbackPolicy: 'LATIN_FALLBACK' },
            },
          },
        ],
      },
    ];

    await page.route('**/api/templates**', async (route) => {
      if (route.request().method() === 'GET') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ templates: mockTemplates }),
        });
      }
      return route.continue();
    });
  });

  test('captures Template Creation 2-Pane View across 1440px and 360px', async ({ page }) => {
    // 1440px Desktop
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/cards/templates/new');
    await page.waitForSelector('text=Create Card Template');
    await page.waitForSelector('text=Live Layout Preview');
    await page.screenshot({ path: path.join(artifactDir, 'template_new_1440px_desktop.png'), fullPage: true });

    // 360px Mobile
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto('/cards/templates/new');
    await page.waitForSelector('text=Create Card Template');
    await page.screenshot({ path: path.join(artifactDir, 'template_new_360px_mobile.png'), fullPage: true });
  });

  test('captures Template Gallery with real card renders', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/cards/templates');
    await page.waitForSelector('text=Factory Standard Bilingual Badge');
    await page.waitForSelector('text=PUBLISHED v1');
    await page.screenshot({ path: path.join(artifactDir, 'template_gallery_1440px_desktop.png'), fullPage: true });
  });
});
