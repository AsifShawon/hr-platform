'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  Printer,
  Download,
  PlusCircle,
  User,
  Layers,
  ShieldCheck,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { Button, Badge } from '@hr/ui';

interface Step4CompletionProps {
  completionData: {
    cardIssueId?: string;
    cardSerial?: string;
    printJobId?: string;
    pdfDownloadUrl?: string;
    isConfirmedPrinted: boolean;
  } | null;
  workerName: string;
  employeeNumber: string;
  onResetForAnother: () => void;
  onConfirmPhysicalPrint: () => Promise<void>;
}

export const Step4Completion: React.FC<Step4CompletionProps> = ({
  completionData,
  workerName,
  employeeNumber,
  onResetForAnother,
  onConfirmPhysicalPrint,
}) => {
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(completionData?.isConfirmedPrinted || false);

  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      await onConfirmPhysicalPrint();
      setConfirmed(true);
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto text-center animate-in fade-in zoom-in-95">
      {/* 1. Success Hero Box */}
      <div className="p-8 rounded-3xl bg-teal-50/60 border border-teal-200 shadow-sm space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-teal-600 text-white flex items-center justify-center mx-auto shadow-md">
          <CheckCircle2 className="w-9 h-9" />
        </div>

        <div className="space-y-1.5">
          <h2 className="text-xl font-bold text-slate-900">ID Card Successfully Created!</h2>
          <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
            Card credentials for <strong>{workerName}</strong> ({employeeNumber}) have been
            generated and recorded in the immutable registry.
          </p>
        </div>

        {completionData?.cardSerial && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-teal-200 shadow-inner">
            <ShieldCheck className="w-4 h-4 text-[#0F766E]" />
            <span className="text-xs font-mono font-bold text-slate-800">
              Serial: {completionData.cardSerial}
            </span>
          </div>
        )}
      </div>

      {/* 2. Primary Production Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Action A: Open Master PDF */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3 text-left">
          <div className="flex items-center gap-2.5 text-[#0F766E]">
            <Printer className="w-5 h-5" />
            <h4 className="text-sm font-bold text-slate-900">Physical Print Master</h4>
          </div>
          <p className="text-xs text-slate-500 leading-snug">
            Download the exact-size 60×90 mm PDF print master or send it directly to your badge
            printer.
          </p>

          <Button
            type="button"
            variant="primary"
            size="md"
            className="w-full bg-[#134E4A] hover:bg-[#0F766E] text-white font-bold"
            onClick={() => {
              // Open calibration or single render PDF preview route
              window.open('/api/cards/calibration/pdf?sheet=A4', '_blank');
            }}
          >
            <Download className="w-4 h-4 mr-2" />
            <span>Open Print Master PDF</span>
          </Button>
        </div>

        {/* Action B: Operator Confirmation */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3 text-left">
          <div className="flex items-center gap-2.5 text-emerald-700">
            <CheckCircle2 className="w-5 h-5" />
            <h4 className="text-sm font-bold text-slate-900">Physical Print Sign-off</h4>
          </div>
          <p className="text-xs text-slate-500 leading-snug">
            Mark card as physically inspected and printed to activate the badge in access security
            records.
          </p>

          {confirmed ? (
            <div className="p-2.5 rounded-xl bg-emerald-100/70 border border-emerald-300 text-xs font-bold text-emerald-900 flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
              <span>Physical Print Confirmed</span>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="md"
              isLoading={isConfirming}
              onClick={handleConfirm}
              className="w-full border-teal-300 text-teal-800 hover:bg-teal-50 font-bold"
            >
              <CheckCircle2 className="w-4 h-4 mr-2 text-teal-600" />
              <span>Confirm Printed & Activate</span>
            </Button>
          )}
        </div>
      </div>

      {/* 3. Secondary Flow Actions */}
      <div className="flex flex-wrap items-center justify-center gap-3 pt-4 border-t border-slate-200">
        <Button
          type="button"
          variant="secondary"
          size="md"
          onClick={onResetForAnother}
          className="bg-teal-50 text-[#134E4A] hover:bg-teal-100 font-bold border border-teal-200"
        >
          <PlusCircle className="w-4 h-4 mr-2 text-[#0F766E]" />
          <span>Create Another ID Card</span>
        </Button>

        <Link href="/people">
          <Button type="button" variant="outline" size="md">
            <User className="w-4 h-4 mr-2 text-slate-500" />
            <span>Worker Directory</span>
          </Button>
        </Link>

        <Link href="/cards">
          <Button type="button" variant="outline" size="md">
            <Layers className="w-4 h-4 mr-2 text-slate-500" />
            <span>Card Production Hub</span>
          </Button>
        </Link>
      </div>
    </div>
  );
};
