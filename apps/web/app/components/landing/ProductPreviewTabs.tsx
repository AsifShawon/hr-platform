'use client';

import React, { useState } from 'react';
import {
  CreditCard,
  Layers,
  Printer,
  CheckCircle2,
  AlertCircle,
  FileCheck2,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { Badge, Button } from '@hr/ui';
import { FICTIONAL_WORKERS } from '@hr/fixtures';

export function ProductPreviewTabs() {
  const [activeTab, setActiveTab] = useState<'flow' | 'queue' | 'engine'>('flow');

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Tab Switcher Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-2 p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200 w-fit mx-auto shadow-inner">
        <button
          type="button"
          onClick={() => setActiveTab('flow')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'flow'
              ? 'bg-white text-[#134E4A] shadow-sm ring-1 ring-slate-200'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <CreditCard className="w-4 h-4 text-[#0F766E]" />
          <span>Worker-to-Print Flow</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('queue')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'queue'
              ? 'bg-white text-[#134E4A] shadow-sm ring-1 ring-slate-200'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <Layers className="w-4 h-4 text-[#0F766E]" />
          <span>Batch Queue & Defect Sign-off</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('engine')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'engine'
              ? 'bg-white text-[#134E4A] shadow-sm ring-1 ring-slate-200'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <Printer className="w-4 h-4 text-[#0F766E]" />
          <span>Bilingual Card Engine</span>
        </button>
      </div>

      {/* Tab Panels */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
        {/* TAB 1: WORKER-TO-PRINT FLOW */}
        {activeTab === 'flow' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Worker Card Creation & Live Preflight
                </h3>
                <p className="text-xs text-slate-500">
                  Instant readiness diagnostics segregating blockers from advisory warnings before
                  print dispatch.
                </p>
              </div>
              <Badge variant="primary" size="sm">
                Single Worker & Batch Ready
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Step 1 Preview Card */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">1. Worker Record</span>
                  <span className="text-[10px] font-mono text-slate-400">Step 1/3</span>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-200/80 text-xs space-y-1">
                  <span className="font-bold text-slate-900 block truncate">Tanvir Ahmed</span>
                  <span className="text-[11px] text-[#0F766E] font-medium block">তানভীর আহমেদ</span>
                  <span className="text-[10px] font-mono text-slate-500 block">
                    ID: EMP-1001 • Production
                  </span>
                </div>
                <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Identity & Unit Validated
                </span>
              </div>

              {/* Step 2 Preview Card */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">2. Photo & Preflight</span>
                  <span className="text-[10px] font-mono text-slate-400">Step 2/3</span>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-200/80 text-xs flex items-center gap-3">
                  <div className="w-10 h-12 bg-slate-200 rounded-lg border border-slate-300 flex items-center justify-center shrink-0 text-[10px] font-bold text-slate-500">
                    2:3
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <span className="font-bold text-slate-900 block text-xs">
                      Approved Portrait
                    </span>
                    <span className="text-[10px] text-slate-500 block truncate">
                      300 DPI • EXIF Stripped
                    </span>
                  </div>
                </div>
                <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> 0 Blockers • 0 Warnings
                </span>
              </div>

              {/* Step 3 Preview Card */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">3. Print Dispatch</span>
                  <span className="text-[10px] font-mono text-slate-400">Step 3/3</span>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-200/80 text-xs space-y-1">
                  <span className="font-bold text-slate-900 block">Exact 60 × 90 mm PDF</span>
                  <span className="text-[11px] text-slate-500 block">100% Scale Vector Master</span>
                </div>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  className="w-full justify-center bg-[#134E4A] text-white font-bold text-xs"
                >
                  <Printer className="w-3.5 h-3.5 mr-1" />
                  <span>Download Master PDF</span>
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PRINT QUEUE & DEFECT SIGN-OFF */}
        {activeTab === 'queue' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Persistent Queue & Physical Operator Sign-off
                </h3>
                <p className="text-xs text-slate-500">
                  Track batch jobs, isolate defect cards, and atomically activate verified badges
                  upon sign-off.
                </p>
              </div>
              <Badge variant="primary" size="sm">
                Zero Badge Leakage
              </Badge>
            </div>

            <div className="border border-slate-200 rounded-2xl overflow-hidden text-xs">
              <div className="bg-slate-50 p-3.5 border-b border-slate-200 flex items-center justify-between font-semibold text-slate-700">
                <span>Job Batch #481A9F (4 Workers)</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800">
                  Render Ready
                </span>
              </div>
              <div className="divide-y divide-slate-100 p-2 space-y-1">
                {FICTIONAL_WORKERS.slice(0, 3).map((w, idx) => (
                  <div key={w.employeeNumber} className="p-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-slate-400">0{idx + 1}</span>
                      <div>
                        <span className="font-bold text-slate-900 block">{w.displayNameLatin}</span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {w.employeeNumber} • {w.title}
                        </span>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                      <CheckCircle2 className="w-3 h-3" /> QA Passed
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: BILINGUAL CARD ENGINE */}
        {activeTab === 'engine' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  High-Precision Bilingual Imposition Engine
                </h3>
                <p className="text-xs text-slate-500">
                  Exact decimal millimetre geometry with long-edge duplex mirroring and self-hosted
                  Noto fonts.
                </p>
              </div>
              <Badge variant="primary" size="sm">
                Noto Sans Bengali
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-2xl font-extrabold text-[#134E4A] block">60 × 90 mm</span>
                <span className="text-xs font-bold text-slate-800 block">Vertical Standard</span>
                <span className="text-[11px] text-slate-500 block">709 × 1063 px @ 300 DPI</span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-2xl font-extrabold text-[#0F766E] block">100.0%</span>
                <span className="text-xs font-bold text-slate-800 block">Exact Scale Master</span>
                <span className="text-[11px] text-slate-500 block">Zero page-fit distortion</span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-2xl font-extrabold text-[#14B8A6] block">Duplex</span>
                <span className="text-xs font-bold text-slate-800 block">
                  Front (EN) / Back (বাংলা)
                </span>
                <span className="text-[11px] text-slate-500 block">Long-edge mirrored columns</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
