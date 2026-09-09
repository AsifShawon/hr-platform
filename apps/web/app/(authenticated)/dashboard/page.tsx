'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { MetricStripBento } from '../../components/dashboard/MetricStripBento';
import { CreateIdBentoPanel } from '../../components/dashboard/CreateIdBentoPanel';
import { TemplatePreviewBentoPanel } from '../../components/dashboard/TemplatePreviewBentoPanel';
import { RecentWorkersBentoPanel } from '../../components/dashboard/RecentWorkersBentoPanel';
import { PrintQueueBentoPanel } from '../../components/dashboard/PrintQueueBentoPanel';
import { ReadinessAttentionPanel } from '../../components/dashboard/ReadinessAttentionPanel';
import { SystemHealthBentoPanel } from '../../components/dashboard/SystemHealthBentoPanel';
import { useActiveOrg } from '../../context/ActiveOrgContext';
import { AlertCircle, RefreshCw, Building2, ShieldCheck, Camera } from 'lucide-react';
import { Button } from '@hr/ui';
import { DashboardOverviewResponseDTO } from '@hr/schemas';

export default function DashboardPage() {
  const { activeOrgId, activeOrg } = useActiveOrg();
  const [data, setData] = useState<DashboardOverviewResponseDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const url = activeOrgId
        ? `/api/dashboard/overview?organizationId=${encodeURIComponent(activeOrgId)}`
        : '/api/dashboard/overview';

      const headers: Record<string, string> = {};
      if (activeOrgId) {
        headers['X-Organization-Id'] = activeOrgId;
      }

      const res = await fetch(url, { headers });
      if (!res.ok) {
        throw new Error(`Failed to load operational dashboard (${res.status})`);
      }
      const json: DashboardOverviewResponseDTO = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || 'Error connecting to dashboard service.');
    } finally {
      setIsLoading(false);
    }
  }, [activeOrgId]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  // Adapt recent workers for Bento Panel
  const adaptedWorkers = (data?.recentWorkers || []).map((w) => ({
    personId: w.personId,
    employmentId: w.employmentId,
    employeeNumber: w.employeeNumber,
    displayName: w.displayName,
    displayNameLatin: w.displayNameLatin,
    displayNameNative: w.displayNameNative,
    jobTitle: w.jobTitle || 'Worker',
    status: w.employmentStatus,
    orgUnitName: w.unitName || null,
    orgUnitNameBangla: w.unitNameBangla || null,
    locationName: w.locationName || null,
    hasPhoto: w.hasPhoto,
    photoUrl: w.safePhotoUrl,
    isReadyToPrint: w.isReadyForCard,
    blockersCount: w.readinessBlockersCount,
  }));

  // Adapt template for Bento Panel
  const adaptedTemplate = data?.activeTemplate
    ? {
        id: data.activeTemplate.id,
        name: data.activeTemplate.name,
        presetId: data.activeTemplate.format || 'COMPANY_VERTICAL_60X90',
        versionNumber: data.activeTemplate.versionNumber,
        checksumSha256: data.activeTemplate.checksumSha256 || '',
        layout: data.activeTemplate.layout,
        resolutionReason: data.activeTemplate.resolutionReason,
      }
    : null;

  // Adapt system health for Bento Panel
  const adaptedHealth = data?.system
    ? {
        status: data.system.status as any,
        database: {
          status: data.system.database.status,
          latencyMs: data.system.database.latencyMs,
        },
        storage: {
          status: data.system.storage.status,
          writable: data.system.storage.writable,
        },
        renderer: {
          status: data.system.renderer.status,
          poolReady: data.system.renderer.poolReady ?? true,
        },
        backups: {
          status: data.system.backupState,
          lastBackupAt: data.system.lastVerifiedBackup,
          daysSinceLastBackup: null,
          hasWarning: data.system.backupWarning,
        },
      }
    : null;

  const scopeName =
    data?.scope?.organizationName ||
    activeOrg?.displayName ||
    activeOrg?.name ||
    'Selected Facility';

  return (
    <div className="space-y-6 max-w-full overflow-x-clip pb-6">
      {/* 1. Page Context Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:px-5 shadow-2xs">
        <div className="space-y-0.5 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Overview
            </h1>
            <span className="inline-flex items-center gap-1 text-xs font-mono font-semibold px-2 py-0.5 rounded-md bg-teal-50 text-teal-900 border border-teal-200/80">
              <Building2 className="w-3.5 h-3.5 text-teal-700" aria-hidden="true" />
              <span>{scopeName}</span>
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 truncate">
            ID card operations and physical issuance control for {scopeName}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
          {data?.generatedAt && (
            <span className="text-xs text-slate-400 hidden md:inline font-mono">
              Updated {new Date(data.generatedAt).toLocaleTimeString()}
            </span>
          )}

          <button
            type="button"
            onClick={fetchOverview}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-800 hover:text-teal-950 disabled:opacity-50 py-1.5 px-2.5 rounded-lg hover:bg-teal-50 transition-colors border border-transparent hover:border-teal-200"
            aria-label="Refresh operational metrics"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Error State Banner */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs sm:text-sm text-rose-900 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" aria-hidden="true" />
            <span className="truncate">{error}</span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={fetchOverview}
            className="text-xs border-rose-300 text-rose-900 hover:bg-rose-100 shrink-0 font-semibold"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
            <span>Retry Connection</span>
          </Button>
        </div>
      )}

      {/* 2. Metric Strip: 4 Authoritative Link Cards (2x2 on Mobile/Tablet, 4x1 Desktop) */}
      <MetricStripBento
        activeWorkersCount={data?.metrics?.activeWorkers || 0}
        readyCount={data?.metrics?.readyForCard || 0}
        attentionCount={data?.metrics?.needsAttention || 0}
        queueCount={data?.metrics?.queuedPrintJobs || 0}
        issuedTodayCount={data?.metrics?.issuedToday || 0}
        isLoading={isLoading}
      />

      {/* 3. Primary Work Row: 12-Column Grid (7 Cols Quick Create + 5 Cols Live Template Preview) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-stretch">
        <div className="lg:col-span-7 flex flex-col order-1">
          <CreateIdBentoPanel />
        </div>
        <div className="lg:col-span-5 flex flex-col order-2">
          <TemplatePreviewBentoPanel
            template={adaptedTemplate}
            orgName={data?.scope?.organizationName || undefined}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* 4. Operations Row: Recent Workers & Print Queue Activity (6 Cols + 6 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-stretch">
        <div className="lg:col-span-6 flex flex-col order-1">
          <RecentWorkersBentoPanel
            workers={adaptedWorkers}
            isLoading={isLoading}
          />
        </div>
        <div className="lg:col-span-6 flex flex-col order-2">
          <PrintQueueBentoPanel
            printQueue={data?.printQueue || null}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* 5. Quiet Utility Row: Worker Readiness Diagnostics & System Health (6 Cols + 6 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-stretch">
        <div className="lg:col-span-6 flex flex-col order-1">
          <ReadinessAttentionPanel
            readiness={data?.readiness || null}
            missingPhotoCount={data?.metrics?.missingPhotoCount || 0}
            isLoading={isLoading}
          />
        </div>
        <div className="lg:col-span-6 flex flex-col order-2">
          <SystemHealthBentoPanel
            health={adaptedHealth}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  );
}

