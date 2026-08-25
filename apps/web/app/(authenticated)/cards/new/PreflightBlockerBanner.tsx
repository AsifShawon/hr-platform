'use client';

import React from 'react';
import { AlertTriangle, XCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { CardReadinessResult, CardReadinessIssue } from '@hr/domain';

interface PreflightBlockerBannerProps {
  readiness: CardReadinessResult | null;
  onFixField?: (fieldKey: string) => void;
}

export const PreflightBlockerBanner: React.FC<PreflightBlockerBannerProps> = ({
  readiness,
  onFixField,
}) => {
  if (!readiness) return null;

  const { isReady, blockers, warnings, resolvedTemplate } = readiness;

  if (isReady && warnings.length === 0) {
    return (
      <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">
            Preflight Passed: Worker and template bindings are 100% ready for physical printing.
          </span>
        </div>
        {resolvedTemplate && (
          <span className="text-[11px] font-mono text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded">
            {resolvedTemplate.templateName} (v{resolvedTemplate.versionNumber})
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {/* Critical Blockers (Prevents Issuance) */}
      {blockers.length > 0 && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-2">
          <div className="flex items-center gap-2 font-bold text-rose-950">
            <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>
              Card Issuance Blocked ({blockers.length} {blockers.length === 1 ? 'Issue' : 'Issues'})
            </span>
          </div>

          <ul className="space-y-1.5 pl-6 list-disc">
            {blockers.map((blocker, idx) => (
              <li key={idx} className="leading-snug">
                <span className="font-semibold">{blocker.message}</span>
                {blocker.suggestion && (
                  <span className="text-rose-700 block text-[11px] mt-0.5">
                    {blocker.suggestion}
                  </span>
                )}
                {blocker.field && onFixField && (
                  <button
                    type="button"
                    onClick={() => onFixField(blocker.field!)}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-800 hover:underline mt-0.5"
                  >
                    Jump to fix {blocker.field} <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Advisories & Warnings (Overridable) */}
      {warnings.length > 0 && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1.5">
          <div className="flex items-center gap-2 font-bold text-amber-950">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Advisory Warnings ({warnings.length})</span>
          </div>

          <ul className="space-y-1 pl-6 list-disc text-[11px]">
            {warnings.map((warning, idx) => (
              <li key={idx}>
                <span>{warning.message}</span>
                {warning.suggestion && (
                  <span className="text-amber-800 block text-[10px]">{warning.suggestion}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
