import { test, expect } from '@playwright/test';

test.describe('Phase 3: Company Administration & Organization Tree E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Mock user session & activated system status
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
              'exports.create',
              'audit.view',
              'backup.manage',
              'system.manage',
            ],
          },
          system: { isActivated: true, requiresActivation: false },
        }),
      });
    });

    // Mock Print Jobs Queue for App Shell
    await page.route('/api/cards/print-jobs*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [],
          totalCount: 0,
        }),
      });
    });

    // Mock organizations
    await page.route('/api/organizations*', async (route) => {
      if (route.request().method() === 'GET') {
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
                address: {
                  street: 'Plot 42, Sector 3, Uttara C/A',
                  city: 'Dhaka',
                  postalCode: '1230',
                  country: 'Bangladesh',
                },
                contactEmail: 'info@londonboyapparel.com',
                contactPhone: '+88028901234',
                employeeNumberRule: {
                  prefix: 'EMP-',
                  padLength: 4,
                  nextSequence: 1005,
                },
              },
            ],
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.route('/api/organizations/org-london-boy', async (route) => {
      if (route.request().method() === 'PUT') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            organization: {
              id: 'org-london-boy',
              name: 'London Boy Apparel Ltd.',
              displayName: 'London Boy Fashion Group',
              code: 'LONDON_BOY',
              primaryColor: '#134E4A',
              secondaryColor: '#0F766E',
              accentColor: '#14B8A6',
              locale: 'en-US',
              timezone: 'Asia/Dhaka',
              isDefault: true,
              employeeNumberRule: {
                prefix: 'EMP-',
                padLength: 4,
                nextSequence: 1005,
              },
            },
            message: 'Company profile and branding updated successfully.',
          }),
        });
      }
    });

    // Mock locations
    await page.route('/api/locations*', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            locations: [
              {
                id: 'loc-dhaka',
                organizationId: 'org-london-boy',
                name: 'Dhaka Corporate Office',
                code: 'DHK_HQ',
                type: 'HEADQUARTERS',
                isDefault: true,
                address: {
                  street: 'Plot 42, Sector 3, Uttara',
                  city: 'Dhaka',
                  country: 'Bangladesh',
                },
                contactPhone: '+88028901234',
                unitCount: 2,
              },
              {
                id: 'loc-gazipur',
                organizationId: 'org-london-boy',
                name: 'Gazipur Manufacturing Plant',
                code: 'GZP_PLANT',
                type: 'FACTORY',
                isDefault: false,
                address: {
                  street: 'Bypass Road, Joydebpur',
                  city: 'Gazipur',
                  country: 'Bangladesh',
                },
                contactPhone: '+88029205678',
                unitCount: 3,
              },
            ],
          }),
        });
      } else if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            location: {
              id: 'loc-ctg',
              organizationId: 'org-london-boy',
              name: 'Chittagong Port Facility',
              code: 'CTG_PORT',
              type: 'SITE',
              isDefault: false,
            },
          }),
        });
      }
    });

    // Mock org units
    await page.route('/api/org-units*', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            units: [
              {
                id: 'unit-mfg-div',
                organizationId: 'org-london-boy',
                parentId: null,
                name: 'Manufacturing Division',
                nameBangla: 'উৎপাদন বিভাগ',
                code: 'MFG_DIV',
                type: 'DIVISION',
                locationId: 'loc-gazipur',
                locationName: 'Gazipur Manufacturing Plant',
                isArchived: false,
                sortOrder: 1,
                breadcrumbPath: 'Manufacturing Division',
                childrenCount: 2,
                workerCount: 450,
              },
              {
                id: 'unit-garments-dept',
                organizationId: 'org-london-boy',
                parentId: 'unit-mfg-div',
                name: 'Garments Production',
                nameBangla: 'পোশাক প্রস্তুতকরণ',
                code: 'GARMENTS_PROD',
                type: 'DEPARTMENT',
                locationId: 'loc-gazipur',
                locationName: 'Gazipur Manufacturing Plant',
                isArchived: false,
                sortOrder: 1,
                breadcrumbPath: 'Manufacturing Division > Garments Production',
                childrenCount: 1,
                workerCount: 320,
              },
              {
                id: 'unit-cutting-sec',
                organizationId: 'org-london-boy',
                parentId: 'unit-garments-dept',
                name: 'Cutting Section',
                nameBangla: 'কাটিং সেকশন',
                code: 'CUT_SEC',
                type: 'SECTION',
                locationId: 'loc-gazipur',
                locationName: 'Gazipur Manufacturing Plant',
                isArchived: false,
                sortOrder: 1,
                breadcrumbPath: 'Manufacturing Division > Garments Production > Cutting Section',
                childrenCount: 0,
                workerCount: 80,
              },
            ],
          }),
        });
      } else if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            unit: {
              id: 'unit-logistics',
              organizationId: 'org-london-boy',
              parentId: null,
              name: 'Logistics & Supply',
              nameBangla: 'লজিস্টিকস ও সাপ্লাই',
              code: 'LOGISTICS_SUPPLY',
              type: 'DIVISION',
              isArchived: false,
              sortOrder: 2,
              childrenCount: 0,
              workerCount: 0,
            },
          }),
        });
      }
    });

    // Mock roles
    await page.route('/api/roles*', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            roles: [
              {
                id: 'role-owner',
                name: 'system_owner',
                description: 'Full administrative control over the entire system.',
                isBuiltIn: true,
                permissions: ['people.view', 'people.edit', 'system.manage'],
                assignedUserCount: 1,
              },
              {
                id: 'role-company-admin',
                name: 'company_admin',
                description: 'Full control over company settings and people.',
                isBuiltIn: true,
                permissions: ['people.view', 'people.edit', 'organization.manage'],
                assignedUserCount: 2,
              },
            ],
          }),
        });
      } else if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            role: {
              id: 'role-custom-sup',
              name: 'Line Supervisor',
              description: 'Oversees daily production line identity badges',
              isBuiltIn: false,
              permissions: ['people.view', 'cards.print'],
              assignedUserCount: 0,
            },
          }),
        });
      }
    });

    // Mock users
    await page.route('/api/users', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            users: [
              {
                id: 'usr-admin-1',
                username: 'admin',
                email: 'admin@londonboyapparel.com',
                isActive: true,
                isTemporaryBootstrap: false,
                mustChangePassword: false,
                roles: [
                  {
                    id: 'role-owner',
                    name: 'system_owner',
                    isBuiltIn: true,
                    organizationId: 'org-london-boy',
                    locationId: null,
                  },
                ],
                createdAt: new Date().toISOString(),
                lastLoginAt: new Date().toISOString(),
              },
            ],
          }),
        });
      }
    });
  });

  test('explores organization tree hierarchy and verifies Unicode/Bangla rendering', async ({
    page,
  }) => {
    await page.goto('/organization');
    await expect(page.locator('h1')).toContainText('Organization Tree');

    // Verify root division exists with Bangla script
    await expect(page.locator('text=Manufacturing Division')).toBeVisible();
    await expect(page.locator('text=উৎপাদন বিভাগ')).toBeVisible();

    // Verify departments under division
    await expect(page.locator('text=Garments Production')).toBeVisible();
    await expect(page.locator('text=পোশাক প্রস্তুতকরণ')).toBeVisible();

    // Verify sections under department
    await expect(page.locator('text=Cutting Section')).toBeVisible();
    await expect(page.locator('text=কাটিং সেকশন')).toBeVisible();

    // Switch to table view and verify breadcrumbs
    await page.click('button:has-text("Table View")');
    await expect(page.locator('table')).toBeVisible();
    await expect(
      page.locator('text=Manufacturing Division > Garments Production > Cutting Section'),
    ).toBeVisible();
  });

  test('adds a new sub-unit and opens the add modal', async ({ page }) => {
    await page.goto('/organization');

    // Click "Add Root Unit"
    await page.click('button:has-text("Add Root Unit")');

    // Fill form
    await page.fill('input[placeholder="e.g. Garments Production"]', 'Logistics & Supply');
    await page.fill('input[placeholder="যেমন: পোশাক প্রস্তুতকরণ"]', 'লজিস্টিকস ও সাপ্লাই');
    await page.fill('input[placeholder="e.g. GARMENTS_PROD"]', 'LOGISTICS_SUPPLY');
    await page.click('button[type="submit"]:has-text("Create Unit")');

    // Verify success feedback
    await expect(page.locator("text=Unit 'Logistics & Supply' created successfully")).toBeVisible();
  });

  test('manages company settings, branding colors and employee number rules', async ({ page }) => {
    await page.goto('/admin/company');
    await expect(page.locator('h1')).toContainText('Company Administration');

    // Update display name
    await page.fill('input[placeholder="e.g. London Boy Apparel"]', 'London Boy Fashion Group');

    // Verify live preview of employee number
    await expect(page.locator('text=EMP-1005')).toBeVisible();

    // Save settings
    await page.click('button[type="submit"]:has-text("Save Company Settings")');
    await expect(
      page.locator('text=Company profile and branding updated successfully'),
    ).toBeVisible();
  });

  test('manages locations with add and list capabilities', async ({ page }) => {
    await page.goto('/admin/locations');
    await expect(page.locator('h1')).toContainText('Location Management');

    // Verify seeded locations
    await expect(page.locator('text=Dhaka Corporate Office')).toBeVisible();
    await expect(page.locator('text=Gazipur Manufacturing Plant')).toBeVisible();

    // Add a new branch
    await page.click('button:has-text("Add Location")');
    await page.fill('input[placeholder="e.g. Gazipur Plant"]', 'Chittagong Port Facility');
    await page.fill('input[placeholder="e.g. GZP_PLANT"]', 'CTG_PORT');
    await page.click('button[type="submit"]:has-text("Create Location")');

    await expect(
      page.locator("text=Location 'Chittagong Port Facility' created successfully"),
    ).toBeVisible();
  });

  test('creates a custom role with permission checklist', async ({ page }) => {
    await page.goto('/admin/roles');
    await expect(page.locator('h1')).toContainText('Roles & Permissions');

    // Built-in roles present in role list
    await expect(page.locator('h3:has-text("system_owner")')).toBeVisible();
    await expect(page.locator('h3:has-text("company_admin")')).toBeVisible();

    // Click "Create Custom Role"
    await page.click('button:has-text("Create Custom Role")');
    await page.fill('input[placeholder="e.g. Plant HR Officer"]', 'Line Supervisor');
    await page.fill(
      'input[placeholder="e.g. Manages factory workers and prints ID cards"]',
      'Oversees daily production line identity badges',
    );

    // Toggle specific permissions in the checklist
    await page.click('text=View People');
    await page.click('text=Print Cards');

    await page.click('button[type="submit"]:has-text("Create Role")');
    await expect(page.locator("text=Role 'Line Supervisor' created successfully")).toBeVisible();
  });

  test('verifies responsive layouts on mobile (360px) and tablet (768px)', async ({ page }) => {
    // 360px mobile viewport
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto('/organization');
    await expect(page.locator('h1')).toBeVisible();

    // Verify mobile navigation trigger (either top bar drawer button or bottom nav more)
    const drawerBtn = page.getByRole('button', { name: /Toggle navigation|Open full navigation/i }).first();
    if (await drawerBtn.isVisible()) {
      await drawerBtn.click();
      await expect(page.getByRole('link', { name: /Locations & units|Organization/i }).first()).toBeVisible();
    }

    // 768px tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/admin/company');
    await expect(page.locator('h1')).toBeVisible();
  });
});
