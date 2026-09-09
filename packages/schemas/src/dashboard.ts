import { z } from 'zod';
import {
  CardLayoutSpecification,
  CardOrientation,
  CardFormatPreset,
  PrintJobStatus,
  PrintOutputFormat,
  OperatorPrintStatus,
} from '@hr/domain';

// Dashboard Overview Contract Schemas

export const dashboardScopeSchema = z.object({
  mode: z.enum(['ORGANIZATION', 'ALL']),
  organizationId: z.string().nullable(),
  organizationName: z.string().nullable(),
  organizationCode: z.string().nullable().optional(),
});

export type DashboardScopeDTO = z.infer<typeof dashboardScopeSchema>;

export const dashboardPrimaryActionSchema = z.object({
  canCreateCard: z.boolean(),
  canRegisterWorker: z.boolean(),
  canManagePrintQueue: z.boolean(),
});

export type DashboardPrimaryActionDTO = z.infer<typeof dashboardPrimaryActionSchema>;

export const dashboardMetricsSchema = z.object({
  activeWorkers: z.number().int().min(0),
  readyForCard: z.number().int().min(0),
  needsAttention: z.number().int().min(0),
  missingPhotoCount: z.number().int().min(0),
  queuedPrintJobs: z.number().int().min(0),
  issuedToday: z.number().int().min(0),
  totalActiveBadges: z.number().int().min(0),
  totalRevokedBadges: z.number().int().min(0),
});

export type DashboardMetricsDTO = z.infer<typeof dashboardMetricsSchema>;

export const dashboardReadinessReasonSchema = z.object({
  code: z.string(),
  label: z.string(),
  count: z.number().int().min(0),
  severity: z.enum(['BLOCKER', 'WARNING']),
  actionHref: z.string(),
});

export type DashboardReadinessReasonDTO = z.infer<typeof dashboardReadinessReasonSchema>;

export const dashboardReadinessSummarySchema = z.object({
  totalChecked: z.number().int().min(0),
  readyCount: z.number().int().min(0),
  needsAttentionCount: z.number().int().min(0),
  reasons: z.array(dashboardReadinessReasonSchema),
});

export type DashboardReadinessSummaryDTO = z.infer<typeof dashboardReadinessSummarySchema>;

export const dashboardRecentWorkerSchema = z.object({
  personId: z.string(),
  employmentId: z.string(),
  employeeNumber: z.string(),
  displayName: z.string(),
  displayNameLatin: z.string().nullable().optional(),
  displayNameNative: z.string().nullable().optional(),
  safePhotoUrl: z.string().nullable(),
  hasPhoto: z.boolean(),
  organizationId: z.string(),
  organizationName: z.string().nullable().optional(),
  unitName: z.string().nullable().optional(),
  unitNameBangla: z.string().nullable().optional(),
  locationName: z.string().nullable().optional(),
  jobTitle: z.string().nullable().optional(),
  employmentStatus: z.string(),
  isReadyForCard: z.boolean(),
  readinessBlockersCount: z.number().int().min(0),
});

export type DashboardRecentWorkerDTO = z.infer<typeof dashboardRecentWorkerSchema>;

export const dashboardPrintQueueSummarySchema = z.object({
  totalsByStatus: z.object({
    queued: z.number().int().min(0),
    processing: z.number().int().min(0),
    completed: z.number().int().min(0),
    failed: z.number().int().min(0),
    cancelled: z.number().int().min(0),
  }),
  totalActiveQueue: z.number().int().min(0),
  defectAlertCount: z.number().int().min(0),
  recentJobs: z.array(
    z.object({
      id: z.string(),
      status: z.string(),
      outputFormat: z.string(),
      totalItems: z.number().int(),
      processedItems: z.number().int(),
      failedItems: z.number().int(),
      operatorStatus: z.string().nullable().optional(),
      createdAt: z.string(),
    }),
  ),
});

export type DashboardPrintQueueSummaryDTO = z.infer<typeof dashboardPrintQueueSummarySchema>;

export const dashboardActiveTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.string(),
  versionNumber: z.number().int(),
  organizationScope: z.string().nullable(),
  layout: z.custom<CardLayoutSpecification>(),
  format: z.string().optional(),
  checksumSha256: z.string().optional(),
  resolutionReason: z.string().optional(),
});

export type DashboardActiveTemplateDTO = z.infer<typeof dashboardActiveTemplateSchema>;

export const dashboardSystemHealthSchema = z.object({
  status: z.enum(['ok', 'degraded', 'error', 'maintenance', 'unknown']),
  api: z.enum(['ok', 'degraded', 'error', 'maintenance', 'unknown']),
  database: z.object({
    status: z.enum(['ok', 'degraded', 'error', 'maintenance', 'unknown']),
    latencyMs: z.number().optional(),
  }),
  storage: z.object({
    status: z.enum(['ok', 'degraded', 'error', 'maintenance', 'unknown']),
    writable: z.boolean(),
  }),
  renderer: z.object({
    status: z.enum(['ok', 'degraded', 'error', 'maintenance', 'unknown']),
    poolReady: z.boolean().optional(),
  }),
  lastVerifiedBackup: z.string().nullable(),
  backupState: z.enum(['healthy', 'degraded', 'unavailable', 'unknown']),
  backupWarning: z.boolean(),
});

export type DashboardSystemHealthDTO = z.infer<typeof dashboardSystemHealthSchema>;

export const dashboardOverviewResponseSchema = z.object({
  scope: dashboardScopeSchema,
  primaryAction: dashboardPrimaryActionSchema,
  metrics: dashboardMetricsSchema,
  readiness: dashboardReadinessSummarySchema,
  recentWorkers: z.array(dashboardRecentWorkerSchema),
  printQueue: dashboardPrintQueueSummarySchema,
  activeTemplate: dashboardActiveTemplateSchema.nullable(),
  system: dashboardSystemHealthSchema.nullable(),
  generatedAt: z.string().datetime(),
});

export type DashboardOverviewResponseDTO = z.infer<typeof dashboardOverviewResponseSchema>;
