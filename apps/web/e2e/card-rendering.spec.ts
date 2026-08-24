import { test, expect } from '@playwright/test';

test.describe('Phase 7: Deterministic Card Rendering & Print Calibration E2E', () => {
  test.beforeEach(async ({ page }) => {
    // 1. Mock Auth
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
        body: JSON.stringify({
          isActivated: true,
          deploymentMode: 'local',
          lanEnabled: true,
        }),
      });
    });

    // 2. Mock Organizations
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

    // 3. Mock Templates API
    const mockTemplate = {
      id: 'tpl-classic-1',
      tenantId: 'tenant-1',
      organizationId: 'org-london-boy',
      name: 'Factory Standard Bilingual Badge',
      presetId: 'CLASSIC_VERTICAL',
      activeVersionId: 'ver-1',
      isArchived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      versions: [
        {
          id: 'ver-1',
          templateId: 'tpl-classic-1',
          versionNumber: 1,
          status: 'PUBLISHED',
          checksumSha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
          layout: {
            version: '1.0.0',
            presetId: 'CLASSIC_VERTICAL',
            dimensions: {
              widthMm: 60,
              heightMm: 90,
              bleedMm: 3,
              safeAreaMm: 3,
              orientation: 'VERTICAL',
            },
            theme: {
              primaryColor: '#134E4A',
              secondaryColor: '#0F766E',
              accentColor: '#14B8A6',
              backgroundColor: '#FFFFFF',
              textColor: '#0F172A',
              fontFamilyLatin: 'Noto Sans',
              fontFamilyBengali: 'Noto Sans Bengali',
            },
            front: {
              header: { showLogo: true, showOrgName: true, customTitle: null, heightMm: 12 },
              photo: {
                widthMm: 24,
                heightMm: 32,
                borderRadiusMm: 2,
                borderColor: '#0F766E',
                borderWidthMm: 0.5,
              },
              details: {
                enabledFields: [
                  'displayName',
                  'jobTitle',
                  'department',
                  'employeeNumber',
                  'bloodGroup',
                ],
                customLabels: { employeeNumber: 'ID No', bloodGroup: 'Blood' },
              },
              barcode: null,
              footer: {
                showSignatureLine: true,
                signatureLabel: 'Authorized Sign',
                instructionsText: null,
              },
            },
            back: {
              header: {
                showLogo: false,
                showOrgName: true,
                customTitle: 'জরুরি তথ্যাবলী',
                heightMm: 10,
              },
              photo: null,
              details: {
                enabledFields: ['displayName', 'emergencyContact', 'bloodGroup'],
                customLabels: {
                  displayName: 'নাম',
                  emergencyContact: 'জরুরি যোগাযোগ',
                  bloodGroup: 'রক্তের গ্রুপ',
                },
              },
              barcode: { type: 'QR_CODE', payloadType: 'OPAQUE_CARD_SERIAL' },
              footer: {
                showSignatureLine: true,
                signatureLabel: 'কার্ডধারীর স্বাক্ষর',
                instructionsText: 'এই কার্ডটি প্রতিষ্ঠানের সম্পত্তি।',
              },
            },
            localeConfig: {
              frontLocale: 'en-US',
              backLocale: 'bn-BD',
              fallbackPolicy: 'LATIN_FALLBACK',
            },
          },
        },
      ],
    };

    // 3. Unified Templates API Dispatcher
    await page.route('**/api/templates**', async (route) => {
      const url = route.request().url();
      const method = route.request().method();

      if (url.endsWith('/draft')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ template: mockTemplate }),
        });
      }

      if (url.endsWith('/publish')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            version: {
              id: 'ver-1',
              versionNumber: 1,
              status: 'PUBLISHED',
              checksumSha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
              publishedAt: new Date().toISOString(),
            },
          }),
        });
      }

      // Check for template detail ID
      const match = url.match(/\/api\/templates\/([a-zA-Z0-9_-]+)/);
      if (match && match[1] && match[1] !== 'templates') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ template: mockTemplate }),
        });
      }

      // Base /api/templates
      if (method === 'GET') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ templates: [mockTemplate] }),
        });
      }

      return route.continue();
    });

    // 4. Mock Card Render Endpoints
    await page.route('/api/cards/render/preview-pdf', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/pdf',
        headers: {
          'Content-Disposition': 'inline; filename="card-print-master.pdf"',
          'X-Checksum-SHA256': '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
        },
        body: Buffer.from('%PDF-1.4 Mock PDF Output for test verification'),
      });
    });

    await page.route('/api/cards/render/preview-png', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'image/png',
        headers: {
          'Content-Disposition': 'inline; filename="card-preview.png"',
          'X-Checksum-SHA256': '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
        },
        body: Buffer.from('Mock PNG Image data'),
      });
    });

    await page.route(/\/api\/cards\/calibration\/pdf.*$/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/pdf',
        headers: {
          'Content-Disposition': 'attachment; filename="printer-calibration-a4.pdf"',
          'X-Checksum-SHA256': '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
        },
        body: Buffer.from('%PDF-1.4 Mock Calibration Sheet'),
      });
    });
  });

  test('navigates to Print Calibration Studio, verifies 100% scale rules, and logs caliper measurements', async ({
    page,
  }) => {
    await page.goto('/cards/calibration');
    await expect(page.locator('h1')).toContainText('Physical Print Calibration & Alignment');

    // Verify 100% scale critical alert
    await expect(
      page.locator('text=Critical Invariant: Set Printer Dialog to "100%" or "Actual Size"'),
    ).toBeVisible();

    // Verify tolerance badges
    await expect(page.locator('text=Within Tolerance').first()).toBeVisible();

    // Switch to US Letter
    await page.click('button:has-text("US Letter")');
    await expect(page.locator('text=215.9 × 279.4 mm')).toBeVisible();

    // Save calibration profile
    await page.click('button:has-text("Save Calibration Profile")');
    await expect(
      page.locator('text=Printer calibration values and duplex offsets saved'),
    ).toBeVisible();
  });

  test('renders print master PDF and 300 DPI PNG in Template Customizer Studio', async ({
    page,
  }) => {
    await page.goto('/cards/templates/tpl-classic-1');

    await expect(page.locator('h1')).toContainText('Factory Standard Bilingual Badge');

    // Verify Print PDF and PNG buttons exist
    await expect(page.locator('button:has-text("Print PDF (Exact)")')).toBeVisible();
    await expect(page.locator('button:has-text("PNG (300 DPI)")')).toBeVisible();

    // Click Print PDF button
    await page.click('button:has-text("Print PDF (Exact)")');

    // Click PNG (300 DPI) button
    await page.click('button:has-text("PNG (300 DPI)")');
  });
});
