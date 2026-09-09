'use client';

import React from 'react';
import Link from 'next/link';
import { Layers, AlertCircle, CheckCircle2, Clock, ArrowRight } from 'lucide-react';
import { Button } from '@hr/ui';
import { DashboardPrintQueueSummaryDTO } from '@hr/schemas';

interface PrintQueueBentoPanelProps {
  printQueue?: DashboardPrintQueueSummaryDTO | null;
  isLoading?: boolean;
}

export function PrintQueueBentoPanel({
  printQueue,
  isLoading = false,
}: PrintQueueBentoPanelProps) {
  const recentJobs = printQueue?.recentJobs || [];
  const totals = printQueue?.totalsByStatus;

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex flex-col justify-between space-y-4 h-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 rounded-xl bg-teal-50 text-teal-800 border border-teal-200/60 shrink-0">
            <Layers className="w-4 h-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate">Print Queue Activity</h3>
            <span className="text-xs text-slate-500 font-mono block truncate">
              {totals
                ? `${totals.queued + totals.processing} Active • ${totals.completed} Completed`
                : 'Batch print jobs & hardware output'}
            </span>
          </div>
        </div>

        <Link
          href="/cards/queue"
          className="text-xs font-semibold text-teal-800 hover:text-teal-950 hover:underline flex items-center gap-1 shrink-0"
        >
          <span>Open Queue</span>
          <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
        </Link>
      </div>

      {/* Jobs List */}
      <div className="space-y-2.5 flex-1">
        {isLoading ? (
          <div className="py-8 text-center text-xs text-slate-500">Loading print queue...</div>
        ) : recentJobs.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            Queue is empty. Select registered workers to create single or batch cards.
          </div>
        ) : (
          recentJobs.slice(0, 4).map((job) => {
            const isDefect = job.operatorStatus === 'REJECTED_DEFECT';
            const isProcessing = job.status === 'PROCESSING' || job.status === 'QUEUED';

            return (
              <div
                key={job.id}
                className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                  isDefect
                    ? 'bg-rose-50/60 border-rose-200'
                    : isProcessing
                      ? 'bg-teal-50/50 border-teal-200'
                      : 'bg-slate-50 border-slate-200/80'
                }`}
              >
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-bold font-mono text-slate-900">
                      Batch #{job.id.slice(-6).toUpperCase()}
                    </span>
                    <span className="text-xs text-slate-500 font-medium hidden sm:inline">
                      ({job.totalItems || 1} cards • {job.outputFormat || 'SINGLE_60X90'})
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-1.5 font-mono">
                    <Clock className="w-3 h-3 text-slate-400" aria-hidden="true" />
                    <span>{new Date(job.createdAt).toLocaleTimeString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {isDefect ? (
                    <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" aria-hidden="true" />
                      <span>Defect</span>
                    </span>
                  ) : isProcessing ? (
                    <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-teal-100 text-teal-800 border border-teal-300">
                      Queued
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-700" aria-hidden="true" />
                      <span>Printed</span>
                    </span>
                  )}

                  <Link href={`/cards/queue?jobId=${job.id}`}>
                    <Button type="button" variant="outline" size="sm" className="text-xs font-semibold">
                      Inspect
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

