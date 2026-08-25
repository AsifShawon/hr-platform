'use client';

import React from 'react';
import {
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  Layout,
  CheckCircle2,
  AlertTriangle,
  CreditCard,
  ShieldCheck,
} from 'lucide-react';
import { Button, Badge } from '@hr/ui';
import { CardLayoutSpecification, CardReadinessResult } from '@hr/domain';
import { CardRenderer, CardWorkerData } from '../../../components/cards/CardRenderer';
import { PreflightBlockerBanner } from './PreflightBlockerBanner';
import { TemplateItem } from './useCardCreationState';

interface Step2PreflightPreviewProps {
  preflightResult: CardReadinessResult | null;
  isLoadingPreflight: boolean;
  activeTemplateLayout: CardLayoutSpecification | null;
  workerData: CardWorkerData;
  templates: TemplateItem[];
  currentTemplateId: string;
  onTemplateChange: (tplId: string) => void;
  onBack: () => void;
  onContinue: () => void;
  onFixField: (fieldKey: string) => void;
}

export const Step2PreflightPreview: React.FC<Step2PreflightPreviewProps> = ({
  preflightResult,
  isLoadingPreflight,
  activeTemplateLayout,
  workerData,
  templates,
  currentTemplateId,
  onTemplateChange,
  onBack,
  onContinue,
  onFixField,
}) => {
  const isReady = preflightResult?.isReady ?? true;

  return (
    <div className="space-y-6">
      {/* 1. Preflight Diagnostics Banner */}
      <PreflightBlockerBanner readiness={preflightResult} onFixField={onFixField} />

      {/* 2. Template Resolution & Switcher Toolbar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-teal-50 text-[#0F766E]">
            <Layout className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Card Design Template</h3>
            <p className="text-xs text-slate-500">
              Resolved automatically by organization hierarchy or custom assigned template.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={currentTemplateId}
            onChange={(e) => onTemplateChange(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
          >
            {templates.map((tpl) => (
              <option key={tpl.id} value={tpl.id}>
                {tpl.name} ({tpl.presetId})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 3. Live Dual-Sided Card Preview Box */}
      <div className="p-6 rounded-2xl bg-slate-100 border border-slate-200 flex flex-col items-center justify-center min-h-[420px] relative">
        {isLoadingPreflight ? (
          <div className="flex flex-col items-center justify-center gap-3 p-8">
            <RefreshCw className="w-8 h-8 text-[#0F766E] animate-spin" />
            <span className="text-xs font-bold text-slate-600">
              Evaluating card geometry & layout bindings...
            </span>
          </div>
        ) : activeTemplateLayout ? (
          <div className="w-full flex flex-col items-center gap-4">
            <CardRenderer
              layout={activeTemplateLayout}
              worker={workerData}
              side="both"
              showSafeArea={false}
              showBleed={false}
            />
          </div>
        ) : (
          <div className="p-8 text-center space-y-2">
            <CreditCard className="w-10 h-10 text-slate-400 mx-auto" />
            <span className="text-xs text-slate-500 font-medium block">
              Template layout could not be loaded. Please select a published card template above.
            </span>
          </div>
        )}
      </div>

      {/* 4. Action Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-200">
        <Button type="button" variant="outline" size="md" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          <span>Back to Worker Form</span>
        </Button>

        <Button
          type="button"
          variant="primary"
          size="md"
          onClick={onContinue}
          disabled={!isReady}
          className="bg-[#134E4A] hover:bg-[#0F766E] text-white px-6 font-bold shadow-md disabled:opacity-50"
        >
          <span>Proceed to Print Output</span>
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};
