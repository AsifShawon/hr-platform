'use client';

import React from 'react';
import Link from 'next/link';
import { AlertTriangle, Camera, CheckCircle2, ArrowRight, ShieldAlert, Sparkles } from 'lucide-react';
import { Button } from '@hr/ui';
import { DashboardReadinessSummaryDTO } from '@hr/schemas';

interface ReadinessAttentionPanelProps {
  readiness?: DashboardReadinessSummaryDTO | null;
  missingPhotoCount?: number;
  isLoading?: boolean;
}

export function ReadinessAttentionPanel({
  readiness,
  missingPhotoCount = 0,
  isLoading = false,
}: ReadinessAttentionPanelProps) {
  const reasons = readiness?.reasons || [];
  const needsAttentionCount = readiness?.needsAttentionCount ?? missingPhotoCount;
  const isAllReady = needsAttentionCount === 0;

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex flex-col justify-between space-y-4 h-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`p-2 rounded-xl border shrink-0 ${
              isAllReady
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200/60'
                : 'bg-amber-50 text-amber-800 border-amber-200/60'
            }`}
          >
            {isAllReady ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-700" aria-hidden="true" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-700" aria-hidden="true" />
            )}
          </div>
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate">
              Worker Readiness Diagnostics
            </h3>
            <span className="text-xs text-slate-500 block truncate">
              {isAllReady
                ? 'All enrolled workers verified printable'
                : `${needsAttentionCount} workers blocked from physical printing`}
            </span>
          </div>
        </div>

        <Link
          href="/people?readiness=NEEDS_ATTENTION"
          className="text-xs font-semibold text-teal-800 hover:text-teal-950 hover:underline flex items-center gap-1 shrink-0"
        >
          <span>Fix Readiness</span>
          <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
        </Link>
      </div>

      {/* Breakdown List of Real Reason Codes */}
      <div className="space-y-2.5 flex-1">
        {isLoading ? (
          <div className="py-8 text-center text-xs text-slate-500">Checking readiness blockers...</div>
        ) : isAllReady ? (
          <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" />
              <span>100% of workers in active scope have valid portrait photos and bindings.</span>
            </div>
            <Link href="/cards/new">
              <Button type="button" variant="outline" size="sm" className="text-xs font-semibold shrink-0">
                Issue Card
              </Button>
            </Link>
          </div>
        ) : (
          reasons.map((reason) => (
            <div
              key={reason.code}
              className="p-3.5 rounded-xl bg-amber-50/50 border border-amber-200/80 flex items-center justify-between gap-3"
            >
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm font-bold text-amber-950 truncate">
                    {reason.label}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-100 text-amber-900">
                    {reason.count} {reason.count === 1 ? 'worker' : 'workers'}
                  </span>
                </div>
                <span className="text-xs text-amber-800 font-mono block">
                  code: {reason.code}
                </span>
              </div>

              <Link href={reason.actionHref || '/people?readiness=NEEDS_ATTENTION'}>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs font-semibold border-amber-300 text-amber-900 hover:bg-amber-100 shrink-0"
                >
                  <span>Resolve</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1" aria-hidden="true" />
                </Button>
              </Link>
            </div>
          ))
        )}

        {/* Conditional Photo Studio Action when Missing Photos Exist */}
        {missingPhotoCount > 0 && (
          <div className="p-3 rounded-xl bg-teal-50/60 border border-teal-200/80 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-teal-950 min-w-0 truncate">
              <Camera className="w-4 h-4 text-teal-800 shrink-0" aria-hidden="true" />
              <span className="truncate">
                Capture portraits via attached webcam or phone QR handoff.
              </span>
            </div>
            <Link href="/people?filter=missing-photo">
              <span className="text-xs font-bold text-teal-800 hover:underline shrink-0">
                Open Camera →
              </span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
