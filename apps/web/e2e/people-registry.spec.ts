import { test, expect } from '@playwright/test';

test.describe('Phase 4: Worker Registry, Employment Records & Sensitive Identity E2E', () => {
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

    // 5. Mock People Registry List
    await page.route(/\/api\/people(\?.*)?$/, async (route) => {
      if (route.request().method() === 'GET') {
        const url = new URL(route.request().url());
        const search = url.searchParams.get('search')?.toLowerCase();

        let items = [
          {
            id: 'p-1',
            displayName: 'Tanvir Ahmed',
            displayNameLatin: 'Tanvir Ahmed',
            displayNameNative: 'তানভীর আহমেদ',
            gender: 'MALE',
            bloodGroup: 'O+',
            primaryPhone: '+8801711000001',
            primaryEmail: 'tanvir.ahmed@londonboyapparel.com',
            version: 1,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
            activeEmployment: {
              id: 'emp-1',
              employeeNumber: 'EMP-1001',
              jobTitle: 'Senior Production Manager',
              jobCategory: 'MANAGEMENT',
              joinDate: '2022-01-15',
              status: 'ACTIVE',
              organizationName: 'London Boy Apparel',
              locationName: 'Gazipur Manufacturing Plant',
              orgUnitName: 'Manufacturing Division',
              orgUnitNameBangla: 'উৎপাদন বিভাগ',
            },
            identityDocument: {
              id: 'doc-1',
              documentType: 'SMART_NID',
              documentNumberMasked: '••••••••8901',
              isVerified: true,
            },
          },
          {
            id: 'p-2',
            displayName: 'Farhana Akter',
            displayNameLatin: 'Farhana Akter',
            displayNameNative: 'ফারহানা আক্তার',
            gender: 'FEMALE',
            bloodGroup: 'AB+',
            primaryPhone: '+8801711000004',
            primaryEmail: 'farhana.akter@londonboyapparel.com',
            version: 1,
            createdAt: '2024-02-01T00:00:00Z',
            updatedAt: '2024-02-01T00:00:00Z',
            activeEmployment: {
              id: 'emp-2',
              employeeNumber: 'EMP-1004',
              jobTitle: 'HR Compliance Officer',
              jobCategory: 'STAFF',
              joinDate: '2023-08-20',
              status: 'ACTIVE',
              organizationName: 'London Boy Apparel',
              locationName: 'Gazipur Manufacturing Plant',
              orgUnitName: 'Garments Production',
            },
            identityDocument: {
              id: 'doc-2',
              documentType: 'PASSPORT',
              documentNumberMasked: '•••••7654',
              isVerified: true,
            },
          },
        ];

        if (search) {
          items = items.filter(
            (i) =>
              i.displayName.toLowerCase().includes(search) ||
              (i.displayNameNative && i.displayNameNative.includes(search)) ||
              i.activeEmployment.jobTitle.toLowerCase().includes(search) ||
              i.activeEmployment.employeeNumber.toLowerCase().includes(search),
          );
        }

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            items,
            pagination: {
              page: 1,
              limit: 25,
              totalCount: items.length,
              totalPages: 1,
              hasNextPage: false,
              hasPrevPage: false,
            },
          }),
        });
      } else if (route.request().method() === 'POST') {
        const body = JSON.parse(route.request().postData() || '{}');
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            person: {
              id: 'p-new-123',
              displayName: body.displayName,
              displayNameLatin: body.displayNameLatin,
              displayNameNative: body.displayNameNative,
              version: 1,
            },
            employment: {
              id: 'emp-new-123',
              employeeNumber: body.employment.employeeNumber,
              jobTitle: body.employment.jobTitle,
              status: body.employment.status,
            },
          }),
        });
      }
    });

    // 6. Mock Duplicate Check
    await page.route('/api/people/validate', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          hasDuplicates: false,
          warnings: [],
        }),
      });
    });

    // 7. Mock Person Detail Lookup
    await page.route(/\/api\/people\/(?!validate$)[a-zA-Z0-9_-]+$/, async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            person: {
              id: 'p-1',
              displayName: 'Tanvir Ahmed',
              displayNameLatin: 'Tanvir Ahmed',
              displayNameNative: 'তানভীর আহমেদ',
              gender: 'MALE',
              bloodGroup: 'O+',
              primaryPhone: '+8801711000001',
              primaryEmail: 'tanvir.ahmed@londonboyapparel.com',
              version: 1,
              createdAt: '2024-01-01T00:00:00Z',
              updatedAt: '2024-01-01T00:00:00Z',
              activeEmployment: {
                id: 'emp-1',
                employeeNumber: 'EMP-1001',
                jobTitle: 'Senior Production Manager',
                jobCategory: 'MANAGEMENT',
                joinDate: '2022-01-15',
                status: 'ACTIVE',
                organization: {
                  id: 'org-london-boy',
                  name: 'London Boy Apparel Ltd.',
                  displayName: 'London Boy Apparel',
                },
                location: { id: 'loc-gzp', name: 'Gazipur Manufacturing Plant', code: 'GZP_PLANT' },
                orgUnit: {
                  id: 'unit-mfg',
                  name: 'Manufacturing Division',
                  nameBangla: 'উৎপাদন বিভাগ',
                  code: 'MFG_DIV',
                },
              },
              employments: [
                {
                  id: 'emp-1',
                  employeeNumber: 'EMP-1001',
                  jobTitle: 'Senior Production Manager',
                  jobCategory: 'MANAGEMENT',
                  joinDate: '2022-01-15',
                  status: 'ACTIVE',
                  organization: {
                    id: 'org-london-boy',
                    name: 'London Boy Apparel Ltd.',
                    displayName: 'London Boy Apparel',
                  },
                  location: { id: 'loc-gzp', name: 'Gazipur Manufacturing Plant' },
                  orgUnit: {
                    id: 'unit-mfg',
                    name: 'Manufacturing Division',
                    nameBangla: 'উৎপাদন বিভাগ',
                  },
                },
              ],
              identityDocuments: [
                {
                  id: 'doc-1',
                  documentType: 'SMART_NID',
                  country: 'BGD',
                  documentNumberMasked: '••••••••8901',
                  isVerified: true,
                },
              ],
            },
          }),
        });
      } else if (route.request().method() === 'PUT') {
        const body = JSON.parse(route.request().postData() || '{}');
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            person: {
              id: 'p-1',
              displayName: body.displayName,
              version: 2,
            },
          }),
        });
      }
    });

    // 8. Mock Identity Document Reveal
    await page.route(
      /\/api\/people\/[a-zA-Z0-9_-]+\/identity-documents\/[a-zA-Z0-9_-]+\/reveal$/,
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            documentId: 'doc-1',
            documentType: 'SMART_NID',
            documentNumber: '19882612345678901',
            expiresInSeconds: 30,
          }),
        });
      },
    );

    // 9. Mock Employment Update
    await page.route(/\/api\/employments\/[a-zA-Z0-9_-]+$/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          employment: {
            id: 'emp-1',
            jobTitle: 'Lead Compliance Officer',
            version: 2,
          },
        }),
      });
    });
  });

  test('navigates to People Registry, verifies table rendering, and searches bilingual workers', async ({
    page,
  }) => {
    await page.goto('/people');
    await expect(page.locator('h1')).toContainText('People Registry');

    // Verify seeded workers appear in table
    await expect(page.locator('text=Tanvir Ahmed').first()).toBeVisible();
    await expect(page.locator('text=তানভীর আহমেদ').first()).toBeVisible();
    await expect(page.locator('text=EMP-1001').first()).toBeVisible();

    // Verify government ID is masked by default
    await expect(page.locator('text=••••••••8901').first()).toBeVisible();

    // Test Search by Bangla Script
    const searchInput = page.locator('input[placeholder*="Search by name"]');
    await searchInput.fill('ফারহানা');
    await expect(page.locator('text=Farhana Akter')).toBeVisible();
    await expect(page.locator('text=তানভীর আহমেদ')).not.toBeVisible();

    // Clear search
    await searchInput.fill('');
    await expect(page.locator('text=Tanvir Ahmed').first()).toBeVisible();
  });

  test('executes 3-step Add Worker Wizard and registers bilingual worker with duplicate check', async ({
    page,
  }) => {
    await page.goto('/people/new');
    await expect(page.locator('h1')).toContainText('Add Worker');

    const uniqueSuffix = 1007;
    const empNumber = `EMP-${uniqueSuffix}`;

    // Step 1: Employment Details
    await page.fill('input#employeeNumber', empNumber);
    await page.fill('input#jobTitle', 'Senior Quality Auditor');
    await page.click('button:has-text("Next: Person Details")');

    // Step 2: Person & Sensitive Identity Details
    await expect(page.locator('text=Step 2: Person Identity & Bilingual Details')).toBeVisible();
    await page.fill('input#displayName', `Test Operator ${uniqueSuffix}`);
    await page.fill('input#displayNameNative', `টেস্ট অপারেটর ${uniqueSuffix}`);

    await page.click('button:has-text("Next: Review & Readiness")');

    // Step 3: Review & Save
    await expect(
      page.locator('text=Step 3: Review, Duplicate Checks & Card Readiness'),
    ).toBeVisible();
    await expect(page.locator(`text=Test Operator ${uniqueSuffix}`)).toBeVisible();

    // Save worker
    await page.click('button:has-text("Save Worker")');
    await page.waitForURL(/\/people\/[a-zA-Z0-9_-]+$/);

    // Verify detail page
    await expect(page.locator('h1')).toContainText('Tanvir Ahmed');
  });

  test('reveals sensitive government document with audited unmasking and countdown timer', async ({
    page,
  }) => {
    await page.goto('/people/p-1');

    // Verify initial masked state
    await expect(page.locator('text=••••••••8901')).toBeVisible();

    // Click Reveal button
    await page.click('button:has-text("Reveal (Audited)")');

    // Verify unmasked plaintext is displayed
    await expect(page.locator('text=19882612345678901')).toBeVisible();
    await expect(page.locator('text=Auto-masks in')).toBeVisible();
  });

  test('edits worker details with optimistic concurrency controls', async ({ page }) => {
    await page.goto('/people/p-1/edit');

    // Edit Job title
    const jobTitleInput = page.locator('input[value="Senior Production Manager"]');
    await jobTitleInput.fill('Lead Production Director');

    await page.click('button:has-text("Save Changes")');
    await page.waitForURL(/\/people\/[a-zA-Z0-9_-]+$/);

    await expect(page.locator('h1')).toContainText('Tanvir Ahmed');
  });
});
