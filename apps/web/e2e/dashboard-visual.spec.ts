import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Dashboard Visual & Multi-Viewport Verification', () => {
  const artifactDir = 'C:\\Users\\User\\.gemini\\antigravity\\brain\\f9b20666-74c3-4770-b9e2-0bb7b6fc5926';

  const mockOverview = {
    generatedAt: new Date().toISOString(),
    scope: {
      mode: 'SINGLE',
      organizationId: 'org-1',
      organizationName: 'London Boy Apparel Ltd.',
    },
    primaryAction: {
      canCreateCard: true,
    },
    metrics: {
      activeWorkers: 142,
      readyForCard: 128,
      needsAttention: 14,
      queuedPrintJobs: 3,
      issuedToday: 24,
      missingPhotoCount: 10,
    },
    readiness: {
      total: 142,
      readyCount: 128,
      needsAttentionCount: 14,
      reasons: [
        {
          code: 'MISSING_PHOTO',
          label: 'Missing portrait photo',
          count: 10,
          actionHref: '/people?filter=missing-photo',
        },
        {
          code: 'EMPLOYMENT_INACTIVE',
          label: 'Inactive employment contract',
          count: 4,
          actionHref: '/people?filter=inactive',
        },
      ],
    },
    recentWorkers: [
      {
        personId: 'p-1',
        employmentId: 'emp-1',
        displayName: 'Tanvir Ahmed',
        displayNameLatin: 'Tanvir Ahmed',
        displayNameNative: 'তানভীর আহমেদ',
        employeeNumber: 'EMP-1001',
        jobTitle: 'Senior Quality Auditor',
        employmentStatus: 'ACTIVE',
        unitName: 'Quality Assurance Dept.',
        unitNameBangla: 'গুণমান নিশ্চিতকরণ বিভাগ',
        locationName: 'Dhaka Production Facility',
        hasPhoto: true,
        safePhotoUrl: null,
        isReadyForCard: true,
        readinessBlockersCount: 0,
      },
      {
        personId: 'p-2',
        employmentId: 'emp-2',
        displayName: 'Farzana Yasmin',
        displayNameLatin: 'Farzana Yasmin',
        displayNameNative: 'ফারজানা ইয়াসমিন',
        employeeNumber: 'EMP-1002',
        jobTitle: 'Pattern Master',
        employmentStatus: 'ACTIVE',
        unitName: 'Cutting Division',
        unitNameBangla: 'কাটিং বিভাগ',
        locationName: 'Chittagong Unit 2',
        hasPhoto: false,
        safePhotoUrl: null,
        isReadyForCard: false,
        readinessBlockersCount: 1,
      },
      {
        personId: 'p-3',
        employmentId: 'emp-3',
        displayName: 'Mohammad Rafiqul Islam',
        displayNameLatin: 'Mohammad Rafiqul Islam',
        displayNameNative: 'মোহাম্মদ রফিকুল ইসলাম',
        employeeNumber: 'EMP-1003',
        jobTitle: 'Line Chief Supervisor',
        employmentStatus: 'ACTIVE',
        unitName: 'Sewing Line 04',
        unitNameBangla: 'সেলাই লাইন ০৪',
        locationName: 'Dhaka Production Facility',
        hasPhoto: true,
        safePhotoUrl: null,
        isReadyForCard: true,
        readinessBlockersCount: 0,
      },
    ],
    printQueue: {
      totalQueued: 3,
      totalsByStatus: {
        queued: 2,
        processing: 1,
        completed: 18,
        defects: 0,
      },
      recentJobs: [
        {
          id: 'job-984210',
          status: 'PROCESSING',
          operatorStatus: 'UNCONFIRMED',
          totalItems: 8,
          outputFormat: 'INDIVIDUAL_PDF',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'job-984209',
          status: 'QUEUED',
          operatorStatus: 'UNCONFIRMED',
          totalItems: 12,
          outputFormat: 'A4_SHEET',
          createdAt: new Date(Date.now() - 3600000).toISOString(),
        },
      ],
    },
    activeTemplate: {
      id: 'tpl-1',
      name: 'London Boy Dual-Sided Master (60×90mm)',
      format: 'COMPANY_VERTICAL_60X90',
      versionNumber: 2,
      checksumSha256: 'a1b2c3d4e5f67890',
      layout: {
        schemaVersion: '1.0.0',
        dimensions: {
          widthMm: 60,
          heightMm: 90,
          bleedMm: 3,
          safeAreaMm: 3,
          orientation: 'VERTICAL',
        },
        front: {
          header: {
            showLogo: true,
            customTitle: 'London Boy Apparel Ltd.',
            titleBangla: 'লন্ডন বয় অ্যাপারেল লি.',
          },
          photo: {
            widthMm: 24,
            heightMm: 32,
            position: 'TOP_CENTER',
            hasBorder: true,
          },
          bodyFields: [
            { fieldKey: 'displayNameLatin', label: 'Name', required: true },
            { fieldKey: 'employeeNumber', label: 'ID No', required: true },
            { fieldKey: 'jobTitle', label: 'Designation', required: true },
            { fieldKey: 'department', label: 'Department', required: false },
          ],
          barcode: {
            type: 'CODE128',
            payloadType: 'EMPLOYEE_NUMBER',
            position: 'BOTTOM_CENTER',
          },
        },
        back: {
          header: {
            showLogo: true,
            customTitle: 'লন্ডন বয় অ্যাপারেল লি.',
          },
          bodyFields: [
            { fieldKey: 'displayNameNative', label: 'নাম', required: true },
            { fieldKey: 'emergencyContact', label: 'জরুরী যোগাযোগ', required: false },
            { fieldKey: 'bloodGroup', label: 'রক্তের গ্রুপ', required: false },
            { fieldKey: 'joinDate', label: 'যোগদানের তারিখ', required: false },
          ],
          showInstructions: true,
          showSignatureBox: true,
        },
        theme: {
          primaryColor: '#134E4A',
          secondaryColor: '#0F766E',
          accentColor: '#14B8A6',
          backgroundColor: '#FFFFFF',
          textColor: '#0F172A',
        },
        localeConfig: {
          defaultLocale: 'bn-BD',
          fallbackPolicy: 'LATIN_FALLBACK',
          showBilingualLabels: true,
        },
      },
    },
    system: {
      status: 'ok',
      database: { status: 'ok', latencyMs: 2 },
      storage: { status: 'ok', writable: true },
      renderer: { status: 'ok', poolReady: true },
      backupState: 'ok',
      lastVerifiedBackup: new Date().toISOString(),
      backupWarning: false,
    },
  };

  test.beforeEach(async ({ page }) => {
    page.on('console', (msg) => {
      if (msg.type() === 'error') console.log(`BROWSER ERROR: ${msg.text()}`);
    });
    page.on('pageerror', (err) => {
      console.log(`PAGE ERROR: ${err.message}`);
    });

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
            permissions: ['people.view', 'cards.issue', 'cards.print', 'system.manage', 'audit.view'],
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

    await page.route('**/api/cards/print-jobs*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [],
          totalCount: 0,
        }),
      });
    });

    await page.route('**/api/dashboard/overview**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockOverview),
      });
    });
  });

  test('captures full dashboard screenshots across 1440px, 1280px, 768px, and 360px', async ({ page }) => {
    // 1440px Wide Desktop
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/dashboard');
    await page.waitForSelector('text=Tanvir Ahmed');
    await page.waitForSelector('text=142');
    await page.screenshot({ path: path.join(artifactDir, 'dashboard_1440px_desktop.png'), fullPage: true });

    // 1280px Standard Desktop
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/dashboard');
    await page.waitForSelector('text=Tanvir Ahmed');
    await page.waitForSelector('text=142');
    await page.screenshot({ path: path.join(artifactDir, 'dashboard_1280px_standard.png'), fullPage: true });

    // 768px Tablet
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/dashboard');
    await page.waitForSelector('text=Tanvir Ahmed');
    await page.waitForSelector('text=142');
    await page.screenshot({ path: path.join(artifactDir, 'dashboard_768px_tablet.png'), fullPage: true });

    // 360px Mobile
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto('/dashboard');
    await page.waitForSelector('text=Tanvir Ahmed');
    await page.waitForSelector('text=142');
    await page.screenshot({ path: path.join(artifactDir, 'dashboard_360px_mobile.png'), fullPage: true });
  });

  test('captures dashboard error and recovery state', async ({ page }) => {
    await page.route('**/api/dashboard/overview**', async (route) => {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Database connection temporarily degraded' }),
      });
    });

    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/dashboard');
    await page.waitForSelector('text=Retry Connection');
    await page.screenshot({ path: path.join(artifactDir, 'dashboard_error_state.png'), fullPage: true });
  });
});
