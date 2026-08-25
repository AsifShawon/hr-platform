'use client';

import React, { useState, useEffect } from 'react';
import { MetricStripBento } from '../../components/dashboard/MetricStripBento';
import { CreateIdBentoPanel } from '../../components/dashboard/CreateIdBentoPanel';
import { TemplatePreviewBentoPanel } from '../../components/dashboard/TemplatePreviewBentoPanel';
import { RecentWorkersBentoPanel } from '../../components/dashboard/RecentWorkersBentoPanel';
import { PrintQueueBentoPanel } from '../../components/dashboard/PrintQueueBentoPanel';
import { PhotoStudioQuickBentoPanel } from '../../components/dashboard/PhotoStudioQuickBentoPanel';
import { SystemHealthBentoPanel } from '../../components/dashboard/SystemHealthBentoPanel';

interface CardOperationsStats {
  readyToPrintCount: number;
  needsAttentionCount: number;
  queuedJobsCount: number;
  totalActiveBadgesCount: number;
  totalRevokedCount: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<CardOperationsStats>({
    readyToPrintCount: 0,
    needsAttentionCount: 0,
    queuedJobsCount: 0,
    totalActiveBadgesCount: 0,
    totalRevokedCount: 0,
  });
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const res = await fetch('/api/cards/stats');
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch {
        // Fallback default
      } finally {
        setIsLoadingStats(false);
      }
    }
    loadStats();
  }, []);

  return (
    <div className="space-y-6 max-w-full overflow-x-clip">
      {/* 1. Metric Strip: 4 Interactive Link Cards */}
      <MetricStripBento
        readyCount={stats.readyToPrintCount}
        attentionCount={stats.needsAttentionCount}
        queueCount={stats.queuedJobsCount}
        activeCount={stats.totalActiveBadgesCount}
        isLoading={isLoadingStats}
      />

      {/* 2. Primary Bento Grid: 12-Column Responsive Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
        {/* Row 1: Dominant Create ID (7 cols) + Active Template (5 cols) */}
        <div className="lg:col-span-7 flex flex-col">
          <CreateIdBentoPanel />
        </div>
        <div className="lg:col-span-5 flex flex-col">
          <TemplatePreviewBentoPanel />
        </div>

        {/* Row 2: Recent Workers (6 cols) + Print Queue Activity (6 cols) */}
        <div className="lg:col-span-6 flex flex-col">
          <RecentWorkersBentoPanel />
        </div>
        <div className="lg:col-span-6 flex flex-col">
          <PrintQueueBentoPanel />
        </div>

        {/* Row 3: Photo Studio Quick Access (6 cols) + Local Node Health (6 cols) */}
        <div className="lg:col-span-6 flex flex-col">
          <PhotoStudioQuickBentoPanel missingPhotoCount={stats.needsAttentionCount} />
        </div>
        <div className="lg:col-span-6 flex flex-col">
          <SystemHealthBentoPanel />
        </div>
      </div>
    </div>
  );
}
