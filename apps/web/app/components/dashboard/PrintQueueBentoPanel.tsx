'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Layers, AlertCircle, CheckCircle2, Clock, ArrowRight, Download } from 'lucide-react';
import { Badge, Button } from '@hr/ui';

interface PrintJobSummary {
  id: string;
  outputFormat: string;
  status: string;
  operatorStatus: string | null;
  itemsCount: number;
  createdAt: string;
}

export function PrintQueueBentoPanel() {
  const [jobs, setJobs] = useState<PrintJobSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadQueue() {
      try {
        const res = await fetch('/api/cards/print-jobs?limit=3');
        if (res.ok) {
          const data = await res.json();
          setJobs(data.items || []);
        }
      } catch {
        // Safe fallback
      } finally {
        setIsLoading(false);
      }
    }
    loadQueue();
  }, []);

  return (
    <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-teal-50 text-[#0F766E] border border-teal-200/60">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Print Queue Activity</h3>
            <span className="text-[11px] text-slate-500">
              Persistent batch jobs & physical verification
            </span>
          </div>
        </div>

        <Link
          href="/cards/queue"
          className="text-xs font-bold text-[#0F766E] hover:underline flex items-center gap-1"
        >
          <span>Open Queue</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Jobs List */}
      <div className="space-y-2.5">
        {isLoading ? (
          <div className="py-8 text-center text-xs text-slate-400">Loading print jobs...</div>
        ) : jobs.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            No active print jobs in queue. Select workers in the Registry to print.
          </div>
        ) : (
          jobs.map((job) => {
            const isDefect = job.operatorStatus === 'REJECTED_DEFECT';
            const isCompleted =
              job.status === 'COMPLETED' || job.operatorStatus === 'CONFIRMED_PRINTED';
            const isProcessing = job.status === 'PROCESSING' || job.status === 'QUEUED';

            return (
              <div
                key={job.id}
                className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                  isDefect
                    ? 'bg-rose-50/50 border-rose-200'
                    : isProcessing
                      ? 'bg-teal-50/40 border-teal-200'
                      : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold font-mono text-slate-900">
                      Batch #{job.id.slice(-6).toUpperCase()}
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">
                      ({job.itemsCount || 1} badges • {job.outputFormat || 'SINGLE_EXACT_60X90'})
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>{new Date(job.createdAt).toLocaleTimeString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {isDefect ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> Defect Reported
                    </span>
                  ) : isProcessing ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 border border-teal-300 animate-pulse">
                      Processing
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Ready for Print
                    </span>
                  )}

                  <Link href={`/cards/queue?jobId=${job.id}`}>
                    <Button type="button" variant="outline" size="sm" className="text-xs">
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
