'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Printer, ArrowUpRight, Sparkles, CheckCircle2 } from 'lucide-react';
import { Badge } from '@hr/ui';

interface TemplateSummary {
  id: string;
  name: string;
  code: string;
  format: string;
  isDefault: boolean;
}

export function TemplatePreviewBentoPanel() {
  const [template, setTemplate] = useState<TemplateSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadTemplate() {
      try {
        const res = await fetch('/api/cards/templates?limit=1');
        if (res.ok) {
          const data = await res.json();
          const items = data.items || [];
          const def = items.find((t: any) => t.isDefault) || items[0] || null;
          setTemplate(def);
        }
      } catch {
        // Safe fallback
      } finally {
        setIsLoading(false);
      }
    }
    loadTemplate();
  }, []);

  return (
    <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-teal-50 text-[#0F766E] border border-teal-200/60">
            <Printer className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Active Card Template</h3>
            <span className="text-[11px] text-slate-500">60 × 90 mm Dual-Sided Master</span>
          </div>
        </div>

        <Badge variant="primary" size="sm">
          Factory Standard
        </Badge>
      </div>

      {/* Visual Dual-Sided Miniature Previews */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex items-center justify-center gap-4">
        {/* Front Miniature */}
        <div className="w-24 h-36 bg-white rounded-lg shadow-sm border border-slate-300 p-2 flex flex-col justify-between relative overflow-hidden">
          <div className="h-2 w-full bg-[#134E4A] rounded-t-sm -mx-2 -mt-2 mb-1.5" />
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-7 bg-slate-200 rounded-sm shrink-0 border border-slate-300" />
            <div className="space-y-1 w-full">
              <div className="h-1.5 w-10 bg-slate-700 rounded-sm" />
              <div className="h-1 w-8 bg-slate-300 rounded-sm" />
            </div>
          </div>
          <div className="space-y-1 mt-auto">
            <div className="h-1 w-12 bg-slate-400 rounded-sm" />
            <div className="h-1 w-7 bg-slate-300 rounded-sm" />
          </div>
          <span className="text-[8px] font-bold text-center text-slate-400 uppercase tracking-wider block border-t border-slate-100 pt-0.5">
            Front (EN)
          </span>
        </div>

        {/* Back Miniature */}
        <div className="w-24 h-36 bg-white rounded-lg shadow-sm border border-slate-300 p-2 flex flex-col justify-between relative overflow-hidden">
          <div className="space-y-1">
            <div className="h-1.5 w-12 bg-[#0F766E] rounded-sm mx-auto" />
            <div className="h-1 w-full bg-slate-200 rounded-sm" />
            <div className="h-1 w-full bg-slate-200 rounded-sm" />
          </div>
          <div className="w-10 h-10 bg-slate-100 border border-slate-300 rounded-sm mx-auto flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-slate-400 border-dashed" />
          </div>
          <span className="text-[8px] font-bold text-center text-[#0F766E] uppercase tracking-wider block border-t border-slate-100 pt-0.5">
            Back (বাংলা)
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs pt-1">
        <div>
          <span className="font-bold text-slate-800 block truncate">
            {isLoading ? 'Loading...' : template?.name || 'Classic Vertical Preset'}
          </span>
          <span className="text-[11px] text-slate-500 font-mono">
            {template?.code || 'CLASSIC_VERTICAL_60X90'}
          </span>
        </div>

        <Link
          href="/cards/templates"
          className="text-xs font-bold text-[#0F766E] hover:underline flex items-center gap-1 shrink-0"
        >
          <span>Manage</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
