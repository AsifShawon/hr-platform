'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { LayoutTemplate, ArrowUpRight, RefreshCw, CheckCircle2, Sliders } from 'lucide-react';
import { CardRenderer, SAMPLE_WORKER } from '../cards/CardRenderer';
import { CardLayoutSpecification } from '@hr/domain';

interface TemplateSummary {
  id: string;
  name: string;
  presetId: string;
  versionNumber: number;
  checksumSha256: string;
  layout: CardLayoutSpecification;
  resolutionReason?: string;
}

interface TemplatePreviewBentoPanelProps {
  template: TemplateSummary | null;
  orgName?: string;
  isLoading?: boolean;
}

export function TemplatePreviewBentoPanel({
  template,
  orgName,
  isLoading = false,
}: TemplatePreviewBentoPanelProps) {
  const [previewSide, setPreviewSide] = useState<'front' | 'back'>('front');

  const customWorker = {
    ...SAMPLE_WORKER,
    orgName: orgName || template?.layout?.front?.header?.customTitle || 'London Boy Apparel Ltd.',
  };

  const dimensionsLabel = template?.layout?.dimensions
    ? `${template.layout.dimensions.widthMm} × ${template.layout.dimensions.heightMm} mm (Exact Size)`
    : '60 × 90 mm Dual-Sided Master';

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex flex-col justify-between space-y-4 h-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 rounded-xl bg-teal-50 text-teal-800 border border-teal-200/60 shrink-0">
            <LayoutTemplate className="w-4 h-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate">
              Active Card Template
            </h3>
            <span className="text-xs text-slate-500 font-mono block truncate">
              {template?.resolutionReason || dimensionsLabel}
            </span>
          </div>
        </div>

        {template ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-50 text-teal-900 border border-teal-200/80 shrink-0">
            <CheckCircle2 className="w-3 h-3 text-teal-700" aria-hidden="true" />
            <span>v{template.versionNumber} Published</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-200 shrink-0">
            <span>No Template</span>
          </span>
        )}
      </div>

      {/* Real CardRenderer Preview Canvas */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 sm:p-4 flex flex-col items-center justify-center relative overflow-hidden min-h-[220px]">
        {isLoading ? (
          <div className="py-12 text-center text-xs text-slate-500">Loading template preview...</div>
        ) : template?.layout ? (
          <div className="flex flex-col items-center gap-3">
            {/* Scaled Render Container */}
            <div className="transform scale-[0.62] sm:scale-[0.72] origin-center -my-10 transition-transform">
              <CardRenderer
                layout={template.layout}
                worker={customWorker}
                side={previewSide}
                allowFlip={false}
              />
            </div>

            {/* Side Switcher Pill */}
            <button
              type="button"
              onClick={() => setPreviewSide((prev) => (prev === 'front' ? 'back' : 'front'))}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-800 hover:text-teal-950 bg-white px-3 py-1.5 rounded-full border border-teal-200/80 hover:border-teal-300 transition-colors shadow-2xs z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
            >
              <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Flip to {previewSide === 'front' ? 'Bangla Back (বাংলা)' : 'English Front'}</span>
            </button>
          </div>
        ) : (
          <div className="py-12 text-center space-y-2">
            <p className="text-xs text-slate-600 font-medium">No published template assigned to this scope.</p>
            <Link href="/cards/templates/new">
              <span className="text-xs font-semibold text-teal-800 hover:underline">
                Create Organization Template →
              </span>
            </Link>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 gap-3">
        <div className="min-w-0 pr-2">
          <span className="font-bold text-slate-900 block truncate">
            {isLoading ? 'Loading...' : template?.name || 'No Template Assigned'}
          </span>
          <span className="text-xs text-slate-500 font-mono block truncate">
            {template ? `${template.presetId} • ${dimensionsLabel}` : 'Configure layout in studio'}
          </span>
        </div>

        <Link
          href={template ? `/cards/templates/${template.id}` : '/cards/templates/new'}
          className="text-xs font-semibold text-teal-800 hover:text-teal-950 hover:underline flex items-center gap-1 shrink-0"
        >
          <span>{template ? 'Manage Layout' : 'Create Template'}</span>
          <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}

