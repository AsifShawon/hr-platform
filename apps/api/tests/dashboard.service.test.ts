import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { prisma } from '@hr/db';
import {
  Permission,
  EmploymentStatus,
  PrintJobStatus,
  CardIssueStatus,
  TemplatePresetId,
  TemplateVersionStatus,
  TemplateAssignmentTarget,
} from '@hr/domain';
import { getDashboardOverview } from '../src/services/dashboard.service.js';
import { createClassicVerticalPreset } from '@hr/card-kit';

describe('Dashboard Service & Operational Overview Contract Tests', () => {
  let tenantId: string;
  let orgA: any;
  let orgB: any;

  beforeEach(async () => {
    const slug = `test-tenant-dashboard-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const tenant = await prisma.tenant.create({
      data: { slug, name: 'Dashboard Test Tenant' },
    });
    tenantId = tenant.id;

    // 1. Setup Two Organizations
    orgA = await prisma.organization.create({
      data: {
        tenantId,
        name: 'Alpha Garments Facility',
        displayName: 'Alpha Garments Ltd.',
        code: 'AGF',
        isDefault: true,
      },
    });

    orgB = await prisma.organization.create({
      data: {
        tenantId,
        name: 'Beta Spinning Mill',
        displayName: 'Beta Spinning Ltd.',
        code: 'BSM',
        isDefault: false,
      },
    });

    // 2. Seed Workers in Org A
    // Worker 1: Active with photo (Ready for card)
    const mediaA1 = await prisma.mediaAsset.create({
      data: {
        tenantId,
        storageKeyMaster: 'test/worker1.jpg',
        fileSizeBytes: 1000,
        mimeType: 'image/jpeg',
        width: 600,
        height: 900,
        checksumSha256: 'sha256-w1',
      },
    });

    const p1 = await prisma.person.create({
      data: {
        tenantId,
        givenName: 'Rahim',
        familyName: 'Uddin',
        displayName: 'Rahim Uddin',
        displayNameLatin: 'Rahim Uddin',
        photoMediaId: mediaA1.id,
      },
    });

    const emp1 = await prisma.employment.create({
      data: {
        tenantId,
        personId: p1.id,
        organizationId: orgA.id,
        employeeNumber: 'AGF-001',
        jobTitle: 'Senior Stitcher',
        joinDate: new Date('2024-01-15'),
        status: EmploymentStatus.ACTIVE,
      },
    });

    // Worker 2: Active without photo (Needs attention - MISSING_PHOTO)
    const p2 = await prisma.person.create({
      data: {
        tenantId,
        givenName: 'Karim',
        familyName: 'Hossain',
        displayName: 'Karim Hossain',
        displayNameLatin: 'Karim Hossain',
      },
    });

    await prisma.employment.create({
      data: {
        tenantId,
        personId: p2.id,
        organizationId: orgA.id,
        employeeNumber: 'AGF-002',
        jobTitle: 'Pattern Cutter',
        joinDate: new Date('2024-02-01'),
        status: EmploymentStatus.ACTIVE,
      },
    });

    // Worker 3: Inactive worker (Needs attention - EMPLOYMENT_INACTIVE)
    const p3 = await prisma.person.create({
      data: {
        tenantId,
        givenName: 'Salma',
        familyName: 'Akter',
        displayName: 'Salma Akter',
        displayNameLatin: 'Salma Akter',
      },
    });

    await prisma.employment.create({
      data: {
        tenantId,
        personId: p3.id,
        organizationId: orgA.id,
        employeeNumber: 'AGF-003',
        jobTitle: 'Quality Inspector',
        joinDate: new Date('2024-03-01'),
        status: EmploymentStatus.INACTIVE,
      },
    });

    // Worker in Org B: Active with photo
    const mediaB1 = await prisma.mediaAsset.create({
      data: {
        tenantId,
        storageKeyMaster: 'test/worker_b1.jpg',
        fileSizeBytes: 1000,
        mimeType: 'image/jpeg',
        width: 600,
        height: 900,
        checksumSha256: 'sha256-wb1',
      },
    });

    const pB1 = await prisma.person.create({
      data: {
        tenantId,
        givenName: 'Faruk',
        familyName: 'Ahmed',
        displayName: 'Faruk Ahmed',
        displayNameLatin: 'Faruk Ahmed',
        photoMediaId: mediaB1.id,
      },
    });

    await prisma.employment.create({
      data: {
        tenantId,
        personId: pB1.id,
        organizationId: orgB.id,
        employeeNumber: 'BSM-001',
        jobTitle: 'Machine Operator',
        joinDate: new Date('2024-01-10'),
        status: EmploymentStatus.ACTIVE,
      },
    });

    // 3. Seed Print Jobs (Aggregate test)
    await prisma.printJob.create({
      data: {
        tenantId,
        status: PrintJobStatus.QUEUED,
        outputFormat: 'INDIVIDUAL_PDF',
        side: 'DUPLEX',
        totalItems: 10,
        processedItems: 0,
        failedItems: 0,
        attempts: 0,
        maxAttempts: 3,
        operatorStatus: 'UNCONFIRMED',
      },
    });

    await prisma.printJob.create({
      data: {
        tenantId,
        status: PrintJobStatus.PROCESSING,
        outputFormat: 'HIGH_RES_PNG',
        side: 'DUPLEX',
        totalItems: 5,
        processedItems: 2,
        failedItems: 0,
        attempts: 1,
        maxAttempts: 3,
        operatorStatus: 'UNCONFIRMED',
      },
    });

    // 4. Seed Template for Org A
    const layout = createClassicVerticalPreset();
    const tA = await prisma.cardTemplate.create({
      data: {
        tenantId,
        name: 'Alpha Vertical 60x90',
        presetId: TemplatePresetId.CLASSIC_VERTICAL,
        organizationId: orgA.id,
        isArchived: false,
      },
    });

    const vA = await prisma.templateVersion.create({
      data: {
        tenantId,
        templateId: tA.id,
        versionNumber: 1,
        status: TemplateVersionStatus.PUBLISHED,
        layout: layout as any,
        checksumSha256: 'sha256-tpl-a',
      },
    });

    await prisma.templateAssignment.create({
      data: {
        tenantId,
        templateId: tA.id,
        targetType: TemplateAssignmentTarget.ORGANIZATION,
        targetId: orgA.id,
        priority: 1,
      },
    });

    // 5. Seed Card Issue (Issued today)
    await prisma.cardIssue.create({
      data: {
        tenantId,
        personId: p1.id,
        employmentId: emp1.id,
        templateVersionId: vA.id,
        cardSerial: 'CRD-AGF-0001',
        status: CardIssueStatus.ISSUED,
        issueReason: 'INITIAL',
        isCurrent: true,
        issuedAt: new Date(),
        printedSnapshot: {},
        layoutSnapshot: {},
        templateChecksum: 'sha256-tpl-a',
      },
    });
  });

  afterEach(async () => {
    // Cleanup tenant data
    await prisma.templateAssignment.deleteMany({ where: { tenantId } });
    await prisma.templateVersion.deleteMany({ where: { tenantId } });
    await prisma.cardTemplate.deleteMany({ where: { tenantId } });
    await prisma.cardIssue.deleteMany({ where: { tenantId } });
    await prisma.printJob.deleteMany({ where: { tenantId } });
    await prisma.employment.deleteMany({ where: { tenantId } });
    await prisma.person.deleteMany({ where: { tenantId } });
    await prisma.mediaAsset.deleteMany({ where: { tenantId } });
    await prisma.organization.deleteMany({ where: { tenantId } });
  });

  it('1. Strictly isolates metrics and workers between Organization A and Organization B', async () => {
    // Overview for Org A
    const overviewA = await getDashboardOverview({
      tenantId,
      organizationId: orgA.id,
      userPermissions: [Permission.PEOPLE_VIEW, Permission.CARDS_PRINT],
    });

    expect(overviewA.scope.organizationId).toBe(orgA.id);
    expect(overviewA.scope.organizationName).toBe('Alpha Garments Ltd.');
    expect(overviewA.metrics.activeWorkers).toBe(2); // Rahim (Active+photo) & Karim (Active, no photo)
    expect(overviewA.metrics.readyForCard).toBe(1); // Only Rahim
    expect(overviewA.metrics.needsAttention).toBe(2); // Karim (Missing Photo) + Salma (Inactive)
    expect(overviewA.metrics.missingPhotoCount).toBe(1);
    expect(overviewA.metrics.totalActiveBadges).toBe(1); // Rahim's badge
    expect(overviewA.recentWorkers).toHaveLength(3);
    expect(overviewA.activeTemplate?.name).toBe('Alpha Vertical 60x90');

    // Overview for Org B
    const overviewB = await getDashboardOverview({
      tenantId,
      organizationId: orgB.id,
      userPermissions: [Permission.PEOPLE_VIEW],
    });

    expect(overviewB.scope.organizationId).toBe(orgB.id);
    expect(overviewB.scope.organizationName).toBe('Beta Spinning Ltd.');
    expect(overviewB.metrics.activeWorkers).toBe(1); // Faruk
    expect(overviewB.metrics.readyForCard).toBe(1);
    expect(overviewB.metrics.needsAttention).toBe(0);
    expect(overviewB.metrics.missingPhotoCount).toBe(0);
    expect(overviewB.metrics.totalActiveBadges).toBe(0); // Org B has no issued badges
    expect(overviewB.recentWorkers).toHaveLength(1);
    expect(overviewB.recentWorkers[0]?.employeeNumber).toBe('BSM-001');
  });

  it('2. Supports ALL organizations mode aggregating across entire tenant', async () => {
    const overviewAll = await getDashboardOverview({
      tenantId,
      organizationId: 'ALL',
      userPermissions: [Permission.PEOPLE_VIEW],
    });

    expect(overviewAll.scope.mode).toBe('ALL');
    expect(overviewAll.scope.organizationId).toBeNull();
    expect(overviewAll.scope.organizationName).toBe('All Organizations');
    expect(overviewAll.metrics.activeWorkers).toBe(3); // 2 in A + 1 in B
    expect(overviewAll.metrics.readyForCard).toBe(2);
    expect(overviewAll.metrics.totalActiveBadges).toBe(1);
    expect(overviewAll.recentWorkers).toHaveLength(4);
  });

  it('3. Computes exact readiness-reason breakdown and action links', async () => {
    const overview = await getDashboardOverview({
      tenantId,
      organizationId: orgA.id,
      userPermissions: [Permission.PEOPLE_VIEW],
    });

    const missingPhoto = overview.readiness.reasons.find((r) => r.code === 'MISSING_PHOTO');
    expect(missingPhoto).toBeDefined();
    expect(missingPhoto?.count).toBe(1);
    expect(missingPhoto?.severity).toBe('WARNING');
    expect(missingPhoto?.actionHref).toBe('/people?filter=missing-photo');

    const inactive = overview.readiness.reasons.find((r) => r.code === 'EMPLOYMENT_INACTIVE');
    expect(inactive).toBeDefined();
    expect(inactive?.count).toBe(1);
    expect(inactive?.severity).toBe('BLOCKER');
    expect(inactive?.actionHref).toBe('/people?filter=inactive');
  });

  it('4. Correctly calculates aggregate queue totals beyond recent jobs limit', async () => {
    const overview = await getDashboardOverview({
      tenantId,
      organizationId: orgA.id,
      userPermissions: [Permission.PEOPLE_VIEW],
    });

    expect(overview.printQueue.totalsByStatus.queued).toBe(1);
    expect(overview.printQueue.totalsByStatus.processing).toBe(1);
    expect(overview.printQueue.totalActiveQueue).toBe(2);
    expect(overview.metrics.queuedPrintJobs).toBe(2);
    expect(overview.printQueue.recentJobs).toHaveLength(2);
  });

  it('5. Redacts system health for users without system.manage permission', async () => {
    // Standard HR Operator without system.manage
    const overviewStandard = await getDashboardOverview({
      tenantId,
      organizationId: orgA.id,
      userPermissions: [Permission.PEOPLE_VIEW],
    });

    expect(overviewStandard.system).toBeNull();

    // System Admin with system.manage
    const overviewAdmin = await getDashboardOverview({
      tenantId,
      organizationId: orgA.id,
      userPermissions: [Permission.PEOPLE_VIEW, Permission.SYSTEM_MANAGE],
    });

    expect(overviewAdmin.system).not.toBeNull();
    expect(overviewAdmin.system?.status).toBeDefined();
    expect(overviewAdmin.system?.database.status).toBe('ok');
    expect(overviewAdmin.system?.backupState).toBeDefined();
  });

  it('6. Rejects non-existent organization with a typed error', async () => {
    await expect(
      getDashboardOverview({
        tenantId,
        organizationId: 'non-existent-org-999',
        userPermissions: [Permission.PEOPLE_VIEW],
      }),
    ).rejects.toThrow('ORGANIZATION_NOT_FOUND');
  });
});
