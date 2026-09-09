import { test, expect } from '@playwright/test';

test.describe('Phase 10: System Health, Encrypted Backups & Disaster Recovery', () => {
  test.beforeEach(async ({ page }) => {
    // Mock Auth & Tenant
    await page.route('**/api/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'owner-uuid-1',
            tenantId: 'tenant-uuid-1',
            username: 'admin_owner',
            roles: ['system_owner'],
            permissions: ['system.manage', 'backup.manage', 'people.view', 'audit.view'],
          },
          system: {
            requiresActivation: false,
          },
        }),
      });
    });

    await page.route('**/api/organizations*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          organizations: [
            {
              id: 'org-uuid-1',
              name: 'Acme Garments Ltd.',
              code: 'ACME',
              isDefault: true,
            },
          ],
        }),
      });
    });
  });

  test('System Health dashboard displays component status matrix, disk metrics, and LAN trust guide', async ({
    page,
  }) => {
    await page.route('**/api/system/diagnostics', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'ok',
          timestamp: new Date().toISOString(),
          uptimeSeconds: 7200,
          appVersion: '0.1.0',
          schemaVersion: '20260825100000_add_backup_and_recovery',
          nodeVersion: 'v22.13.0',
          environment: 'production',
          isActivated: true,
          lanEnabled: false,
          maintenanceMode: false,
          components: {
            web: { status: 'ok' },
            api: { status: 'ok' },
            database: { status: 'ok', latencyMs: 3 },
            worker: { status: 'ok', lastHeartbeat: new Date().toISOString() },
            storage: { status: 'ok', writable: true, isExternal: true, path: './storage/uploads' },
            renderer: { status: 'ok', poolReady: true },
            backups: {
              status: 'ok',
              lastBackupAt: new Date().toISOString(),
              lastBackupStatus: 'COMPLETED',
              daysSinceLastBackup: 0,
              isWarning: false,
            },
          },
          disk: {
            totalBytes: 500000000000,
            freeBytes: 350000000000,
            usedBytes: 150000000000,
            usedPercentage: 30,
            isLowDisk: false,
          },
        }),
      });
    });

    await page.goto('/admin/system');

    await expect(page.locator('h1', { hasText: 'System & Health' })).toBeVisible();
    await expect(page.locator('text=Component Health Matrix')).toBeVisible();

    // Verify all 6 components
    await expect(page.locator('text=API Server')).toBeVisible();
    await expect(page.locator('text=PostgreSQL DB')).toBeVisible();
    await expect(page.locator('text=Media Storage')).toBeVisible();
    await expect(page.locator('text=Background Worker')).toBeVisible();
    await expect(page.locator('text=Chromium Renderer')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Encrypted Backups' })).toBeVisible();

    // Verify disk capacity display
    await expect(page.locator('text=Storage Volume Capacity')).toBeVisible();

    // Open Mobile Device CA Trust Setup modal
    await page.getByRole('button', { name: 'View Mobile Certificate Guide' }).click();
    await expect(page.locator('h3', { hasText: 'Mobile Device CA Trust Setup' })).toBeVisible();
    await expect(page.locator('text=Apple iOS')).toBeVisible();
    await expect(page.locator('text=Google Android')).toBeVisible();
    await page.getByRole('button', { name: 'Close Guide' }).click();
  });

  test('Backups page allows creating encrypted backup and managing automated schedule', async ({
    page,
  }) => {
    await page.route('**/api/backups**', async (route) => {
      const url = route.request().url();
      if (url.includes('/schedule')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            schedule: {
              id: 'sched-1',
              tenantId: 'tenant-uuid-1',
              isEnabled: true,
              cronExpression: '0 2 * * *',
              retentionCount: 7,
              targetDirectory: './backups',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
            storageSafety: { isExternal: true },
          }),
        });
        return;
      }

      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            backups: [
              {
                id: 'backup-1',
                tenantId: 'tenant-uuid-1',
                status: 'COMPLETED',
                trigger: 'MANUAL',
                fileName: 'backup-acme-2026-08-25.hrbackup',
                filePath: './backups/backup-acme-2026-08-25.hrbackup',
                fileSizeBytes: 15420000,
                checksumSha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
                appVersion: '0.1.0',
                schemaVersion: '20260825100000_add_backup_and_recovery',
                totalRecords: 150,
                totalMediaFiles: 140,
                isVerified: true,
                verifiedAt: new Date().toISOString(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
            ],
          }),
        });
      } else if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'backup-2',
            fileName: 'backup-acme-new.hrbackup',
            status: 'COMPLETED',
            isVerified: true,
          }),
        });
      }
    });

    await page.goto('/admin/backups');

    await expect(
      page.locator('h1', { hasText: 'Encrypted Backups & Disaster Recovery' }),
    ).toBeVisible();

    // Verify backup schedule form
    await expect(page.locator('text=Automated Backup Schedule')).toBeVisible();

    // Verify backup table shows existing record
    await expect(page.locator('text=backup-acme-2026-08-25.hrbackup')).toBeVisible();
    await expect(page.getByText('Verified', { exact: true })).toBeVisible();

    // Open create backup modal
    await page.getByRole('button', { name: 'Create Backup Now' }).click();
    await expect(page.locator('h3', { hasText: 'Create Encrypted Backup' })).toBeVisible();
    await page.getByRole('button', { name: 'Cancel' }).click();
  });

  test('Restore Wizard steps through dry inspection and owner authorization', async ({ page }) => {
    await page.route('**/api/restore/inspect', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          isValid: true,
          compatibilityStatus: 'COMPATIBLE',
          appVersion: '0.1.0',
          schemaVersion: '20260825100000_add_backup_and_recovery',
          currentAppVersion: '0.1.0',
          currentSchemaVersion: '20260825100000_add_backup_and_recovery',
          createdAt: new Date().toISOString(),
          tenant: {
            id: 'tenant-uuid-1',
            slug: 'acme',
            name: 'Acme Garments Ltd.',
          },
          counts: {
            organizations: 1,
            locations: 2,
            orgUnits: 5,
            people: 120,
            employments: 120,
            identityDocuments: 110,
            mediaAssets: 120,
            cardTemplates: 4,
            cardIssues: 50,
            auditEvents: 300,
            users: 3,
            roles: 4,
          },
          mediaSizeBytes: 42000000,
          warnings: [],
          errors: [],
        }),
      });
    });

    await page.route('**/api/restore/execute', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message:
            'Restore completed successfully. All records and media assets have been restored.',
          preRestoreBackupId: 'safety-backup-uuid-99',
          restoredCounts: { people: 120, employments: 120 },
        }),
      });
    });

    await page.goto('/admin/restore');

    await expect(
      page.locator('h1', { hasText: 'Disaster Recovery & Restore Wizard' }),
    ).toBeVisible();

    // Step 1: Upload and Passphrase
    await page.setInputFiles('input[type="file"]', {
      name: 'test-backup.hrbackup',
      mimeType: 'application/octet-stream',
      buffer: Buffer.from('HRBK_mock_file_content'),
    });
    await page.fill('input[placeholder="Enter encryption passphrase..."]', 'Passphrase12345!');
    await page.getByRole('button', { name: 'Inspect & Validate' }).click();

    // Step 2: Dry Inspection Report
    await expect(
      page.locator('h2', { hasText: 'Step 2: Pre-Flight Dry Inspection Report' }),
    ).toBeVisible();
    await expect(page.locator('text=120 workers')).toBeVisible();
    await expect(page.locator('text=COMPATIBLE')).toBeVisible();
    await page.getByRole('button', { name: 'Continue to Authorization' }).click();

    // Step 3: Authorization
    await expect(
      page.locator('h2', { hasText: 'Step 3: System Owner Authorization' }),
    ).toBeVisible();
    await page.fill(
      'input[placeholder="Enter current login password..."]',
      'SystemOwnerPassword2026!',
    );
    await page.locator('input[type="checkbox"]').check();
    await page.getByRole('button', { name: 'Execute Verified Restore' }).click();

    // Verification of Completion Screen
    await expect(page.locator('h2', { hasText: 'Restore Completed Successfully!' })).toBeVisible();
    await expect(page.locator('text=safety-backup-uuid-99')).toBeVisible();
  });
});
