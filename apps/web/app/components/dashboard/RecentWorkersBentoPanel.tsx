'use client';

import React from 'react';
import Link from 'next/link';
import { Users, CreditCard, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { Button } from '@hr/ui';

export interface RecentWorkerItem {
  personId: string;
  employmentId: string;
  employeeNumber: string;
  displayName: string;
  displayNameLatin?: string | null;
  displayNameNative?: string | null;
  jobTitle: string;
  status: string;
  orgUnitName: string | null;
  orgUnitNameBangla?: string | null;
  locationName: string | null;
  hasPhoto: boolean;
  photoUrl: string | null;
  isReadyToPrint: boolean;
  blockersCount: number;
}

interface RecentWorkersBentoPanelProps {
  workers: RecentWorkerItem[];
  isLoading?: boolean;
}

export function RecentWorkersBentoPanel({
  workers = [],
  isLoading = false,
}: RecentWorkersBentoPanelProps) {
  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex flex-col justify-between space-y-4 h-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 rounded-xl bg-teal-50 text-teal-800 border border-teal-200/60 shrink-0">
            <Users className="w-4 h-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate">Recent Workers</h3>
            <span className="text-xs text-slate-500 block truncate">Roster & readiness diagnostics</span>
          </div>
        </div>

        <Link
          href="/people"
          className="text-xs font-semibold text-teal-800 hover:text-teal-950 hover:underline flex items-center gap-1 shrink-0"
        >
          <span>All Workers</span>
          <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
        </Link>
      </div>

      {/* Workers List */}
      <div className="divide-y divide-slate-100 flex-1">
        {isLoading ? (
          <div className="py-8 text-center text-xs text-slate-500">Loading worker roster...</div>
        ) : workers.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">
            No workers enrolled in this facility scope.
          </div>
        ) : (
          workers.slice(0, 5).map((worker) => (
            <div
              key={worker.employmentId}
              className="py-3 flex items-center justify-between gap-3 group hover:bg-slate-50/80 rounded-xl px-2.5 -mx-2.5 transition-colors"
            >
              {/* Photo & Identity */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                  {worker.hasPhoto && worker.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={worker.photoUrl}
                      alt={worker.displayName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-xs font-bold text-slate-400">
                      {worker.displayName.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>

                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/people/${worker.personId}`}
                      className="text-xs sm:text-sm font-bold text-slate-900 truncate hover:text-teal-800 transition-colors"
                    >
                      {worker.displayName}
                    </Link>
                    {worker.displayNameNative && (
                      <span className="text-xs text-teal-700 font-medium hidden sm:inline truncate">
                        {worker.displayNameNative}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 font-mono flex items-center gap-1.5 truncate">
                    <span>{worker.employeeNumber || 'NO-ID'}</span>
                    <span>•</span>
                    <span className="truncate">{worker.jobTitle || 'Operator'}</span>
                  </div>
                </div>
              </div>

              {/* Status & CTA */}
              <div className="flex items-center gap-2 shrink-0">
                {worker.isReadyToPrint ? (
                  <span className="hidden sm:inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" aria-hidden="true" />
                    <span>Ready</span>
                  </span>
                ) : (
                  <span className="hidden sm:inline-flex items-center gap-1 text-xs font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                    <AlertCircle className="w-3 h-3 text-amber-600" aria-hidden="true" />
                    <span>Missing Photo</span>
                  </span>
                )}

                <Link href={`/cards/new?employmentId=${worker.employmentId}`}>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs font-semibold border-teal-200 text-teal-800 hover:bg-teal-50 hover:border-teal-300"
                  >
                    <CreditCard className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
                    <span>Card</span>
                  </Button>
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

