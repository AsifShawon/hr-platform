'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  X,
  Printer,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ArrowRight,
  RefreshCw,
  ExternalLink,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { Button, Badge } from '@hr/ui';
import { PrintOutputFormat, PrintJobSide } from '@hr/domain';
import { CardReadinessResultDTO } from '@hr/schemas';

interface BatchPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedEmploymentIds: string[];
  onSuccess?: () => void;
}

export function BatchPrintModal({
  isOpen,
  onClose,
  selectedEmploymentIds,
  onSuccess,
}: BatchPrintModalProps) {
  const router = useRouter();
  const [isLoadingPreflight, setIsLoadingPreflight] = useState(true);
  const [readyWorkers, setReadyWorkers] = useState<CardReadinessResultDTO[]>([]);
  const [blockedWorkers, setBlockedWorkers] = useState<CardReadinessResultDTO[]>([]);
  const [outputFormat, setOutputFormat] = useState<PrintOutputFormat>(PrintOutputFormat.A4_SHEET);
  const [side, setSide] = useState<PrintJobSide>(PrintJobSide.DUPLEX);
  const [copies, setCopies] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchPreflight = async () => {
    setIsLoadingPreflight(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/cards/readiness/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employmentIds: selectedEmploymentIds }),
      });

      if (res.ok) {
        const data = await res.json();
        setReadyWorkers(data.ready || []);
        setBlockedWorkers(data.blocked || []);
      } else {
        const err = await res.json();
        setErrorMessage(err.message || 'Batch readiness evaluation failed.');
      }
    } catch {
      setErrorMessage('Network error running batch preflight check.');
    } finally {
      setIsLoadingPreflight(false);
    }
  };

  useEffect(() => {
    if (isOpen && selectedEmploymentIds.length > 0) {
      fetchPreflight();
    }
  }, [isOpen, selectedEmploymentIds]);

  if (!isOpen) return null;

  const handleEnqueueJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (readyWorkers.length === 0) {
      setErrorMessage('No workers meet preflight readiness requirements for printing.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const idempotencyKey = `BATCH-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    try {
      const res = await fetch('/api/cards/print-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employmentIds: readyWorkers.map((r) => r.workerSummary.employmentId),
          outputFormat,
          side,
          copiesPerCard: copies,
          idempotencyKey,
        }),
      });

      if (res.ok) {
        const job = await res.json();
        if (onSuccess) onSuccess();
        onClose();
        router.push(`/cards/queue?jobId=${job.id}`);
      } else {
        const err = await res.json();
        setErrorMessage(err.message || 'Failed to create print job.');
      }
    } catch {
      setErrorMessage('Network error enqueueing batch print job.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full p-6 animate-in fade-in zoom-in-95 space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-teal-50 text-[#0F766E] border border-teal-200">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Batch Print Preflight & Dispatch
              </h3>
              <p className="text-xs text-slate-500">
                {selectedEmploymentIds.length} worker(s) selected for card production
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Loading Preflight State */}
        {isLoadingPreflight ? (
          <div className="py-12 text-center text-xs text-slate-500 space-y-2">
            <RefreshCw className="w-5 h-5 text-[#0F766E] animate-spin mx-auto" />
            <p className="font-semibold text-slate-700">
              Running preflight readiness diagnostics...
            </p>
            <p className="text-slate-400">
              Verifying photos, active status, and bilingual template bindings.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Diagnostic Segregation: Ready vs Blocked */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Ready Section */}
              <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Ready for Printing ({readyWorkers.length})</span>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                    {Math.round((readyWorkers.length / selectedEmploymentIds.length) * 100)}%
                  </span>
                </div>

                <div className="max-h-36 overflow-y-auto space-y-1.5 text-xs text-slate-700 pr-1">
                  {readyWorkers.length === 0 ? (
                    <p className="text-[11px] text-slate-400 italic">
                      No selected workers meet print requirements.
                    </p>
                  ) : (
                    readyWorkers.map((r) => (
                      <div
                        key={r.workerSummary.employmentId}
                        className="p-2 rounded-lg bg-white border border-emerald-100 flex items-center justify-between"
                      >
                        <div className="truncate">
                          <span className="font-bold text-slate-900 block">
                            {r.workerSummary.displayName}
                          </span>
                          <span className="font-mono text-[10px] text-slate-500">
                            {r.workerSummary.employeeNumber}
                          </span>
                        </div>
                        <span className="text-[10px] font-semibold text-emerald-700 shrink-0">
                          {r.resolvedTemplate?.templateName || 'Standard'}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Blocked / Needs Attention Section */}
              <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Needs Attention ({blockedWorkers.length})</span>
                  </div>
                  <span className="text-[11px] text-amber-700">Excluded from batch</span>
                </div>

                <div className="max-h-36 overflow-y-auto space-y-1.5 text-xs text-slate-700 pr-1">
                  {blockedWorkers.length === 0 ? (
                    <p className="text-[11px] text-emerald-700 italic">
                      All selected workers are 100% ready!
                    </p>
                  ) : (
                    blockedWorkers.map((b) => (
                      <div
                        key={b.workerSummary.employmentId}
                        className="p-2 rounded-lg bg-white border border-amber-200 flex items-center justify-between gap-2"
                      >
                        <div className="truncate">
                          <span className="font-bold text-slate-900 block">
                            {b.workerSummary.displayName}
                          </span>
                          <span className="text-[10px] text-amber-800 font-medium truncate block">
                            {b.blockers[0]?.message || 'Missing required card bindings'}
                          </span>
                        </div>
                        <Link
                          href={`/people/${b.workerSummary.personId}`}
                          target="_blank"
                          className="shrink-0 text-[10px] font-bold text-[#0F766E] hover:underline flex items-center gap-0.5"
                        >
                          <span>Fix</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </Link>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Print Output Settings Form */}
            <form onSubmit={handleEnqueueJob} className="space-y-4 pt-2 border-t border-slate-100">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="batch-output-format"
                    className="block text-xs font-bold text-slate-700 mb-1"
                  >
                    Output Format *
                  </label>
                  <select
                    id="batch-output-format"
                    aria-label="Output Format"
                    value={outputFormat}
                    onChange={(e) => setOutputFormat(e.target.value as PrintOutputFormat)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                  >
                    <option value={PrintOutputFormat.A4_SHEET}>
                      A4 Sheet Imposition (6 Cards / Sheet)
                    </option>
                    <option value={PrintOutputFormat.LETTER_SHEET}>
                      US Letter Sheet (6 Cards / Sheet)
                    </option>
                    <option value={PrintOutputFormat.INDIVIDUAL_PDF}>
                      Single 60×90mm Master PDF (Multi-page)
                    </option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="batch-print-sides"
                    className="block text-xs font-bold text-slate-700 mb-1"
                  >
                    Print Sides *
                  </label>
                  <select
                    id="batch-print-sides"
                    aria-label="Print Sides"
                    value={side}
                    onChange={(e) => setSide(e.target.value as PrintJobSide)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0F766E]"
                  >
                    <option value={PrintJobSide.DUPLEX}>
                      Duplex (Front & Back Mirrored Alignment)
                    </option>
                    <option value={PrintJobSide.FRONT}>Front Only (English)</option>
                    <option value={PrintJobSide.BACK}>Back Only (Bangla)</option>
                  </select>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-teal-50/60 border border-teal-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-slate-700">
                  <Sparkles className="w-4 h-4 text-[#0F766E]" />
                  <span>
                    Ready to enqueue <strong>{readyWorkers.length}</strong> badge(s).
                  </span>
                </div>
                <span className="font-mono text-[11px] text-[#0F766E] font-semibold">
                  Exact 60×90mm Master
                </span>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={onClose}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  isLoading={isSubmitting}
                  disabled={readyWorkers.length === 0}
                  className="bg-[#134E4A] hover:bg-[#0F766E] text-white font-bold"
                >
                  <Printer className="w-4 h-4 mr-1.5" />
                  <span>Enqueue Batch Job ({readyWorkers.length} Badges)</span>
                </Button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
