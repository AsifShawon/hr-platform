import { test, expect } from '@playwright/test';

test.describe('Phase 6: Card Format Engine & Constrained Bilingual Template System E2E', () => {
  test.beforeEach(async ({ page }) => {
    // 1. Mock Auth Context
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
      description: 'Standard 60x90mm vertical badge for plant operators',
      presetId: 'CLASSIC_VERTICAL',
      activeVersionId: 'ver-1',
      isArchived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      versions: [
        {
          id: 'ver-1',
          templateId: 'tpl-classic-1',
          tenantId: 'tenant-1',
          versionNumber: 1,
          status: 'DRAFT',
          layoutSchemaVersion: '1.0.0',
          checksumSha256: null,
          publishedAt: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
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
              header: {
                showLogo: true,
                showOrgName: true,
                customTitle: null,
                heightMm: 12,
              },
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
                customLabels: {
                  employeeNumber: 'ID No',
                  bloodGroup: 'Blood',
                },
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
                customTitle: 'জরুরি নির্দেশিকা ও তথ্যাবলী',
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
              barcode: {
                type: 'QR_CODE',
                payloadType: 'OPAQUE_CARD_SERIAL',
              },
              footer: {
                showSignatureLine: true,
                signatureLabel: 'কার্ডধারীর স্বাক্ষর',
                instructionsText:
                  'এই কার্ডটি প্রতিষ্ঠানের সম্পত্তি। কার্ডটি হারানো গেলে অবিলম্বে নিরাপত্তা বিভাগে অবহিত করুন।',
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

      if (url.includes('/assignments')) {
        if (method === 'GET') {
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              assignments: [
                {
                  id: 'assign-1',
                  templateId: 'tpl-classic-1',
                  targetType: 'JOB_CATEGORY',
                  targetId: 'WORKER',
                  priority: 20,
                  template: {
                    id: 'tpl-classic-1',
                    name: 'Factory Standard Bilingual Badge',
                    presetId: 'CLASSIC_VERTICAL',
                    isArchived: false,
                  },
                  createdAt: new Date().toISOString(),
                },
              ],
            }),
          });
        }
        return route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            assignment: {
              id: 'assign-2',
              templateId: 'tpl-classic-1',
              targetType: 'LOCATION',
              targetId: 'loc-gzp',
              priority: 40,
            },
          }),
        });
      }

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
      } else if (method === 'POST') {
        const payload = route.request().postDataJSON();
        return route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            template: {
              ...mockTemplate,
              id: 'tpl-new-2',
              name: payload.name,
              presetId: payload.presetId,
            },
          }),
        });
      }

      return route.continue();
    });
  });

  test('navigates to Card Templates Gallery and creates a new template with live 2-pane preview', async ({
    page,
  }) => {
    await page.goto('/cards/templates');
    await expect(page.locator('h1')).toContainText('Card Templates & Format Studio');

    // Verify existing template appears in gallery with real card preview
    await expect(page.locator('text=Factory Standard Bilingual Badge')).toBeVisible();
    await expect(page.locator('text=DRAFT v1')).toBeVisible();
    await expect(page.locator('text=London Boy Apparel Ltd.').first()).toBeVisible();

    // Verify flip button exists and toggles card
    await page.click('button:has-text("Flip to Bangla Back")');
    await expect(page.locator('text=Flip to English Front')).toBeVisible();

    // Click "New Template" button to open 2-pane creation experience
    await page.click('a:has-text("New Template")');
    await page.waitForURL('**/cards/templates/new');
    await expect(page.locator('h1')).toContainText('Create Card Template');

    // Verify 6 visual presets are selectable
    await expect(page.locator('[role="radio"]:has-text("Classic Vertical")')).toBeVisible();
    await expect(page.locator('[role="radio"]:has-text("Modern Stripe")')).toBeVisible();
    await expect(page.locator('[role="radio"]:has-text("Photo Focus")')).toBeVisible();
    await expect(page.locator('[role="radio"]:has-text("Factory / Industrial")')).toBeVisible();
    await expect(page.locator('[role="radio"]:has-text("Contractor Badge")')).toBeVisible();
    await expect(page.locator('[role="radio"]:has-text("Visitor Pass")')).toBeVisible();

    // Verify live preview updates upon selecting Contractor Badge
    await page.click('[role="radio"]:has-text("Contractor Badge")');
    await expect(page.locator('text=CONTRACTOR / সরবরাহকারী')).toBeVisible();

    // Verify live preview updates upon selecting Factory / Industrial
    await page.click('[role="radio"]:has-text("Factory / Industrial")');
    await expect(page.locator('text=Factory / Industrial (60 × 90 mm)')).toBeVisible();

    // Fill form and create template
    await page.fill('#template-name', 'Cutting Unit Shift Badge');
    await page.click('button:has-text("Initialize & Open Studio")');

    // Expect redirect into the Studio for the new template
    await page.waitForURL('**/cards/templates/tpl-new-2');
  });

  test('opens Constrained Template Customizer Studio, updates settings, and verifies live bilingual preview', async ({
    page,
  }) => {
    await page.goto('/cards/templates/tpl-classic-1');

    await expect(page.locator('h1')).toContainText('Factory Standard Bilingual Badge');

    // Verify Live Card Preview contains Front and Back
    await expect(page.locator('text=English Front (60×90mm)')).toBeVisible();
    await expect(page.locator('text=Bangla Back (বাংলা)')).toBeVisible();
    await expect(page.locator('text=Tanvir Ahmed').first()).toBeVisible();
    await expect(page.locator('text=তানভীর আহমেদ').first()).toBeVisible();

    // Switch to Geometry tab and toggle ISO ID-1 Horizontal
    await page.click('button:has-text("Geometry")');
    await expect(page.locator('button:has-text("ISO ID-1 Horizontal")')).toBeVisible();
    await page.click('button:has-text("ISO ID-1 Horizontal")');

    // Switch to Theme tab
    await page.click('button:has-text("Theme & Colors")');
    await expect(page.locator('text=Brand Color Palette & Typography')).toBeVisible();
    await expect(page.locator('text=Noto Sans Bengali')).toBeVisible();

    // Save Draft
    await page.click('button:has-text("Save Draft")');
    await expect(page.locator('text=Draft version successfully saved')).toBeVisible();

    // Publish Version
    await page.click('button:has-text("Publish Version")');
    await expect(page.locator('text=published with SHA-256 digest')).toBeVisible();
  });

  test('executes stress tests: long Bengali names, missing native script fallback, and overlay guides', async ({
    page,
  }) => {
    await page.goto('/cards/templates/tpl-classic-1');

    // Test Long Names fixture
    const fixtureSelect = page.locator('select').first();
    await fixtureSelect.selectOption('long_names');

    await expect(page.locator('text=মুহাম্মদ সাইফুর রহমান চৌধুরী মজুমদার')).toBeVisible();

    // Test Missing Native Script fallback
    await fixtureSelect.selectOption('missing_native');
    await expect(page.locator('text=Farhana Akter').first()).toBeVisible();
    await expect(page.locator('text=Latin Fallback')).toBeVisible();

    // Test Bleed & Safe Area Overlay Toggles
    await page.locator('input[type="checkbox"]').nth(0).check(); // Bleed check
    await page.locator('input[type="checkbox"]').nth(1).check(); // Safe Area check
  });

  test('explores Template Assignment Rules page and verifies 6-level hierarchy', async ({
    page,
  }) => {
    await page.goto('/cards/assignments');
    await expect(page.locator('h1')).toContainText('Template Assignment Rules');

    // Verify 6-level hierarchy pill headers
    await expect(page.locator('text=1. Worker Override')).toBeVisible();
    await expect(page.locator('text=2. Job Category')).toBeVisible();
    await expect(page.locator('text=3. Org Unit')).toBeVisible();
    await expect(page.locator('text=4. Location')).toBeVisible();
    await expect(page.locator('text=5. Org Default')).toBeVisible();
    await expect(page.locator('text=6. System Default')).toBeVisible();

    // Verify active assignment mapping in table
    await expect(page.locator('strong:has-text("Factory Standard Bilingual Badge")')).toBeVisible();
    await expect(page.locator('.divide-y').locator('text=WORKER')).toBeVisible();
  });
});
