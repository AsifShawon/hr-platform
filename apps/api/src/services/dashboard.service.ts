import { prisma } from '@hr/db';
import {
  Permission,
  PrintJobStatus,
  CardIssueStatus,
  TemplateVersionStatus,
  TemplateAssignmentTarget,
  CardLayoutSpecification,
  CardReadinessIssue,
  EmploymentStatus,
} from '@hr/domain';
import {
  DashboardOverviewResponseDTO,
  DashboardScopeDTO,
  DashboardPrimaryActionDTO,
  DashboardMetricsDTO,
  DashboardReadinessSummaryDTO,
  DashboardReadinessReasonDTO,
  DashboardRecentWorkerDTO,
  DashboardPrintQueueSummaryDTO,
  DashboardActiveTemplateDTO,
  DashboardSystemHealthDTO,
} from '@hr/schemas';
import { DiagnosticsService } from './diagnostics.service.js';

export interface GetDashboardOverviewOptions {
  tenantId: string;
  organizationId?: string | null;
  userPermissions: string[];
}

/**
 * Single, coherent, permission-aware operational truth service for Dashboard Overview.
 * Avoids client-side derivations, eliminates waterfalls, and strictly scopes to tenant & org.
 */
export async function getDashboardOverview(
  options: GetDashboardOverviewOptions,
): Promise<DashboardOverviewResponseDTO> {
  const { tenantId, organizationId: requestedOrgId, userPermissions } = options;
  const generatedAt = new Date().toISOString();

  // 1. Resolve Organization Scope
  let resolvedOrg = null;
  let mode: 'ORGANIZATION' | 'ALL' = 'ORGANIZATION';

  if (requestedOrgId && requestedOrgId !== 'ALL') {
    resolvedOrg = await prisma.organization.findFirst({
      where: { id: requestedOrgId, tenantId },
      select: {
        id: true,
        name: true,
        displayName: true,
        code: true,
      },
    });

    if (!resolvedOrg) {
      throw new Error('ORGANIZATION_NOT_FOUND');
    }
  } else if (requestedOrgId === 'ALL') {
    mode = 'ALL';
  } else {
    // Default organization resolution
    resolvedOrg = await prisma.organization.findFirst({
      where: { tenantId },
      orderBy: { isDefault: 'desc' },
      select: {
        id: true,
        name: true,
        displayName: true,
        code: true,
      },
    });
  }

  const orgScopeId = mode === 'ALL' ? null : resolvedOrg?.id || null;
  const scope: DashboardScopeDTO = {
    mode,
    organizationId: orgScopeId,
    organizationName: mode === 'ALL' ? 'All Organizations' : resolvedOrg ? resolvedOrg.displayName || resolvedOrg.name : null,
    organizationCode: resolvedOrg?.code || null,
  };

  // 2. Primary Action Permissions
  const canCreateCard =
    userPermissions.includes(Permission.CARDS_ISSUE) ||
    userPermissions.includes(Permission.CARDS_PRINT) ||
    userPermissions.includes(Permission.SYSTEM_MANAGE);

  const canRegisterWorker =
    userPermissions.includes(Permission.PEOPLE_EDIT) ||
    userPermissions.includes(Permission.SYSTEM_MANAGE);

  const canManagePrintQueue =
    userPermissions.includes(Permission.CARDS_PRINT) ||
    userPermissions.includes(Permission.SYSTEM_MANAGE);

  const primaryAction: DashboardPrimaryActionDTO = {
    canCreateCard,
    canRegisterWorker,
    canManagePrintQueue,
  };

  // 3. Compute Start of Local Operational Day (UTC midnight for standard determinism)
  const now = new Date();
  const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));

  // 4. Scoped Aggregations & Query Filters
  const employmentOrgFilter = orgScopeId ? { organizationId: orgScopeId } : {};
  const cardIssueOrgFilter = orgScopeId ? { employment: { organizationId: orgScopeId } } : {};

  const [
    activeWorkersCount,
    totalEmploymentsCount,
    employmentsWithPhotoCount,
    separatedCount,
    inactiveCount,
    preboardingCount,
    queuedJobsCount,
    processingJobsCount,
    completedJobsCount,
    failedJobsCount,
    cancelledJobsCount,
    defectJobsCount,
    issuedTodayCount,
    totalActiveBadgesCount,
    totalRevokedBadgesCount,
  ] = await Promise.all([
    // Active workers
    prisma.employment.count({
      where: {
        tenantId,
        ...employmentOrgFilter,
        status: EmploymentStatus.ACTIVE,
      },
    }),
    // Total employments in scope
    prisma.employment.count({
      where: {
        tenantId,
        ...employmentOrgFilter,
      },
    }),
    // Employments with approved photo
    prisma.employment.count({
      where: {
        tenantId,
        ...employmentOrgFilter,
        status: { in: [EmploymentStatus.ACTIVE, EmploymentStatus.PREBOARDING] },
        person: {
          photoMediaId: { not: null },
        },
      },
    }),
    // Separated workers
    prisma.employment.count({
      where: {
        tenantId,
        ...employmentOrgFilter,
        status: EmploymentStatus.SEPARATED,
      },
    }),
    // Inactive workers
    prisma.employment.count({
      where: {
        tenantId,
        ...employmentOrgFilter,
        status: EmploymentStatus.INACTIVE,
      },
    }),
    // Preboarding workers
    prisma.employment.count({
      where: {
        tenantId,
        ...employmentOrgFilter,
        status: EmploymentStatus.PREBOARDING,
      },
    }),
    // Print Job Queue counts (Global tenant queue, or jobs associated with tenant)
    prisma.printJob.count({
      where: { tenantId, status: PrintJobStatus.QUEUED },
    }),
    prisma.printJob.count({
      where: { tenantId, status: PrintJobStatus.PROCESSING },
    }),
    prisma.printJob.count({
      where: { tenantId, status: PrintJobStatus.COMPLETED },
    }),
    prisma.printJob.count({
      where: { tenantId, status: PrintJobStatus.FAILED },
    }),
    prisma.printJob.count({
      where: { tenantId, status: PrintJobStatus.CANCELLED },
    }),
    prisma.printJob.count({
      where: { tenantId, operatorStatus: 'REJECTED_DEFECT' },
    }),
    // Issued today in business timezone boundary
    prisma.cardIssue.count({
      where: {
        tenantId,
        ...cardIssueOrgFilter,
        status: CardIssueStatus.ISSUED,
        issuedAt: { gte: startOfDay },
      },
    }),
    // Total active badges
    prisma.cardIssue.count({
      where: {
        tenantId,
        ...cardIssueOrgFilter,
        status: CardIssueStatus.ISSUED,
        isCurrent: true,
      },
    }),
    // Total revoked badges
    prisma.cardIssue.count({
      where: {
        tenantId,
        ...cardIssueOrgFilter,
        status: CardIssueStatus.REVOKED,
      },
    }),
  ]);

  // Missing photos among active/preboarding workers
  const activeOrPreboarding = activeWorkersCount + preboardingCount;
  const missingPhotoCount = Math.max(0, activeOrPreboarding - employmentsWithPhotoCount);

  // Ready for card: active workers who have approved photo and no blockers
  const readyForCard = Math.min(activeWorkersCount, employmentsWithPhotoCount);

  // Specific canonical readiness reasons
  const readinessReasons: DashboardReadinessReasonDTO[] = [];

  if (missingPhotoCount > 0) {
    readinessReasons.push({
      code: 'MISSING_PHOTO',
      label: 'Missing Employee Photo',
      count: missingPhotoCount,
      severity: 'WARNING',
      actionHref: '/people?filter=missing-photo',
    });
  }

  if (preboardingCount > 0) {
    readinessReasons.push({
      code: 'EMPLOYMENT_PREBOARDING',
      label: 'Preboarding Verification Pending',
      count: preboardingCount,
      severity: 'WARNING',
      actionHref: '/people?filter=preboarding',
    });
  }

  if (inactiveCount > 0) {
    readinessReasons.push({
      code: 'EMPLOYMENT_INACTIVE',
      label: 'Inactive Employment Status',
      count: inactiveCount,
      severity: 'BLOCKER',
      actionHref: '/people?filter=inactive',
    });
  }

  if (separatedCount > 0) {
    readinessReasons.push({
      code: 'EMPLOYMENT_SEPARATED',
      label: 'Separated Employment Status',
      count: separatedCount,
      severity: 'BLOCKER',
      actionHref: '/people?filter=separated',
    });
  }

  const needsAttention = missingPhotoCount + preboardingCount + inactiveCount + separatedCount;

  const readiness: DashboardReadinessSummaryDTO = {
    totalChecked: totalEmploymentsCount,
    readyCount: readyForCard,
    needsAttentionCount: needsAttention,
    reasons: readinessReasons,
  };

  const metrics: DashboardMetricsDTO = {
    activeWorkers: activeWorkersCount,
    readyForCard,
    needsAttention,
    missingPhotoCount,
    queuedPrintJobs: queuedJobsCount + processingJobsCount,
    issuedToday: issuedTodayCount,
    totalActiveBadges: totalActiveBadgesCount,
    totalRevokedBadges: totalRevokedBadgesCount,
  };

  // 5. Query Recent Workers (Bounded 5 items, zero unneeded PII)
  const recentEmployments = await prisma.employment.findMany({
    where: {
      tenantId,
      ...employmentOrgFilter,
    },
    include: {
      person: {
        select: {
          id: true,
          displayName: true,
          displayNameLatin: true,
          displayNameNative: true,
          photoMediaId: true,
        },
      },
      organization: {
        select: { id: true, name: true, displayName: true },
      },
      orgUnit: {
        select: { id: true, name: true, nameBangla: true },
      },
      location: {
        select: { id: true, name: true },
      },
    },
    orderBy: { updatedAt: 'desc' },
    take: 5,
  });

  const recentWorkers: DashboardRecentWorkerDTO[] = recentEmployments.map((emp) => {
    const hasPhoto = Boolean(emp.person.photoMediaId);
    const isReady = hasPhoto && emp.status === EmploymentStatus.ACTIVE;
    const blockers = isReady ? 0 : !hasPhoto ? 1 : 0;

    return {
      personId: emp.person.id,
      employmentId: emp.id,
      employeeNumber: emp.employeeNumber,
      displayName: emp.person.displayName,
      displayNameLatin: emp.person.displayNameLatin,
      displayNameNative: emp.person.displayNameNative,
      safePhotoUrl: hasPhoto ? `/api/people/${emp.person.id}/photo?t=thumb` : null,
      hasPhoto,
      organizationId: emp.organizationId,
      organizationName: emp.organization?.displayName || emp.organization?.name || null,
      unitName: emp.orgUnit?.name || null,
      unitNameBangla: emp.orgUnit?.nameBangla || null,
      locationName: emp.location?.name || null,
      jobTitle: emp.jobTitle || null,
      employmentStatus: emp.status,
      isReadyForCard: isReady,
      readinessBlockersCount: blockers,
    };
  });

  // 6. Query Print Queue Summary & Recent Jobs (Aggregate counts + bounded list)
  const recentJobsList = await prisma.printJob.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
    take: 4,
    select: {
      id: true,
      status: true,
      outputFormat: true,
      totalItems: true,
      processedItems: true,
      failedItems: true,
      operatorStatus: true,
      createdAt: true,
    },
  });

  const printQueue: DashboardPrintQueueSummaryDTO = {
    totalsByStatus: {
      queued: queuedJobsCount,
      processing: processingJobsCount,
      completed: completedJobsCount,
      failed: failedJobsCount,
      cancelled: cancelledJobsCount,
    },
    totalActiveQueue: queuedJobsCount + processingJobsCount,
    defectAlertCount: defectJobsCount,
    recentJobs: recentJobsList.map((j) => ({
      id: j.id,
      status: j.status,
      outputFormat: j.outputFormat,
      totalItems: j.totalItems,
      processedItems: j.processedItems,
      failedItems: j.failedItems,
      operatorStatus: j.operatorStatus || null,
      createdAt: j.createdAt.toISOString(),
    })),
  };

  // 7. Query Active Card Template (Explicit organization scope or system default)
  let activeTemplate: DashboardActiveTemplateDTO | null = null;

  if (orgScopeId) {
    const orgAssignment = await prisma.templateAssignment.findFirst({
      where: {
        tenantId,
        targetType: TemplateAssignmentTarget.ORGANIZATION,
        targetId: orgScopeId,
      },
      include: {
        template: {
          include: {
            versions: {
              where: { status: TemplateVersionStatus.PUBLISHED },
              orderBy: { versionNumber: 'desc' },
              take: 1,
            },
          },
        },
      },
      orderBy: { priority: 'asc' },
    });

    if (orgAssignment?.template && orgAssignment.template.versions.length > 0) {
      const t = orgAssignment.template;
      const v = t.versions[0]!;
      activeTemplate = {
        id: t.id,
        name: t.name,
        status: v.status,
        versionNumber: v.versionNumber,
        organizationScope: orgScopeId,
        layout: v.layout as unknown as CardLayoutSpecification,
        format: t.presetId,
        checksumSha256: v.checksumSha256 || undefined,
        resolutionReason: `Assigned directly to ${resolvedOrg?.displayName || resolvedOrg?.name || 'Organization'}`,
      };
    }
  }

  // If no org-specific assignment, find system assignment or latest published
  if (!activeTemplate) {
    const publishedTemplate = await prisma.cardTemplate.findFirst({
      where: { tenantId, isArchived: false },
      include: {
        versions: {
          where: { status: TemplateVersionStatus.PUBLISHED },
          orderBy: { versionNumber: 'desc' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    if (publishedTemplate && publishedTemplate.versions.length > 0) {
      const v = publishedTemplate.versions[0]!;
      activeTemplate = {
        id: publishedTemplate.id,
        name: publishedTemplate.name,
        status: v.status,
        versionNumber: v.versionNumber,
        organizationScope: null,
        layout: v.layout as unknown as CardLayoutSpecification,
        format: publishedTemplate.presetId,
        checksumSha256: v.checksumSha256 || undefined,
        resolutionReason: 'Tenant default template',
      };
    }
  }

  // 8. Query System & Backup Health (Permission-aware: only if user has system.manage or audit.view)
  let system: DashboardSystemHealthDTO | null = null;
  const canViewSystem =
    userPermissions.includes(Permission.SYSTEM_MANAGE) ||
    userPermissions.includes(Permission.AUDIT_VIEW) ||
    userPermissions.includes(Permission.BACKUP_MANAGE);

  if (canViewSystem) {
    try {
      const diag = await DiagnosticsService.getSystemDiagnostics(tenantId);
      const backupComp = diag.components.backups;

      let backupState: 'healthy' | 'degraded' | 'unavailable' | 'unknown' = 'healthy';
      if (backupComp?.status === 'error') {
        backupState = 'unavailable';
      } else if (backupComp?.status === 'degraded' || backupComp?.isWarning) {
        backupState = 'degraded';
      } else if (!backupComp?.lastBackupAt) {
        backupState = 'unavailable';
      }

      system = {
        status: diag.status,
        api: 'ok',
        database: {
          status: diag.components.database.status,
          latencyMs: diag.components.database.latencyMs,
        },
        storage: {
          status: diag.components.storage.status,
          writable: diag.components.storage.writable ?? true,
        },
        renderer: {
          status: diag.components.renderer.status,
          poolReady: diag.components.renderer.poolReady,
        },
        lastVerifiedBackup: backupComp?.lastBackupAt || null,
        backupState,
        backupWarning: backupComp?.isWarning ?? true,
      };
    } catch {
      system = {
        status: 'degraded',
        api: 'ok',
        database: { status: 'unknown' },
        storage: { status: 'unknown', writable: false },
        renderer: { status: 'unknown' },
        lastVerifiedBackup: null,
        backupState: 'unavailable',
        backupWarning: true,
      };
    }
  }

  return {
    scope,
    primaryAction,
    metrics,
    readiness,
    recentWorkers,
    printQueue,
    activeTemplate,
    system,
    generatedAt,
  };
}
