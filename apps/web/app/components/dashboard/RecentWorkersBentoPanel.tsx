'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  CreditCard,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import { Badge, Button } from '@hr/ui';

interface WorkerItem {
  id: string;
  displayName: string;
  displayNameNative?: string | null;
  photoMediaId?: string | null;
  activeEmployment?: {
    id: string;
    employeeNumber: string;
    jobTitle: string;
    status: string;
    cardReadiness?: {
      isReady: boolean;
      blockersCount: number;
    } | null;
  } | null;
}

export function RecentWorkersBentoPanel() {
  const [workers, setWorkers] = useState<WorkerItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadRecentWorkers() {
      try {
        const res = await fetch('/api/people?limit=4');
        if (res.ok) {
          const data = await res.json();
          setWorkers(data.items || []);
        }
      } catch {
        // Handle error
      } finally {
        setIsLoading(false);
      }
    }
    loadRecentWorkers();
  }, []);

  return (
    <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-teal-50 text-[#0F766E] border border-teal-200/60">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Recent Workers</h3>
            <span className="text-[11px] text-slate-500">Live roster & readiness diagnostics</span>
          </div>
        </div>

        <Link
          href="/people"
          className="text-xs font-bold text-[#0F766E] hover:underline flex items-center gap-1"
        >
          <span>All Workers</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Workers List */}
      <div className="divide-y divide-slate-100">
        {isLoading ? (
          <div className="py-8 text-center text-xs text-slate-400">Loading worker roster...</div>
        ) : workers.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">No workers enrolled yet.</div>
        ) : (
          workers.map((worker) => {
            const hasPhoto = Boolean(worker.photoMediaId);
            const isReady = hasPhoto && worker.activeEmployment?.status === 'ACTIVE';

            return (
              <div
                key={worker.id}
                className="py-3 flex items-center justify-between gap-3 group hover:bg-slate-50/60 rounded-xl px-2 -mx-2 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Photo Thumbnail */}
                  <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                    {hasPhoto ? (
                      <img
                        src={`/api/people/${worker.id}/photo?t=thumb`}
                        alt={worker.displayName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-xs font-bold text-slate-400">
                        {worker.displayName.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>

                  {/* Worker Information */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/people/${worker.id}`}
                        className="text-xs font-bold text-slate-900 truncate hover:text-[#0F766E] transition-colors"
                      >
                        {worker.displayName}
                      </Link>
                      {worker.displayNameNative && (
                        <span className="text-[11px] text-[#0F766E] font-medium hidden sm:inline truncate">
                          {worker.displayNameNative}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono flex items-center gap-2">
                      <span>{worker.activeEmployment?.employeeNumber || 'NO-EMP-ID'}</span>
                      <span>•</span>
                      <span className="truncate">
                        {worker.activeEmployment?.jobTitle || 'Operator'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Status & Preview & Print CTA */}
                <div className="flex items-center gap-2 shrink-0">
                  {isReady ? (
                    <span className="hidden md:inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3" /> Ready
                    </span>
                  ) : (
                    <span className="hidden md:inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                      <AlertCircle className="w-3 h-3" /> Fix Photo
                    </span>
                  )}

                  <Link href={`/people/${worker.id}?tab=cards`}>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs font-bold border-teal-200 text-[#0F766E] hover:bg-teal-50"
                    >
                      <CreditCard className="w-3 h-3 mr-1" />
                      <span>Preview & Print</span>
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
