import { test, expect } from '@playwright/test';

test.describe('Phase 5: Secure Employee-Photo Workflow & Phone Handoff E2E', () => {
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
              'identity.reveal',
              'identity.edit',
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

    // 3. Mock Locations
    await page.route('/api/locations', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          locations: [
            {
              id: 'loc-gzp',
              organizationId: 'org-london-boy',
              name: 'Gazipur Manufacturing Plant',
              code: 'GZP_PLANT',
              type: 'FACTORY',
              isDefault: false,
            },
          ],
        }),
      });
    });

    // 4. Mock OrgUnits
    await page.route('/api/org-units', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          orgUnits: [
            {
              id: 'unit-mfg',
              organizationId: 'org-london-boy',
              name: 'Manufacturing Division',
              nameBangla: 'উৎপাদন বিভাগ',
              code: 'MFG_DIV',
              type: 'DIVISION',
            },
          ],
        }),
      });
    });

    // 5. Mock Validate (Dry-run duplicate check)
    await page.route('/api/people/validate', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ warnings: [] }),
      });
    });

    // 6. Mock Phone Handoff Endpoints
    await page.route('/api/media/handoff/create-token', async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          tokenId: 'mock-token-uuid-1',
          slotId: 'EMP-1007',
          token: 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
          qrUrl:
            'http://localhost:3000/capture/abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
          expiresAt: new Date(Date.now() + 300000).toISOString(),
          expiresInSeconds: 300,
        }),
      });
    });

    await page.route(/\/api\/media\/handoff\/verify\/[a-zA-Z0-9_-]+$/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          isValid: true,
          slotId: 'EMP-1007',
          tenantId: 'tenant-1',
          expiresInSeconds: 290,
        }),
      });
    });

    await page.route(/\/api\/media\/handoff\/[a-zA-Z0-9_-]+\/upload$/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Photo successfully uploaded and transferred to desktop workspace.',
          mediaAssetId: 'mock-uploaded-media-asset-id',
        }),
      });
    });

    await page.route(/\/api\/people\/[a-zA-Z0-9_-]+\/photo$/, async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            mediaAssetId: 'mock-uploaded-media-asset-id',
            width: 709,
            height: 1063,
            fileSizeBytes: 85000,
            qualityReport: {
              isAcceptable: true,
              warnings: [],
              width: 709,
              height: 1063,
              luminance: 130,
            },
          }),
        });
      } else if (route.request().method() === 'DELETE') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      }
    });
  });

  test('should display camera pre-permission explanation, device triggers, and file fallback in wizard', async ({
    page,
  }) => {
    await page.goto('/people/new');
    await expect(page.locator('h1')).toContainText('Add Worker');

    // Step 1: Fill Employment and navigate to Step 2
    await page.fill('input#employeeNumber', 'EMP-1007');
    await page.fill('input#jobTitle', 'Quality Assurance Inspector');
    await page.click('button:has-text("Next: Person Details")');

    // Step 2: Person & Photo Studio
    await expect(page.locator('text=Step 2: Person Identity & Bilingual Details')).toBeVisible();
    await expect(page.locator('text=ID Card Portrait Photo')).toBeVisible();
    await expect(page.locator('button:has-text("Use Camera")')).toBeVisible();
    await expect(page.locator('button:has-text("Use Phone")')).toBeVisible();

    // Click "Use Camera" -> Verify Pre-permission Explanation Modal
    await page.click('button:has-text("Use Camera")');
    await expect(page.locator('h3:has-text("In-Browser Camera Studio")')).toBeVisible();
    await expect(page.locator('h4:has-text("Camera Permission Required")')).toBeVisible();
    await expect(
      page.locator('text=No cloud telemetry or external recording is performed'),
    ).toBeVisible();

    // Close Modal via close icon or label
    await page.locator('.fixed svg.lucide-x').first().click();
    await expect(page.locator('h3:has-text("In-Browser Camera Studio")')).not.toBeVisible();
  });

  test('should support phone handoff QR code modal with countdown and copy link fallback', async ({
    page,
  }) => {
    await page.goto('/people/new');
    await expect(page.locator('h1')).toContainText('Add Worker');

    await page.fill('input#employeeNumber', 'EMP-1007');
    await page.fill('input#jobTitle', 'Quality Assurance Inspector');
    await page.click('button:has-text("Next: Person Details")');

    // Open "Use Phone" Modal
    await page.click('button:has-text("Use Phone")');
    await expect(page.locator('h3:has-text("Use Smartphone Camera")')).toBeVisible();
    await expect(page.locator('text=Single-Use Session')).toBeVisible();
    await expect(page.locator('text=Expires in')).toBeVisible();
    await expect(page.locator('text=Zero PII contained in QR link')).toBeVisible();

    // Verify Copy Link button
    await expect(page.locator('button:has-text("Copy")')).toBeVisible();
    await page.locator('.fixed button:has-text("Cancel")').click();
    await expect(page.locator('h3:has-text("Use Smartphone Camera")')).not.toBeVisible();
  });

  test('should open mobile phone capture page, validate zero-PII token, and provide camera trigger', async ({
    page,
  }) => {
    // Navigate directly to mobile capture route
    await page.goto('/capture/mock-valid-token-123456');

    await expect(page.locator('text=Mobile Photo Studio')).toBeVisible();
    await expect(page.locator('h1:has-text("Capture Employee Portrait")')).toBeVisible();
    await expect(page.locator('text=Open Camera')).toBeVisible();
    await expect(page.locator('text=Choose from Gallery')).toBeVisible();
    await expect(page.locator('text=Zero PII is stored on this phone')).toBeVisible();
  });
});
