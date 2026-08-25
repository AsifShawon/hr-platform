'use client';

import React from 'react';
import {
  Printer,
  Layers,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  Sparkles,
  Sliders,
} from 'lucide-react';
import { Button, Badge } from '@hr/ui';
import { PrintOutputFormat, PrintJobSide } from '@hr/domain';

interface Step3PrintDispatchProps {
  printOptions: {
    outputMode: 'PRINT_NOW' | 'QUEUE';
    outputFormat: PrintOutputFormat;
    side: PrintJobSide;
    copiesPerCard: number;
  };
  setPrintOptions: React.Dispatch<
    React.SetStateAction<{
      outputMode: 'PRINT_NOW' | 'QUEUE';
      outputFormat: PrintOutputFormat;
      side: PrintJobSide;
      copiesPerCard: number;
    }>
  >;
  summary: {
    workerName: string;
    employeeNumber: string;
    organizationName: string;
    orgUnitName?: string | null;
    templateName: string;
    photoAttached: boolean;
  };
  onBack: () => void;
  onSubmit: () => Promise<boolean>;
  isSubmitting: boolean;
}

export const Step3PrintDispatch: React.FC<Step3PrintDispatchProps> = ({
  printOptions,
  setPrintOptions,
  summary,
  onBack,
  onSubmit,
  isSubmitting,
}) => {
  return (
    <div className="space-y-6">
      {/* 1. Print Method Choice */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Printer className="w-4 h-4 text-[#0F766E]" />
          <span>Select Production & Print Method</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Choice A: Direct Print Master */}
          <button
            type="button"
            onClick={() =>
              setPrintOptions((prev) => ({
                ...prev,
                outputMode: 'PRINT_NOW',
                outputFormat: PrintOutputFormat.INDIVIDUAL_PDF,
              }))
            }
            className={`p-5 rounded-2xl border text-left transition-all flex flex-col justify-between ${
              printOptions.outputMode === 'PRINT_NOW'
                ? 'bg-teal-50/70 border-[#0F766E] shadow-sm ring-1 ring-[#0F766E]'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-xl bg-teal-100/70 text-[#0F766E]">
                  <Printer className="w-5 h-5" />
                </div>
                {printOptions.outputMode === 'PRINT_NOW' && (
                  <Badge variant="primary" size="sm">
                    Selected
                  </Badge>
                )}
              </div>
              <h4 className="text-sm font-bold text-slate-900">Print Now (Single Master PDF)</h4>
              <p className="text-xs text-slate-600 leading-snug">
                Issues the card directly and opens the exact 60×90 mm PDF print master for immediate
                printing.
              </p>
            </div>
          </button>

          {/* Choice B: Batch Queue */}
          <button
            type="button"
            onClick={() =>
              setPrintOptions((prev) => ({
                ...prev,
                outputMode: 'QUEUE',
                outputFormat: PrintOutputFormat.A4_SHEET,
              }))
            }
            className={`p-5 rounded-2xl border text-left transition-all flex flex-col justify-between ${
              printOptions.outputMode === 'QUEUE'
                ? 'bg-teal-50/70 border-[#0F766E] shadow-sm ring-1 ring-[#0F766E]'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-xl bg-teal-100/70 text-[#0F766E]">
                  <Layers className="w-5 h-5" />
                </div>
                {printOptions.outputMode === 'QUEUE' && (
                  <Badge variant="primary" size="sm">
                    Selected
                  </Badge>
                )}
              </div>
              <h4 className="text-sm font-bold text-slate-900">
                Add to Print Queue (Batch Imposition)
              </h4>
              <p className="text-xs text-slate-600 leading-snug">
                Enqueues badge for batch printing on multi-card A4 or US Letter sheets (e.g. 9 cards
                per sheet).
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* 2. Output Configurations */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <Sliders className="w-4 h-4 text-[#0F766E]" />
          <span>Output & Layout Settings</span>
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Sheet / Output Format
            </label>
            <select
              value={printOptions.outputFormat}
              onChange={(e) =>
                setPrintOptions((prev) => ({ ...prev, outputFormat: e.target.value as any }))
              }
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
            >
              <option value={PrintOutputFormat.INDIVIDUAL_PDF}>
                Single Card PDF (Exact 60×90mm)
              </option>
              <option value={PrintOutputFormat.A4_SHEET}>A4 Multi-Card Sheet (Imposition)</option>
              <option value={PrintOutputFormat.LETTER_SHEET}>US Letter Multi-Card Sheet</option>
              <option value={PrintOutputFormat.HIGH_RES_PNG}>High-Res PNG (300 DPI)</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Printed Sides</label>
            <select
              value={printOptions.side}
              onChange={(e) =>
                setPrintOptions((prev) => ({ ...prev, side: e.target.value as any }))
              }
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
            >
              <option value={PrintJobSide.DUPLEX}>Duplex (Front English + Back Bangla)</option>
              <option value={PrintJobSide.FRONT}>Front Side Only (English)</option>
              <option value={PrintJobSide.BACK}>Back Side Only (Bangla)</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Copies per Badge
            </label>
            <select
              value={printOptions.copiesPerCard}
              onChange={(e) =>
                setPrintOptions((prev) => ({ ...prev, copiesPerCard: Number(e.target.value) }))
              }
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
            >
              <option value={1}>1 Copy (Standard)</option>
              <option value={2}>2 Copies</option>
              <option value={3}>3 Copies</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. Physical Scale Notice */}
      <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold block">Critical Printer Scale Warning</span>
          <span className="text-amber-800 text-[11px] leading-relaxed">
            In your operating system print dialog, always verify that Page Scaling is set to{' '}
            <strong>&quot;100%&quot;</strong> or <strong>&quot;Actual Size&quot;</strong>. Never
            select &quot;Fit to Page&quot; or &quot;Shrink oversized pages&quot; to preserve exact
            metric card dimensions.
          </span>
        </div>
      </div>

      {/* 4. Final Check-Answers Summary Card */}
      <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <FileCheck className="w-4 h-4 text-[#0F766E]" />
          <span>Final Check-Answers Summary</span>
        </h4>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs pt-2 border-t border-slate-200">
          <div>
            <span className="text-slate-500 block text-[11px]">Employee Name:</span>
            <span className="font-bold text-slate-900">{summary.workerName}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[11px]">Employee ID:</span>
            <span className="font-mono font-bold text-slate-900">{summary.employeeNumber}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[11px]">Company / Organization:</span>
            <span className="font-medium text-slate-800">{summary.organizationName}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[11px]">Department / Section:</span>
            <span className="font-medium text-slate-800">
              {summary.orgUnitName || 'General Staff'}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block text-[11px]">Template Format:</span>
            <span className="font-medium text-slate-800">{summary.templateName}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[11px]">Portrait Photo:</span>
            <span className="font-medium text-slate-800">
              {summary.photoAttached ? '✓ Attached' : 'Silhouette Placeholder'}
            </span>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-200">
        <Button type="button" variant="outline" size="md" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          <span>Back to Preview</span>
        </Button>

        <Button
          type="button"
          variant="primary"
          size="md"
          isLoading={isSubmitting}
          onClick={onSubmit}
          className="bg-[#134E4A] hover:bg-[#0F766E] text-white px-8 font-bold shadow-md"
        >
          {printOptions.outputMode === 'PRINT_NOW' ? (
            <>
              <Printer className="w-4 h-4 mr-2" />
              <span>Generate Master PDF & Print</span>
            </>
          ) : (
            <>
              <Layers className="w-4 h-4 mr-2" />
              <span>Add Badge to Batch Queue</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
